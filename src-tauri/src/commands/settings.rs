/// Settings commands for key-value storage in SQLite
///
/// Provides get_setting and update_setting commands for persistent configuration
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
}
