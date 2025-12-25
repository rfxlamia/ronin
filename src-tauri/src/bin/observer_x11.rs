/// X11 Backend for Observer Daemon
///
/// Monitors X11 window focus events using x11rb-async and reports them
/// via Unix socket to the main Ronin application.
///
/// Story 6.1: Window Title Tracking (X11)
/// Story 6.2: Window Title Tracking (Wayland GNOME) - Extracted from monolithic daemon
use ronin_lib::observer::types::{WindowEvent, WindowEventData};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use tokio::net::UnixStream;
use tokio::time::sleep;
use x11rb_async::connection::Connection;
use x11rb_async::protocol::xproto::{Atom, AtomEnum, ConnectionExt, Window};
use x11rb_async::rust_connection::RustConnection;

struct X11Atoms {
    net_active_window: Atom,
    net_wm_name: Atom,
    wm_class: Atom,
    utf8_string: Atom,
}

async fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_millis() as i64
}

async fn get_string_property(
    conn: &RustConnection,
    window: Window,
    property: Atom,
    utf8_string: Atom,
) -> Option<String> {
    // Try UTF8_STRING first
    if let Ok(reply) = conn
        .get_property(false, window, property, utf8_string, 0, 1024)
        .await
    {
        if let Ok(reply) = reply.reply().await {
            if !reply.value.is_empty() {
                if let Ok(s) = String::from_utf8(reply.value) {
                    return Some(s);
                }
            }
        }
    }

    // Fallback to STRING type
    if let Ok(reply) = conn
        .get_property(false, window, property, AtomEnum::STRING, 0, 1024)
        .await
    {
        if let Ok(reply) = reply.reply().await {
            if !reply.value.is_empty() {
                if let Ok(s) = String::from_utf8(reply.value) {
                    return Some(s);
                }
            }
        }
    }

    None
}

async fn get_active_window_info(
    conn: &RustConnection,
    root: Window,
    atoms: &X11Atoms,
) -> Option<(String, String)> {
    // Get active window
    let active_window = conn
        .get_property(false, root, atoms.net_active_window, AtomEnum::WINDOW, 0, 1)
        .await
        .ok()?
        .reply()
        .await
        .ok()?;

    if active_window.value.len() < 4 {
        return None;
    }

    let window_id = u32::from_ne_bytes([
        active_window.value[0],
        active_window.value[1],
        active_window.value[2],
        active_window.value[3],
    ]);

    // Get window title
    let title = get_string_property(conn, window_id, atoms.net_wm_name, atoms.utf8_string)
        .await
        .unwrap_or_else(|| "Unknown".to_string());

    // Get WM_CLASS (application name)
    // WM_CLASS returns two null-separated strings: instance\0class
    // We want the class name (second part) for consistency
    let app_class = get_string_property(conn, window_id, atoms.wm_class, atoms.utf8_string)
        .await
        .and_then(|s| {
            // WM_CLASS format: "instance\0ClassName"
            // Split by null byte and take the second part (class name)
            let parts: Vec<&str> = s.split('\0').collect();
            if parts.len() >= 2 {
                Some(parts[1].to_string())
            } else {
                // Fallback to first part if no null byte found
                parts.first().map(|s| s.to_string())
            }
        })
        .unwrap_or_else(|| "Unknown".to_string());

    Some((title, app_class))
}

/// Run the X11 observer backend
pub async fn run_x11_observer() -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("[observer] Starting X11 window observer daemon");

    // Connect to X11
    // RustConnection::connect returns (conn, screen_num, event_loop_future)
    let (conn, screen_num, event_loop) = match RustConnection::connect(None).await {
        Ok(result) => result,
        Err(e) => {
            eprintln!("[observer] Failed to connect to X11: {}", e);
            return Err(Box::new(e));
        }
    };
    let setup = conn.setup();
    let screen = &setup.roots[screen_num];
    let root = screen.root;

    eprintln!("[observer] Connected to X11 display");

    // CRITICAL: Spawn event loop in background so async requests can complete
    tokio::spawn(async move {
        // event_loop returns Result<Infallible, Error> - Infallible can never be constructed
        // so we just need to handle the error case
        let result = event_loop.await;
        eprintln!("[observer] X11 event loop ended: {:?}", result.err());
    });

    eprintln!("[observer] Event loop spawned");

    // Intern atoms we need
    let net_active_window = conn.intern_atom(false, b"_NET_ACTIVE_WINDOW").await?;
    let net_wm_name = conn.intern_atom(false, b"_NET_WM_NAME").await?;
    let wm_class = conn.intern_atom(false, b"WM_CLASS").await?;
    let utf8_string = conn.intern_atom(false, b"UTF8_STRING").await?;

    let atoms = X11Atoms {
        net_active_window: net_active_window.reply().await?.atom,
        net_wm_name: net_wm_name.reply().await?.atom,
        wm_class: wm_class.reply().await?.atom,
        utf8_string: utf8_string.reply().await?.atom,
    };

    eprintln!("[observer] Atoms initialized");

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

    let mut socket = socket.ok_or("Failed to connect to Unix socket after 5 attempts")?;

    // Debouncing state
    let mut last_event_time = std::time::Instant::now();
    let mut last_window_info: Option<(String, String)> = None;
    // 1.5 seconds debounce to filter out Alt+Tab rapid switching noise
    let debounce_duration = Duration::from_millis(1500);

    eprintln!("[observer] Starting event loop");

    // Main event loop - poll for active window changes
    loop {
        // Check current active window
        if let Some((title, app_class)) = get_active_window_info(&conn, root, &atoms).await {
            let now = std::time::Instant::now();
            let window_info = (title.clone(), app_class.clone());

            // Debounce strategy: Only send an event if:
            // 1. The window has actually changed from the last recorded window, AND
            // 2. At least 500ms has passed since the last event was sent.
            // This prevents flooding the main app during rapid window switching
            // while still capturing all distinct window focus changes.
            if last_window_info.as_ref() != Some(&window_info)
                && now.duration_since(last_event_time) >= debounce_duration
            {
                // Send event via Unix socket
                let event = WindowEvent {
                    event_type: "window_focus".to_string(),
                    data: WindowEventData {
                        title: title.clone(),
                        app_class: app_class.clone(),
                        timestamp: get_current_timestamp().await,
                    },
                };

                match serde_json::to_string(&event) {
                    Ok(json) => {
                        let message = format!("{}\n", json);
                        if let Err(e) = socket.write_all(message.as_bytes()).await {
                            eprintln!("[observer] Failed to write to socket: {}", e);
                            // Try to reconnect
                            match UnixStream::connect(socket_path).await {
                                Ok(new_socket) => {
                                    eprintln!("[observer] Reconnected to Unix socket");
                                    socket = new_socket;
                                }
                                Err(e) => {
                                    eprintln!("[observer] Failed to reconnect: {}", e);
                                    return Err(Box::new(e));
                                }
                            }
                        } else {
                            eprintln!(
                                "[observer] Sent event: {} - {}",
                                app_class.split('\0').next().unwrap_or(&app_class),
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

        // Poll every 200ms (faster than debounce to ensure we catch changes)
        sleep(Duration::from_millis(200)).await;
    }
}
