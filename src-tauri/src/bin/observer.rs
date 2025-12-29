/// Observer Daemon - Multi-Backend Window Focus Tracker
///
/// This is a separate binary that runs as a daemon process to monitor
/// window focus events and communicate them to the main Ronin application
/// via Unix socket IPC.
///
/// Supports multiple backends:
/// - X11 (via x11rb-async)
/// - Wayland/GNOME (via D-Bus and Shell Extension)
///
/// Story 6.1: Window Title Tracking (X11)
/// Story 6.2: Window Title Tracking (Wayland GNOME) - Multi-backend support
/// Story 6.5: Privacy Controls - Filtering logic
// Import shared types from library

// Backend modules
#[cfg(target_os = "linux")]
mod observer_wayland;
#[cfg(target_os = "linux")]
mod observer_x11;

/// Detected backend type
#[cfg(target_os = "linux")]
#[derive(Debug, PartialEq)]
enum Backend {
    X11,
    WaylandGnome,
    Unsupported(String),
}

/// Detect which backend to use based on environment variables
#[cfg(target_os = "linux")]
fn detect_backend() -> Backend {
    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
    let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default();

    eprintln!("[observer] Environment detection:");
    eprintln!("[observer]   XDG_SESSION_TYPE = {}", session_type);
    eprintln!("[observer]   XDG_CURRENT_DESKTOP = {}", desktop);

    match session_type.as_str() {
        "x11" => {
            eprintln!("[observer] Detected: X11");
            Backend::X11
        }
        "wayland"
            if desktop.to_lowercase().contains("gnome")
                || desktop.to_lowercase().contains("unity") =>
        {
            eprintln!("[observer] Detected: Wayland + GNOME/Unity");
            Backend::WaylandGnome
        }
        _ => {
            eprintln!(
                "[observer] Unsupported environment: {}/{}",
                session_type, desktop
            );
            Backend::Unsupported(format!("{}/{}", session_type, desktop))
        }
    }
}

/// Main daemon entry point with backend selection
#[cfg(target_os = "linux")]
async fn run_daemon() -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("[observer] Starting Ronin Observer Daemon");

    let backend = detect_backend();

    match backend {
        Backend::X11 => {
            eprintln!("[observer] Using X11 backend");
            observer_x11::run_x11_observer().await
        }
        Backend::WaylandGnome => {
            eprintln!("[observer] Using Wayland/GNOME backend");
            observer_wayland::run_wayland_observer().await
        }
        Backend::Unsupported(env) => {
            eprintln!("[observer] ERROR: Unsupported environment: {}", env);
            eprintln!("[observer] Supported environments:");
            eprintln!("[observer]   - X11 (XDG_SESSION_TYPE=x11)");
            eprintln!("[observer]   - Wayland + GNOME (XDG_SESSION_TYPE=wayland + XDG_CURRENT_DESKTOP contains GNOME)");
            Err(format!("Unsupported environment: {}", env).into())
        }
    }
}

#[cfg(not(target_os = "linux"))]
async fn run_daemon() -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("[observer] Observer daemon is only supported on Linux");
    Err("Platform not supported".into())
}

#[tokio::main]
async fn main() {
    if let Err(e) = run_daemon().await {
        eprintln!("[observer] Fatal error: {}", e);
        std::process::exit(1);
    }
}

#[cfg(test)]
#[cfg(target_os = "linux")]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_detect_backend_x11() {
        env::set_var("XDG_SESSION_TYPE", "x11");
        env::set_var("XDG_CURRENT_DESKTOP", "ubuntu:GNOME");

        let backend = detect_backend();
        assert_eq!(backend, Backend::X11);
    }

    #[test]
    fn test_detect_backend_wayland_gnome() {
        env::set_var("XDG_SESSION_TYPE", "wayland");
        env::set_var("XDG_CURRENT_DESKTOP", "GNOME");

        let backend = detect_backend();
        assert_eq!(backend, Backend::WaylandGnome);
    }

    #[test]
    fn test_detect_backend_wayland_gnome_mixed_case() {
        env::remove_var("XDG_SESSION_TYPE");
        env::set_var("XDG_SESSION_TYPE", "wayland");
        env::set_var("XDG_CURRENT_DESKTOP", "ubuntu:gnome");

        let backend = detect_backend();
        assert_eq!(backend, Backend::WaylandGnome);
    }

    #[test]
    fn test_detect_backend_wayland_kde() {
        env::set_var("XDG_SESSION_TYPE", "wayland");
        env::set_var("XDG_CURRENT_DESKTOP", "KDE");

        let backend = detect_backend();
        match backend {
            Backend::Unsupported(s) if s.contains("wayland") && s.contains("KDE") => (),
            _ => panic!("Expected Unsupported backend for Wayland+KDE"),
        }
    }

    #[test]
    fn test_detect_backend_unknown() {
        env::set_var("XDG_SESSION_TYPE", "unknown");
        env::set_var("XDG_CURRENT_DESKTOP", "unknown");

        let backend = detect_backend();
        match backend {
            Backend::Unsupported(_) => (),
            _ => panic!("Expected Unsupported backend for unknown environment"),
        }
    }
}
