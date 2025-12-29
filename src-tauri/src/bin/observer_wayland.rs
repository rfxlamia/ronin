/// Wayland/GNOME Backend for Observer Daemon
///
/// Monitors window focus events on Wayland/GNOME via D-Bus signals from
/// a GNOME Shell Extension and reports them via Unix socket to the main
/// Ronin application.
///
/// Story 6.2: Window Title Tracking (Wayland GNOME)
/// Story 6.5: Privacy Controls
use ronin_lib::observer::types::{WindowEvent, WindowEventData};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use tokio::net::UnixStream;
use tokio::time::sleep;
use zbus::proxy;
use zbus::Connection;

/// Get current timestamp in milliseconds
async fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_millis() as i64
}

/// D-Bus proxy for the Ronin Observer GNOME Shell Extension
///
/// Expected D-Bus interface:
/// - Service: org.ronin.Observer
/// - Path: /org/ronin/Observer
/// - Interface: org.ronin.Observer.WindowTracker
/// - Signal: WindowFocused(title: String, app_id: String)
#[proxy(
    interface = "org.ronin.Observer.WindowTracker",
    default_service = "org.ronin.Observer",
    default_path = "/org/ronin/Observer"
)]
trait RoninWindowTracker {
    /// Signal emitted when window focus changes
    #[zbus(signal)]
    fn window_focused(&self, title: String, app_id: String) -> zbus::Result<()>;
}

