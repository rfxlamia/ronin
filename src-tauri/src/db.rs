use r2d2_sqlite::SqliteConnectionManager;
#[cfg(test)]
use rusqlite::params;
use rusqlite::OptionalExtension;
use rusqlite_migration::{Migrations, M};
use std::ops::DerefMut;
use std::path::{Path, PathBuf};
use std::time::Duration;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

/// Initialize the database with migrations and connection pool
pub fn init_db() -> Result<DbPool, String> {
    let db_path = get_db_path()?;
    ensure_parent_dir_exists(&db_path)?;

    // Create connection manager with pragmas applied to ALL connections
    let manager = SqliteConnectionManager::file(&db_path).with_init(|conn| {
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;",
        )
    });

    // Build connection pool with timeout configuration
    let pool = r2d2::Pool::builder()
        .max_size(10)
        .connection_timeout(Duration::from_secs(5))
        .build(manager)
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    // Get a connection to run migrations and integrity check
    let mut conn = pool
        .get()
        .map_err(|e| format!("Failed to get connection from pool: {}", e))?;

    run_migrations(&mut conn)?;
    verify_integrity(&conn)?;
    evict_old_cache(&conn)?;
    migrate_to_multi_provider(&conn)?;

    Ok(pool)
}

/// Get the database file path
/// TODO: Accept AppHandle and use Tauri's app_data_dir() for proper cross-platform support
fn get_db_path() -> Result<PathBuf, String> {
    let home =
        std::env::var("HOME").map_err(|_| "Could not determine HOME directory".to_string())?;

    let db_dir = PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("ronin");

    Ok(db_dir.join("ronin.db"))
}

/// Ensure the parent directory of the database file exists
fn ensure_parent_dir_exists(db_path: &Path) -> Result<(), String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create database directory: {}", e))?;
    }
    Ok(())
}

/// Run database migrations
pub(crate) fn run_migrations(
    conn: &mut r2d2::PooledConnection<SqliteConnectionManager>,
) -> Result<(), String> {
    let migrations = Migrations::new(vec![M::up(
        "CREATE TABLE projects (
            id INTEGER PRIMARY KEY,
            path TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        
        CREATE TRIGGER update_projects_modtime
        AFTER UPDATE ON projects
        FOR EACH ROW
        BEGIN
            UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;",
    )]);

    migrations
        .to_latest(conn.deref_mut())
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    // Post-migration schema updates (for columns added after initial migration)
    // Check if is_archived column exists
    let is_archived_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('projects') WHERE name='is_archived'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check is_archived column: {}", e))?;

    if is_archived_exists == 0 {
        conn.execute(
            "ALTER TABLE projects ADD COLUMN is_archived BOOLEAN DEFAULT 0",
            [],
        )
        .map_err(|e| format!("Failed to add is_archived column: {}", e))?;
    }

    // Check if deleted_at column exists
    let deleted_at_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('projects') WHERE name='deleted_at'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check deleted_at column: {}", e))?;

    if deleted_at_exists == 0 {
        conn.execute("ALTER TABLE projects ADD COLUMN deleted_at DATETIME", [])
            .map_err(|e| format!("Failed to add deleted_at column: {}", e))?;
    }

    // Check if ai_cache table exists
    let ai_cache_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='ai_cache'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check ai_cache table: {}", e))?;

    if ai_cache_exists == 0 {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_cache (
                project_id INTEGER PRIMARY KEY,
                context_text TEXT NOT NULL,
                attribution_json TEXT NOT NULL,
                generated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )
        .map_err(|e| format!("Failed to create ai_cache table: {}", e))?;
    }

    // Check if observer_events table exists (Story 6.1)
    let observer_events_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='observer_events'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check observer_events table: {}", e))?;

    if observer_events_exists == 0 {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS observer_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                window_title TEXT,
                process_name TEXT,
                project_id INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create observer_events table: {}", e))?;

        // Add indexes for better query performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_observer_events_timestamp ON observer_events(timestamp)",
            [],
        )
        .map_err(|e| format!("Failed to create timestamp index: {}", e))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_observer_events_project_id ON observer_events(project_id)",
            [],
        )
        .map_err(|e| format!("Failed to create project_id index: {}", e))?;

        // Create view for duration calculation (Story 6.1 - Option 1)
        // This view uses LEAD window function to calculate how long user stayed in each window
        conn.execute(
            "CREATE VIEW IF NOT EXISTS observer_events_with_duration AS
             SELECT 
                 id,
                 timestamp,
                 event_type,
                 window_title,
                 process_name,
                 project_id,
                 (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp) AS duration_ms,
                 (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp) / 1000 AS duration_seconds,
                 CASE 
                     WHEN LEAD(timestamp) OVER (ORDER BY timestamp) IS NULL THEN 1
                     ELSE 0
                 END AS is_current_window
             FROM observer_events
             ORDER BY timestamp DESC",
            [],
        )
        .map_err(|e| format!("Failed to create observer duration view: {}", e))?;
    }

    Ok(())
}

