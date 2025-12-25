/// Shared types for Observer IPC
///
/// These types are used by both the observer daemon (bin/observer.rs)
/// and the main application (observer/mod.rs) to ensure consistency
/// across the Unix socket IPC boundary.
///
/// Story 6.2: Window Title Tracking (Wayland GNOME)
use serde::{Deserialize, Serialize};

/// Window focus event sent from daemon to main app
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: WindowEventData,
}

/// Window event payload data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowEventData {
    pub title: String,
    pub app_class: String,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_event_serialization() {
        let event = WindowEvent {
            event_type: "window_focus".to_string(),
            data: WindowEventData {
                title: "test window".to_string(),
                app_class: "firefox".to_string(),
                timestamp: 1234567890,
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"window_focus""#));
        assert!(json.contains(r#""title":"test window""#));
        assert!(json.contains(r#""app_class":"firefox""#));
        assert!(json.contains(r#""timestamp":1234567890"#));

        // Test deserialization
        let parsed: WindowEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.event_type, "window_focus");
        assert_eq!(parsed.data.title, "test window");
        assert_eq!(parsed.data.app_class, "firefox");
        assert_eq!(parsed.data.timestamp, 1234567890);
    }

    #[test]
    fn test_window_event_clone() {
        let event = WindowEvent {
            event_type: "window_focus".to_string(),
            data: WindowEventData {
                title: "test".to_string(),
                app_class: "app".to_string(),
                timestamp: 123,
            },
        };

        let cloned = event.clone();
        assert_eq!(cloned.event_type, event.event_type);
        assert_eq!(cloned.data.title, event.data.title);
    }
}