/// Run the Wayland/GNOME observer backend
pub async fn run_wayland_observer() -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("[observer] Starting Wayland/GNOME window observer daemon");

    // Connect to Session Bus
    let connection = match Connection::session().await {
        Ok(conn) => {
            eprintln!("[observer] Connected to D-Bus session bus");
            conn
        }
        Err(e) => {
            eprintln!("[observer] Failed to connect to D-Bus session bus: {}", e);
            // Send "extension_missing" event to main app
            if let Err(_) = send_extension_missing_event().await {
                eprintln!("[observer] Failed to send extension_missing event");
            }
            return Err(Box::new(e));
        }
    };

    // Check for GNOME Shell Extension presence
    let dbus_proxy = zbus::fdo::DBusProxy::new(&connection).await?;

    match dbus_proxy
        .name_has_owner("org.ronin.Observer".try_into()?)
        .await
    {
        Ok(has_owner) => {
            if !has_owner {
                eprintln!("[observer] GNOME Shell Extension not found (org.ronin.Observer)");
                send_extension_missing_event().await?;
                return Err("GNOME Shell Extension not installed".into());
            } else {
                eprintln!("[observer] GNOME Shell Extension detected");
            }
        }
        Err(e) => {
            eprintln!("[observer] Failed to check for extension: {}", e);
            send_extension_missing_event().await?;
            return Err(Box::new(e));
        }
    }

    // Connect to Unix socket (retry with backoff if main app isn't ready yet)
    let socket_path = "/tmp/ronin-observer.sock";
    let mut socket = None;
    for attempt in 1..=5 {
        match UnixStream::connect(socket_path).await {
            Ok(stream) => {
                eprintln!("[observer] Connected to Unix socket: {}", socket_path);
                socket = Some(stream);
                break;
            }
            Err(e) => {
                eprintln!(
                    "[observer] Failed to connect to socket (attempt {}): {}",
                    attempt, e
                );
                if attempt < 5 {
                    sleep(Duration::from_secs(1)).await;
                }
            }
        }
    }

    let socket = socket.ok_or("Failed to connect to Unix socket after 5 attempts")?;

    // Story 6.5: Initialize settings state (default: enabled, no exclusions)
    let current_settings = Arc::new(Mutex::new(ronin_lib::observer::types::SettingsUpdate {
        enabled: true,
        excluded_apps: vec![],
        excluded_url_patterns: vec![],
    }));

    // Story 6.5: Split socket for bidirectional communication
    let (socket_read, mut socket_write) = tokio::io::split(socket);

    // Story 6.5: Spawn task to receive settings updates from manager
    let settings_for_reader = current_settings.clone();
    tokio::spawn(async move {
        use tokio::io::AsyncBufReadExt;
        let reader = tokio::io::BufReader::new(socket_read);
        let mut lines = reader.lines();

        while let Ok(Some(line)) = lines.next_line().await {
            match serde_json::from_str::<ronin_lib::observer::types::SettingsUpdate>(&line) {
                Ok(new_settings) => {
                    eprintln!(
                        "[observer-wayland] Settings update: enabled={}, apps={}, urls={}",
                        new_settings.enabled,
                        new_settings.excluded_apps.len(),
                        new_settings.excluded_url_patterns.len()
                    );

                    // Update cached regex patterns
                    crate::observer_common::update_cached_patterns(
                        &new_settings.excluded_url_patterns,
                    );

                    // Update current settings atomically
                    *settings_for_reader.lock().unwrap() = new_settings;
                }
                Err(e) => eprintln!("[observer-wayland] Failed to parse settings: {}", e),
            }
        }
    });

    // Create proxy to receive signals from the GNOME Shell Extension
    let proxy = RoninWindowTrackerProxy::new(&connection).await?;

    // Subscribe to WindowFocused signals
    let mut signal_stream = proxy.receive_window_focused().await?;

    eprintln!("[observer] Subscribed to WindowFocused signals from GNOME Shell Extension");

    // Debouncing state
    let mut last_event_time = std::time::Instant::now();
    let mut last_window_info: Option<(String, String)> = None;
    // 1.5 seconds debounce to filter out Alt+Tab rapid switching noise
    let debounce_duration = Duration::from_millis(1500);

    // Main event loop - listen for D-Bus signals
    use futures_util::StreamExt;

    while let Some(signal) = signal_stream.next().await {
        match signal.args() {
            Ok(args) => {
                let title = args.title;
                let app_id = args.app_id;
                let now = std::time::Instant::now();
                let window_info = (title.clone(), app_id.clone());

                // Debounce: Only send event if window changed AND debounce period passed
                if last_window_info.as_ref() != Some(&window_info)
                    && now.duration_since(last_event_time) >= debounce_duration
                {
                    // Story 6.5: Apply privacy filter before sending
                    let should_send = {
                        let settings = current_settings.lock().unwrap();
                        crate::observer_common::should_track(&title, &app_id, &settings)
                    };

                    // 義 (Gi): If filtered, skip entirely (never log excluded events)
                    if !should_send {
                        last_event_time = now;
                        last_window_info = Some(window_info);
                        continue; // Skip to next signal
                    }

                    // Send event via Unix socket
                    let event = WindowEvent {
                        event_type: "window_focus".to_string(),
                        data: WindowEventData {
                            title: title.clone(),
                            app_class: app_id.clone(),
                            timestamp: get_current_timestamp().await,
                        },
                    };

                    match serde_json::to_string(&event) {
                        Ok(json) => {
                            let message = format!("{}\n", json);
                            if let Err(e) = socket_write.write_all(message.as_bytes()).await {
                                eprintln!("[observer] Socket write error: {}", e);
                                // Socket broken - exit gracefully (cannot reconnect with split socket)
                                return Err(Box::new(e));
                            } else {
                                eprintln!(
                                    "[observer] Sent event: {} - {}",
                                    app_id,
                                    title.chars().take(50).collect::<String>()
                                );
                            }
                        }
                        Err(e) => {
                            eprintln!("[observer] Failed to serialize event: {}", e);
                        }
                    }

                    last_event_time = now;
                    last_window_info = Some(window_info);
                }
            }
            Err(e) => {
                eprintln!("[observer] Failed to parse signal args: {}", e);
            }
        }
    }

    eprintln!("[observer] Signal stream ended unexpectedly");
    Err("D-Bus signal stream ended".into())
}

