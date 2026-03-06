use serde::Serialize;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformInfo {
    /// Operating system: "linux", "macos", or "windows"
    pub os: String,
}

/// Returns platform information for the frontend to conditionally render UI.
///
/// Used by the frontend to:
/// - Show/hide Observer UI (Linux only)
/// - Render correct window controls (native traffic lights on macOS, custom on Linux/Windows)
/// - Display platform-appropriate keyboard shortcut labels
#[command]
pub fn get_platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS.to_string(),
    }
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
}
