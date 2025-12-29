/// Observer Settings Module
///
/// Handles persistence and management of Silent Observer privacy settings.
///
/// Story 6.5: Privacy Controls
use regex::Regex;
use serde::{Deserialize, Serialize};

/// Observer privacy settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObserverSettings {
    /// Whether Silent Observer is enabled
    pub enabled: bool,
    /// List of application names to exclude from tracking (e.g., "Brave", "signal-desktop")
    pub excluded_apps: Vec<String>,
    /// List of URL/domain regex patterns to exclude (e.g., ".*bank.*", ".*private.*")
    #[serde(skip)]
    pub excluded_urls: Vec<Regex>,
    /// Raw string patterns for serialization (excluded_urls compiled from these)
    pub excluded_url_patterns: Vec<String>,
}

impl Default for ObserverSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            excluded_apps: Vec::new(),
            excluded_urls: Vec::new(),
            excluded_url_patterns: Vec::new(),
        }
    }
}

/// Load Observer settings from database
pub fn load_observer_settings(db: &crate::db::DbPool) -> Result<ObserverSettings, String> {
    let conn = db
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    // Load enabled status
    let enabled: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'observer_enabled'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load observer_enabled: {}", e))?;

    let enabled = enabled == "true";

    // Load excluded apps
    let excluded_apps_json: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'observer_excluded_apps'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load observer_excluded_apps: {}", e))?;

    let excluded_apps: Vec<String> = serde_json::from_str(&excluded_apps_json)
        .map_err(|e| format!("Failed to parse excluded_apps JSON: {}", e))?;

    // Load excluded URL patterns
    let excluded_urls_json: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'observer_excluded_urls'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load observer_excluded_urls: {}", e))?;

    let excluded_url_patterns: Vec<String> = serde_json::from_str(&excluded_urls_json)
        .map_err(|e| format!("Failed to parse excluded_urls JSON: {}", e))?;

    // Compile regex patterns
    let mut excluded_urls = Vec::new();
    for pattern in &excluded_url_patterns {
        match Regex::new(pattern) {
            Ok(regex) => excluded_urls.push(regex),
            Err(e) => {
                // Log warning but don't fail - skip invalid patterns
                eprintln!(
                    "[observer] Warning: Invalid regex pattern '{}': {}",
                    pattern, e
                );
            }
        }
    }

    Ok(ObserverSettings {
        enabled,
        excluded_apps,
        excluded_urls,
        excluded_url_patterns,
    })
}

