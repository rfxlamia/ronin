use r2d2_sqlite::SqliteConnectionManager;
#[cfg(test)]
use rusqlite::params;
use rusqlite_migration::{Migrations, M};
use std::ops::DerefMut;
use std::path::PathBuf;
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
fn ensure_parent_dir_exists(db_path: &PathBuf) -> Result<(), String> {
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
        conn.execute(
            "ALTER TABLE projects ADD COLUMN deleted_at DATETIME",
            [],
        )
        .map_err(|e| format!("Failed to add deleted_at column: {}", e))?;
    }

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
}
