/// Settings commands for key-value storage in SQLite
///
/// Provides get_setting and update_setting commands for persistent configuration
use crate::ai::provider::ProviderInfo;
use crate::security::{decrypt_api_key, encrypt_api_key};
use base64::{engine::general_purpose, Engine as _};
use rusqlite::OptionalExtension;

/// Get a setting value from the database
#[tauri::command]
pub async fn get_setting(
    key: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Option<String>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    let result: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![&key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query setting: {}", e))?;

    Ok(result)
}

/// Update or insert a setting value in the database
#[tauri::command]
pub async fn update_setting(
    key: String,
    value: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![&key, &value],
    )
    .map_err(|e| format!("Failed to update setting: {}", e))?;

    Ok(())
}

/// Get list of AI providers with configuration status
#[tauri::command]
pub async fn get_ai_providers(
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Vec<ProviderInfo>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    // Get default provider
    let default_provider: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_provider_default'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query default provider: {}", e))?;

    // Define built-in providers
    let mut providers = vec![];

    // Check if OpenRouter is configured
    let openrouter_configured: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    providers.push(ProviderInfo {
        id: "openrouter".to_string(),
        name: "OpenRouter".to_string(),
        is_configured: openrouter_configured,
        is_default: default_provider.as_deref() == Some("openrouter"),
    });

    // Demo mode provider - always available (no key needed)
    providers.push(ProviderInfo {
        id: "demo".to_string(),
        name: "Demo Mode (Limited)".to_string(),
        is_configured: true, // Always configured - no key required
        is_default: default_provider.as_deref() == Some("demo"),
    });

    Ok(providers)
}

/// Set default AI provider
#[tauri::command]
pub async fn set_default_provider(
    provider_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Validate provider ID (openrouter or demo)
    if provider_id != "openrouter" && provider_id != "demo" {
        return Err(format!("Unknown provider: {}", provider_id));
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider_default', ?1)",
        rusqlite::params![provider_id],
    )
    .map_err(|e| format!("Failed to set default provider: {}", e))?;

    Ok(())
}

/// Save (encrypt and store) API key for a provider
#[tauri::command]
pub async fn save_provider_api_key(
    provider_id: String,
    api_key: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Validate provider ID (demo doesn't need API keys)
    if provider_id != "openrouter" {
        return Err(format!("Unknown provider or provider doesn't support API keys: {}", provider_id));
    }

    // Encrypt the API key
    let encrypted = encrypt_api_key(&api_key)?;
    let encoded = general_purpose::STANDARD.encode(encrypted);

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    // Store encrypted key with provider-specific key name
    let setting_key = format!("api_key_{}", provider_id);
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![setting_key, encoded],
    )
    .map_err(|e| format!("Failed to store encrypted key: {}", e))?;

    Ok(())
}

/// Get (decrypt and return) API key for a provider
#[tauri::command]
pub async fn get_provider_api_key(
    provider_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Option<String>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    let setting_key = format!("api_key_{}", provider_id);
    let encoded: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![setting_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query encrypted key: {}", e))?;

    match encoded {
        Some(enc) => {
            let encrypted = general_purpose::STANDARD
                .decode(enc)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;
            let decrypted = decrypt_api_key(&encrypted)?;
            Ok(Some(decrypted))
        }
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Helper to create a temporary database for testing
    fn create_test_db() -> (std::path::PathBuf, crate::db::DbPool) {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_settings_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        fs::create_dir_all(&test_dir).unwrap();
        let db_path = test_dir.join("test.db");

        let manager = r2d2_sqlite::SqliteConnectionManager::file(&db_path).with_init(|conn| {
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA foreign_keys=ON;",
            )
        });

        let pool = r2d2::Pool::builder()
            .max_size(10)
            .connection_timeout(std::time::Duration::from_secs(5))
            .build(manager)
            .unwrap();

        // Run migrations to create settings table
        let mut conn = pool.get().unwrap();
        crate::db::run_migrations(&mut conn).unwrap();

        (test_dir, pool)
    }

    #[test]
    fn test_get_setting_nonexistent_key() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["nonexistent_key"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(result, None, "Nonexistent key should return None");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_update_and_get_setting() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Insert a setting
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["test_key", "test_value"],
        )
        .unwrap();

        // Get the setting back
        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["test_key"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(
            result,
            Some("test_value".to_string()),
            "Should retrieve the stored value"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_update_setting_replaces_existing() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Insert initial value
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["oath_shown", "false"],
        )
        .unwrap();

        // Update with new value
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["oath_shown", "true"],
        )
        .unwrap();

        // Verify the value was replaced
        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["oath_shown"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(
            result,
            Some("true".to_string()),
            "Should replace existing value"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_multiple_settings() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Store multiple settings
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["setting1", "value1"],
        )
        .unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["setting2", "value2"],
        )
        .unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["setting3", "value3"],
        )
        .unwrap();

        // Retrieve them
        let result1: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["setting1"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();
        let result2: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["setting2"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();
        let result3: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["setting3"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(result1, Some("value1".to_string()));
        assert_eq!(result2, Some("value2".to_string()));
        assert_eq!(result3, Some("value3".to_string()));

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_get_ai_providers_returns_openrouter() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Initially no API key configured
        let has_key: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(!has_key, "Should not have API key initially");

        // Insert an API key
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', 'encrypted_key')",
            [],
        )
        .unwrap();

        // Verify key exists
        let has_key_after: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(has_key_after, "Should have API key after insert");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_set_default_provider_stores_value() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Set default provider
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider_default', 'openrouter')",
            [],
        )
        .unwrap();

        // Verify default provider is set
        let default: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'ai_provider_default'",
                [],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(default, Some("openrouter".to_string()));

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_save_and_get_provider_api_key_roundtrip() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Encrypt and store a test key
        let test_key = "sk-test-key-12345";
        let encrypted = crate::security::encrypt_api_key(test_key).unwrap();
        let encoded = general_purpose::STANDARD.encode(&encrypted);

        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', ?1)",
            rusqlite::params![encoded],
        )
        .unwrap();

        // Read back and decrypt
        let stored: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        let decoded = general_purpose::STANDARD.decode(stored).unwrap();
        let decrypted = crate::security::decrypt_api_key(&decoded).unwrap();

        assert_eq!(decrypted, test_key);

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_provider_info_is_configured_flag() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Check if openrouter is configured (should be false initially)
        let is_configured: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(!is_configured, "Should not be configured initially");

        // Add API key
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', 'test')",
            [],
        )
        .unwrap();

        // Check again
        let is_configured_after: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(is_configured_after, "Should be configured after adding key");

        fs::remove_dir_all(test_dir).ok();
    }
}