/// Save Observer settings to database
pub fn save_observer_settings(
    db: &crate::db::DbPool,
    settings: &ObserverSettings,
) -> Result<(), String> {
    let conn = db
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    // Save enabled status
    let enabled_value = if settings.enabled { "true" } else { "false" };
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('observer_enabled', ?1)",
        rusqlite::params![enabled_value],
    )
    .map_err(|e| format!("Failed to save observer_enabled: {}", e))?;

    // Save excluded apps as JSON array
    let excluded_apps_json = serde_json::to_string(&settings.excluded_apps)
        .map_err(|e| format!("Failed to serialize excluded_apps: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('observer_excluded_apps', ?1)",
        rusqlite::params![excluded_apps_json],
    )
    .map_err(|e| format!("Failed to save observer_excluded_apps: {}", e))?;

    // Save excluded URL patterns as JSON array
    let excluded_urls_json = serde_json::to_string(&settings.excluded_url_patterns)
        .map_err(|e| format!("Failed to serialize excluded_urls: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('observer_excluded_urls', ?1)",
        rusqlite::params![excluded_urls_json],
    )
    .map_err(|e| format!("Failed to save observer_excluded_urls: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use r2d2_sqlite::SqliteConnectionManager;
    use std::time::Duration;

    fn create_test_db() -> crate::db::DbPool {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_observer_settings_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        std::fs::create_dir_all(&test_dir).unwrap();
        let db_path = test_dir.join("test.db");

        let manager = SqliteConnectionManager::file(&db_path).with_init(|conn| {
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA foreign_keys=ON;",
            )
        });

        let pool = r2d2::Pool::builder()
            .max_size(10)
            .connection_timeout(Duration::from_secs(5))
            .build(manager)
            .unwrap();

        let mut conn = pool.get().unwrap();
        crate::db::run_migrations(&mut conn).unwrap();

        pool
    }

    #[test]
    fn test_settings_save_load_round_trip() {
        let pool = create_test_db();

        // Create test settings
        let original_settings = ObserverSettings {
            enabled: false,
            excluded_apps: vec!["Brave".to_string(), "signal-desktop".to_string()],
            excluded_urls: vec![
                Regex::new(".*bank.*").unwrap(),
                Regex::new(".*private.*").unwrap(),
            ],
            excluded_url_patterns: vec![".*bank.*".to_string(), ".*private.*".to_string()],
        };

        // Save settings
        save_observer_settings(&pool, &original_settings).expect("Save should succeed");

        // Load settings back
        let loaded_settings = load_observer_settings(&pool).expect("Load should succeed");

        // Verify values match
        assert_eq!(loaded_settings.enabled, original_settings.enabled);
        assert_eq!(
            loaded_settings.excluded_apps,
            original_settings.excluded_apps
        );
        assert_eq!(
            loaded_settings.excluded_url_patterns,
            original_settings.excluded_url_patterns
        );
        assert_eq!(
            loaded_settings.excluded_urls.len(),
            original_settings.excluded_urls.len()
        );
    }

    #[test]
    fn test_excluded_url_regex_matching() {
        let pool = create_test_db();

        let settings = ObserverSettings {
            enabled: true,
            excluded_apps: vec![],
            excluded_urls: vec![Regex::new(".*bank.*").unwrap()],
            excluded_url_patterns: vec![".*bank.*".to_string()],
        };

        save_observer_settings(&pool, &settings).unwrap();
        let loaded = load_observer_settings(&pool).unwrap();

        // Test regex matching
        let test_url = "https://www.bank.com/login";
        let matches = loaded.excluded_urls[0].is_match(test_url);
        assert!(matches, "Bank URL should match exclusion pattern");

        let non_matching_url = "https://www.github.com";
        let matches = loaded.excluded_urls[0].is_match(non_matching_url);
        assert!(!matches, "GitHub URL should not match bank pattern");
    }

    #[test]
    fn test_observer_disabled_blocks_all() {
        let pool = create_test_db();

        let settings = ObserverSettings {
            enabled: false,
            excluded_apps: vec![],
            excluded_urls: vec![],
            excluded_url_patterns: vec![],
        };

        save_observer_settings(&pool, &settings).unwrap();
        let loaded = load_observer_settings(&pool).unwrap();

        assert!(!loaded.enabled, "Observer should be disabled");
    }

    #[test]
    fn test_default_settings_on_fresh_db() {
        let pool = create_test_db();

        // Load settings from fresh DB (should have defaults from migration)
        let settings = load_observer_settings(&pool).expect("Should load default settings");

        assert!(settings.enabled, "Default should be enabled");
        assert_eq!(
            settings.excluded_apps.len(),
            0,
            "Default should have no excluded apps"
        );
        assert_eq!(
            settings.excluded_urls.len(),
            0,
            "Default should have no excluded URLs"
        );
    }

    #[test]
    fn test_invalid_regex_pattern_handling() {
        let pool = create_test_db();

        // Insert invalid regex pattern directly to DB
        let conn = pool.get().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('observer_excluded_urls', '[\"[unclosed\", \".*valid.*\"]')",
            [],
        )
        .unwrap();

        // Load should succeed but skip invalid pattern
        let settings = load_observer_settings(&pool).expect("Load should handle invalid regex");

        // Only the valid pattern should be compiled
        assert_eq!(
            settings.excluded_urls.len(),
            1,
            "Should only have 1 valid regex (invalid one skipped)"
        );
        assert_eq!(
            settings.excluded_url_patterns.len(),
            2,
            "Should preserve raw patterns"
        );
    }

    #[test]
    fn test_settings_update_idempotency() {
        let pool = create_test_db();

        let settings = ObserverSettings {
            enabled: true,
            excluded_apps: vec!["Test".to_string()],
            excluded_urls: vec![],
            excluded_url_patterns: vec![],
        };

        // Save multiple times
        for _ in 0..3 {
            save_observer_settings(&pool, &settings).expect("Save should be idempotent");
        }

        // Verify only one copy exists
        let conn = pool.get().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key = 'observer_enabled'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 1, "Should have exactly one observer_enabled setting");
    }
}