/// Evict cached AI contexts older than 7 days
fn evict_old_cache(conn: &r2d2::PooledConnection<SqliteConnectionManager>) -> Result<(), String> {
    let seven_days_ago = chrono::Utc::now().timestamp() - (7 * 24 * 60 * 60);

    conn.execute(
        "DELETE FROM ai_cache WHERE generated_at < ?1",
        rusqlite::params![seven_days_ago],
    )
    .map_err(|e| format!("Cache eviction failed: {}", e))?;

    Ok(())
}

/// Verify database integrity on startup
fn verify_integrity(conn: &r2d2::PooledConnection<SqliteConnectionManager>) -> Result<(), String> {
    let result: String = conn
        .query_row("PRAGMA integrity_check;", [], |row| row.get(0))
        .map_err(|e| format!("Integrity check query failed: {}", e))?;

    if result != "ok" {
        return Err(format!("Database integrity check failed: {}", result));
    }
    Ok(())
}

/// Migrate to multi-provider API key storage
///
/// Migration: Existing 'openrouter_api_key_encrypted' becomes 'api_key_openrouter'
/// Migration: Add 'ai_provider_default' = 'openrouter'
fn migrate_to_multi_provider(
    conn: &r2d2::PooledConnection<SqliteConnectionManager>,
) -> Result<(), String> {
    // Check if old OpenRouter key exists (from Story 3.6)
    let old_key: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'openrouter_api_key_encrypted'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Migration check failed: {}", e))?;

    if let Some(key_value) = old_key {
        // Rename to 'api_key_openrouter' (new multi-provider format)
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1",
            rusqlite::params![&key_value],
        )
        .map_err(|e| format!("Migration insert failed: {}", e))?;

        // Set default provider to OpenRouter
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('ai_provider_default', 'openrouter') ON CONFLICT(key) DO NOTHING",
            [],
        )
        .map_err(|e| format!("Migration default provider failed: {}", e))?;

        // Delete old key
        conn.execute(
            "DELETE FROM settings WHERE key = 'openrouter_api_key_encrypted'",
            [],
        )
        .map_err(|e| format!("Migration delete failed: {}", e))?;

        // Migration completed successfully
    } else {
        // Fresh install or already migrated
        // Set default provider if not set
        let has_default: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key = 'ai_provider_default'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if has_default == 0 {
            conn.execute(
                "INSERT INTO settings (key, value) VALUES ('ai_provider_default', 'openrouter')",
                [],
            )
            .map_err(|e| format!("Failed to set default provider: {}", e))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::thread;
    use std::time::Duration;

    /// Helper to create a temporary database for testing
    fn create_test_db() -> (PathBuf, DbPool) {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        fs::create_dir_all(&test_dir).unwrap();
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
        run_migrations(&mut conn).unwrap();

        (test_dir, pool)
    }

    #[test]
    fn test_database_initialization() {
        let (test_dir, pool) = create_test_db();
        let db_path = test_dir.join("test.db");
        assert!(db_path.exists(), "Database file should exist");

        let conn = pool.get();
        assert!(conn.is_ok(), "Should be able to get connection from pool");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_wal_mode_enabled() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
            .unwrap();

        assert_eq!(
            journal_mode.to_lowercase(),
            "wal",
            "WAL mode should be enabled"
        );
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        let foreign_keys: i32 = conn
            .query_row("PRAGMA foreign_keys;", [], |row| row.get(0))
            .unwrap();

        assert_eq!(foreign_keys, 1, "Foreign keys should be enabled");
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_foreign_keys_on_all_connections() {
        let (test_dir, pool) = create_test_db();

        // Get multiple different connections and verify foreign keys on each
        for i in 0..3 {
            let conn = pool.get().unwrap();
            let foreign_keys: i32 = conn
                .query_row("PRAGMA foreign_keys;", [], |row| row.get(0))
                .unwrap();
            assert_eq!(
                foreign_keys, 1,
                "Foreign keys should be ON for connection {}",
                i
            );
        }

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_schema_tables_created() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        let projects_exists: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(projects_exists, 1, "Projects table should exist");

        let settings_exists: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(settings_exists, 1, "Settings table should exist");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_auto_update_trigger() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        conn.execute(
            "INSERT INTO projects (path, name, type) VALUES (?1, ?2, ?3)",
            params!["/test/path", "Test Project", "git"],
        )
        .unwrap();

        let initial_updated_at: String = conn
            .query_row(
                "SELECT updated_at FROM projects WHERE path = ?1",
                params!["/test/path"],
                |row| row.get(0),
            )
            .unwrap();

        thread::sleep(Duration::from_secs(1));

        conn.execute(
            "UPDATE projects SET name = ?1 WHERE path = ?2",
            params!["Updated Project", "/test/path"],
        )
        .unwrap();

        let new_updated_at: String = conn
            .query_row(
                "SELECT updated_at FROM projects WHERE path = ?1",
                params!["/test/path"],
                |row| row.get(0),
            )
            .unwrap();

        assert_ne!(
            initial_updated_at, new_updated_at,
            "updated_at should change on update"
        );
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_connection_pool_max_size() {
        let (test_dir, pool) = create_test_db();
        assert_eq!(pool.max_size(), 10, "Pool max size should be 10");
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_multiple_connections() {
        let (test_dir, pool) = create_test_db();

        let conn1 = pool.get();
        let conn2 = pool.get();
        let conn3 = pool.get();

        assert!(conn1.is_ok(), "Should get first connection");
        assert!(conn2.is_ok(), "Should get second connection");
        assert!(conn3.is_ok(), "Should get third connection");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_directory_creation() {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_dir_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        let db_path = test_dir.join("subdir").join("test.db");

        if test_dir.exists() {
            fs::remove_dir_all(&test_dir).ok();
        }

        let result = ensure_parent_dir_exists(&db_path);

        assert!(
            result.is_ok(),
            "Should successfully create parent directory"
        );
        assert!(
            db_path.parent().unwrap().exists(),
            "Parent directory should exist"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_integrity_check() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        let result = verify_integrity(&conn);
        assert!(
            result.is_ok(),
            "Integrity check should pass on valid database"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_migration_idempotency() {
        // Story 4.25-1: Run migration 3x on same DB, verify no data duplication or corruption
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Simulate existing OpenRouter key (from Story 3.6)
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('openrouter_api_key_encrypted', 'test_encrypted_key')",
            [],
        )
        .unwrap();

        // Run migration 3 times
        for i in 1..=3 {
            migrate_to_multi_provider(&conn).expect(&format!("Migration {} should succeed", i));
        }

        // Verify no duplicate entries
        let key_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            key_count, 1,
            "Should have exactly 1 api_key_openrouter entry"
        );

        let default_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key = 'ai_provider_default'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            default_count, 1,
            "Should have exactly 1 ai_provider_default entry"
        );

        // Verify old key was deleted
        let old_key_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key = 'openrouter_api_key_encrypted'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            old_key_count, 0,
            "Old key should be deleted after migration"
        );

        // Verify data integrity
        let new_key: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            new_key, "test_encrypted_key",
            "Key value should be preserved"
        );

        let default_provider: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'ai_provider_default'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            default_provider, "openrouter",
            "Default provider should be openrouter"
        );

        fs::remove_dir_all(test_dir).ok();
    }
}