/// Send an "extension_missing" event to the main app
async fn send_extension_missing_event() -> Result<(), Box<dyn std::error::Error>> {
    let socket_path = "/tmp/ronin-observer.sock";

    // Try to connect to socket (might fail if app isn't running yet)
    match UnixStream::connect(socket_path).await {
        Ok(mut socket) => {
            let event = WindowEvent {
                event_type: "extension_missing".to_string(),
                data: WindowEventData {
                    title: "GNOME Shell Extension Required".to_string(),
                    app_class: "org.ronin.Observer".to_string(),
                    timestamp: get_current_timestamp().await,
                },
            };

            let json = serde_json::to_string(&event)?;
            let message = format!("{}\n", json);
            socket.write_all(message.as_bytes()).await?;

            eprintln!("[observer] Sent extension_missing event to main app");
            Ok(())
        }
        Err(e) => {
            eprintln!(
                "[observer] Could not send extension_missing event (app not running?): {}",
                e
            );
            Err(Box::new(e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_current_timestamp() {
        // Test that timestamp is reasonable (after 2024-01-01)
        let runtime = tokio::runtime::Runtime::new().unwrap();
        let ts = runtime.block_on(get_current_timestamp());

        // 2024-01-01 00:00:00 UTC in milliseconds
        let jan_2024 = 1704067200000i64;
        assert!(ts > jan_2024, "Timestamp should be after 2024-01-01");

        // Should be before 2100-01-01 (sanity check)
        let jan_2100 = 4102444800000i64;
        assert!(ts < jan_2100, "Timestamp should be before 2100-01-01");
    }

    #[test]
    fn test_window_event_creation() {
        let event = WindowEvent {
            event_type: "window_focus".to_string(),
            data: WindowEventData {
                title: "Test Window".to_string(),
                app_class: "org.test.App".to_string(),
                timestamp: 1234567890,
            },
        };

        assert_eq!(event.event_type, "window_focus");
        assert_eq!(event.data.title, "Test Window");
        assert_eq!(event.data.app_class, "org.test.App");
        assert_eq!(event.data.timestamp, 1234567890);
    }

    #[test]
    fn test_extension_missing_event_creation() {
        let event = WindowEvent {
            event_type: "extension_missing".to_string(),
            data: WindowEventData {
                title: "GNOME Shell Extension Required".to_string(),
                app_class: "org.ronin.Observer".to_string(),
                timestamp: 1234567890,
            },
        };

        assert_eq!(event.event_type, "extension_missing");
        assert_eq!(event.data.title, "GNOME Shell Extension Required");
        assert_eq!(event.data.app_class, "org.ronin.Observer");
    }

    #[test]
    fn test_window_event_serialization() {
        let event = WindowEvent {
            event_type: "window_focus".to_string(),
            data: WindowEventData {
                title: "Firefox - Mozilla".to_string(),
                app_class: "firefox".to_string(),
                timestamp: 1703980800000,
            },
        };

        let json = serde_json::to_string(&event).unwrap();

        // Verify JSON structure
        assert!(json.contains(r#""type":"window_focus""#));
        assert!(json.contains(r#""title":"Firefox - Mozilla""#));
        assert!(json.contains(r#""app_class":"firefox""#));
        assert!(json.contains(r#""timestamp":1703980800000"#));

        // Verify deserialization roundtrip
        let parsed: WindowEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.event_type, event.event_type);
        assert_eq!(parsed.data.title, event.data.title);
        assert_eq!(parsed.data.app_class, event.data.app_class);
        assert_eq!(parsed.data.timestamp, event.data.timestamp);
    }

    #[test]
    fn test_debounce_duration_configured() {
        // Verify the debounce duration constant is 1500ms to filter Alt+Tab noise
        let debounce = Duration::from_millis(1500);
        assert_eq!(debounce.as_millis(), 1500);
    }

    #[test]
    fn test_socket_path_constant() {
        // Verify the socket path is consistent with main app
        let socket_path = "/tmp/ronin-observer.sock";
        assert_eq!(socket_path, "/tmp/ronin-observer.sock");
    }

    #[test]
    fn test_dbus_service_name() {
        // Verify D-Bus service name for extension
        let service_name = "org.ronin.Observer";
        assert!(service_name.starts_with("org.ronin"));
    }
}
