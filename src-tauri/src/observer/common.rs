/// Common filtering logic for Observer daemon backends
///
/// Story 6.5: Privacy Controls - 義 (Gi) Righteous Code
/// Excluded events are NEVER logged (not even to stderr)
use crate::observer::types::SettingsUpdate;
use lazy_static::lazy_static;
use regex::Regex;
use std::sync::{Arc, Mutex};

lazy_static! {
    /// Cached compiled regex patterns for URL filtering
    /// Updated when settings change to avoid recompilation on every event
    static ref COMPILED_PATTERNS: Arc<Mutex<Vec<Regex>>> = Arc::new(Mutex::new(Vec::new()));
}

/// Update cached regex patterns from settings
pub fn update_cached_patterns(patterns: &[String]) {
    let mut cached = COMPILED_PATTERNS.lock().unwrap();
    cached.clear();

    for pattern in patterns {
        match Regex::new(pattern) {
            Ok(regex) => cached.push(regex),
            Err(e) => {
                eprintln!(
                    "[observer-filter] Warning: Invalid regex pattern '{}': {}",
                    pattern, e
                );
            }
        }
    }
}

/// Determine if an event should be tracked based on settings
///
/// Returns `true` if the event should be sent to the main app.  
/// Returns `false` if the event should be filtered out (義 - never logged).
///
/// Filtering rules (applied in order):
/// 1. If Observer is disabled, block all events
/// 2. If app_class matches excluded_apps (case-insensitive substring), block
/// 3. If window_title matches any excluded_url pattern (regex), block
/// 4. Otherwise, allow tracking
pub fn should_track(window_title: &str, app_class: &str, settings: &SettingsUpdate) -> bool {
    // Rule 1: Observer disabled blocks everything
    if !settings.enabled {
        return false;
    }

    // Rule 2: Check if application is excluded (case-insensitive substring match)
    let app_class_lower = app_class.to_lowercase();
    for excluded_app in &settings.excluded_apps {
        let excluded_app_lower = excluded_app.to_lowercase();
        if app_class_lower.contains(&excluded_app_lower) {
            return false;
        }
    }

    // Rule 3: Check if window title matches any excluded URL pattern
    let cached_patterns = COMPILED_PATTERNS.lock().unwrap();
    for regex in cached_patterns.iter() {
        if regex.is_match(window_title) {
            return false;
        }
    }

    // Passed all checks - allow tracking
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_track_when_disabled() {
        let settings = SettingsUpdate {
            enabled: false,
            excluded_apps: vec![],
            excluded_url_patterns: vec![],
        };

        assert_eq!(
            should_track("https://github.com", "Brave", &settings),
            false,
            "Disabled observer should block all events"
        );
    }

    #[test]
    fn test_should_track_excluded_app() {
        let settings = SettingsUpdate {
            enabled: true,
            excluded_apps: vec!["brave".to_string(), "signal".to_string()],
            excluded_url_patterns: vec![],
        };

        // Case-insensitive substring match
        assert_eq!(
            should_track("Test Title", "Brave", &settings),
            false,
            "Excluded app should be blocked"
        );

        assert_eq!(
            should_track("Test Title", "signal-desktop", &settings),
            false,
            "Excluded app with suffix should be blocked"
        );

        assert_eq!(
            should_track("Test Title", "Firefox", &settings),
            true,
            "Non-excluded app should be allowed"
        );
    }

    #[test]
    fn test_should_track_excluded_url() {
        // Use case-insensitive regex patterns for URL/title matching
        let settings = SettingsUpdate {
            enabled: true,
            excluded_apps: vec![],
            excluded_url_patterns: vec!["(?i).*bank.*".to_string(), "(?i).*private.*".to_string()],
        };

        // Update cached patterns
        update_cached_patterns(&settings.excluded_url_patterns);

        assert_eq!(
            should_track("https://www.bank.com/login", "Brave", &settings),
            false,
            "Bank URL should be blocked"
        );

        assert_eq!(
            should_track("Private Window - Browser", "Firefox", &settings),
            false,
            "Private window should be blocked (case-insensitive)"
        );

        assert_eq!(
            should_track("https://github.com", "Brave", &settings),
            true,
            "Non-excluded URL should be allowed"
        );
    }

    #[test]
    fn test_should_track_all_rules_pass() {
        let settings = SettingsUpdate {
            enabled: true,
            excluded_apps: vec!["signal".to_string()],
            excluded_url_patterns: vec![".*bank.*".to_string()],
        };

        update_cached_patterns(&settings.excluded_url_patterns);

        assert_eq!(
            should_track("https://github.com", "Firefox", &settings),
            true,
            "Event passing all checks should be allowed"
        );
    }
}
