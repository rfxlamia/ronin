use r2d2_sqlite::SqliteConnectionManager;
#[cfg(test)]
use rusqlite::params;
use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};
use std::path::PathBuf;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

/// Initialize the database with migrations and connection pool
pub fn init_db() -> Result<DbPool, String> {
    // Get app data directory
    let db_path = get_db_path()?;

    // Ensure parent directory exists
    ensure_parent_dir_exists(&db_path)?;

    // Create connection manager
    let manager = SqliteConnectionManager::file(&db_path);

    // Build connection pool
    let pool = r2d2::Pool::builder()
        .max_size(10)
        .build(manager)
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    // Get a connection to run migrations and setup
    let mut conn = pool
        .get()
        .map_err(|e| format!("Failed to get connection from pool: {}", e))?;

    // Enable WAL mode and foreign keys
    setup_pragmas(&mut conn)?;

    // Run migrations
    run_migrations(&mut conn)?;

    Ok(pool)
}

/// Get the database file path
fn get_db_path() -> Result<PathBuf, String> {
    // For now, use a simple path resolution
    // In production, this would use Tauri's app_data_dir
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

/// Set up SQLite pragmas for WAL mode and foreign keys
fn setup_pragmas(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;",
    )
    .map_err(|e| format!("Failed to set up pragmas: {}", e))?;

    Ok(())
}

/// Run database migrations
fn run_migrations(conn: &mut Connection) -> Result<(), String> {
    let migrations = Migrations::new(vec![M::up(
        "CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TRIGGER IF NOT EXISTS update_projects_modtime
            AFTER UPDATE ON projects
            FOR EACH ROW
            BEGIN
                UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
            END;",
    )]);

    migrations
        .to_latest(conn)
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

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
            "ronin_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));

        fs::create_dir_all(&test_dir).unwrap();
        let db_path = test_dir.join("test.db");

        let manager = SqliteConnectionManager::file(&db_path);
        let pool = r2d2::Pool::builder().max_size(10).build(manager).unwrap();

        let mut conn = pool.get().unwrap();
        setup_pragmas(&mut conn).unwrap();
        run_migrations(&mut conn).unwrap();

        (test_dir, pool)
    }

    #[test]
    fn test_database_initialization() {
        let (test_dir, pool) = create_test_db();

        // Verify database file exists
        let db_path = test_dir.join("test.db");
        assert!(db_path.exists(), "Database file should exist");

        // Verify we can get a connection
        let conn = pool.get();
        assert!(conn.is_ok(), "Should be able to get connection from pool");

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_wal_mode_enabled() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Check WAL mode
        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
            .unwrap();

        assert_eq!(
            journal_mode.to_lowercase(),
            "wal",
            "WAL mode should be enabled"
        );

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Check foreign keys
        let foreign_keys: i32 = conn
            .query_row("PRAGMA foreign_keys;", [], |row| row.get(0))
            .unwrap();

        assert_eq!(foreign_keys, 1, "Foreign keys should be enabled");

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_schema_tables_created() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Check projects table exists
        let projects_exists: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects';",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(projects_exists, 1, "Projects table should exist");

        // Check settings table exists
        let settings_exists: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings';",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(settings_exists, 1, "Settings table should exist");

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_auto_update_trigger() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Insert a project
        conn.execute(
            "INSERT INTO projects (path, name, type) VALUES (?1, ?2, ?3)",
            params!["/test/path", "Test Project", "git"],
        )
        .unwrap();

        // Get initial updated_at timestamp
        let initial_updated_at: String = conn
            .query_row(
                "SELECT updated_at FROM projects WHERE path = ?1",
                params!["/test/path"],
                |row| row.get(0),
            )
            .unwrap();

        // Wait a bit to ensure timestamp difference (SQLite CURRENT_TIMESTAMP has 1-second resolution)
        thread::sleep(Duration::from_secs(1));

        // Update the project
        conn.execute(
            "UPDATE projects SET name = ?1 WHERE path = ?2",
            params!["Updated Project", "/test/path"],
        )
        .unwrap();

        // Get new updated_at timestamp
        let new_updated_at: String = conn
            .query_row(
                "SELECT updated_at FROM projects WHERE path = ?1",
                params!["/test/path"],
                |row| row.get(0),
            )
            .unwrap();

        // Verify updated_at changed
        assert_ne!(
            initial_updated_at, new_updated_at,
            "updated_at should change automatically on update"
        );

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_connection_pool_max_size() {
        let (test_dir, pool) = create_test_db();

        // Verify pool max size is 10
        assert_eq!(pool.max_size(), 10, "Pool max size should be 10");

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_multiple_connections() {
        let (test_dir, pool) = create_test_db();

        // Get multiple connections
        let conn1 = pool.get();
        let conn2 = pool.get();
        let conn3 = pool.get();

        assert!(conn1.is_ok(), "Should get first connection");
        assert!(conn2.is_ok(), "Should get second connection");
        assert!(conn3.is_ok(), "Should get third connection");

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_directory_creation() {
        // Create a unique test directory path that doesn't exist
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_dir_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));

        let db_path = test_dir.join("subdir").join("test.db");

        // Ensure the directory doesn't exist
        if test_dir.exists() {
            fs::remove_dir_all(&test_dir).ok();
        }

        // Attempt to create parent directory
        let result = ensure_parent_dir_exists(&db_path);

        assert!(
            result.is_ok(),
            "Should successfully create parent directory"
        );
        assert!(
            db_path.parent().unwrap().exists(),
            "Parent directory should exist"
        );

        // Cleanup
        fs::remove_dir_all(test_dir).ok();
    }
}
