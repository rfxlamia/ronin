use serde::Serialize;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformInfo {
    /// Operating system: "linux", "macos", or "windows"
    pub os: String,
    /// Display session type: "x11", "wayland", or "unknown"
    /// On non-Linux platforms always returns "unknown".
    pub session_type: String,
}

/// Returns platform information for the frontend to conditionally render UI.
///
/// Used by the frontend to:
/// - Show/hide Observer UI (Linux only)
/// - Render correct window controls (native traffic lights on macOS, custom on Linux/Windows)
/// - Display platform-appropriate keyboard shortcut labels
/// - Show Wayland extension setup card (Linux + Wayland only)
#[command]
pub fn get_platform_info() -> PlatformInfo {
    let os = std::env::consts::OS.to_string();
    let session_type = if os == "linux" {
        match std::env::var("XDG_SESSION_TYPE") {
            Ok(val) => val.to_lowercase(),
            Err(_) => "unknown".to_string(),
        }
    } else {
        "unknown".to_string()
    };

    PlatformInfo { os, session_type }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform_info_returns_valid_os() {
        let info = get_platform_info();
        assert!(
            ["linux", "macos", "windows"].contains(&info.os.as_str()),
            "OS should be linux, macos, or windows, got: {}",
            info.os
        );
    }

    #[test]
    fn test_get_platform_info_includes_session_type() {
        let info = get_platform_info();
        // On non-Linux, always "unknown". On Linux, depends on env.
        // We only verify the field exists and is a valid value.
        assert!(
            ["x11", "wayland", "unknown"].contains(&info.session_type.as_str()),
            "session_type should be x11, wayland, or unknown, got: {}",
            info.session_type
        );
    }

    #[test]
    fn test_session_type_unknown_on_non_linux() {
        // This test is meaningful when run on macOS/Windows CI.
        // On Linux it will still pass since "unknown" is a valid value.
        let info = get_platform_info();
        if info.os != "linux" {
            assert_eq!(info.session_type, "unknown");
        }
    }
}
