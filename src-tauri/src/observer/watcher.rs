use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, Mutex};

/// Buffer threshold for force flush (AC #4)
const FORCE_FLUSH_THRESHOLD: usize = 1000;

/// File event information for batch writing to database
#[derive(Debug, Clone)]
struct FileEvent {
    project_id: i64,
    file_path: String, // Relative path from project root
    timestamp: i64,
}

/// Manages file watchers for all tracked projects
pub struct WatcherManager {
    watchers: HashMap<i64, Debouncer<RecommendedWatcher>>,
    event_buffer: Arc<Mutex<Vec<FileEvent>>>,
    db_pool: crate::db::DbPool,
    flush_task_started: Arc<Mutex<bool>>,
    /// Channel to signal force flush when buffer exceeds threshold
    force_flush_tx: Option<mpsc::Sender<()>>,
}

impl WatcherManager {
    /// Create a new watcher manager
    pub fn new(db_pool: crate::db::DbPool) -> Self {
        Self {
            watchers: HashMap::new(),
            event_buffer: Arc::new(Mutex::new(Vec::new())),
            db_pool,
            flush_task_started: Arc::new(Mutex::new(false)),
            force_flush_tx: None,
        }
    }

    /// Start watching a project directory
    pub fn start_watching(&mut self, project_id: i64, path: PathBuf) -> Result<(), String> {
        // Don't start if already watching
        if self.watchers.contains_key(&project_id) {
            return Ok(());
        }

        eprintln!(
            "[file-watcher] Starting watch for project {} at {:?}",
            project_id, path
        );

        let project_root = path.clone();
        let buffer = self.event_buffer.clone();
        let force_flush_tx = self.force_flush_tx.clone();

        // Capture the tokio runtime handle to spawn from non-tokio thread
        // The debouncer callback runs on a separate non-tokio thread, so we need
        // to use handle.spawn() instead of tokio::spawn()
        let runtime_handle = tokio::runtime::Handle::try_current()
            .map_err(|_| "File watcher must be started from within a Tokio runtime".to_string())?;

        // Create debouncer with 100ms tick
        let mut debouncer = new_debouncer(
            Duration::from_millis(100),
            move |result: Result<Vec<DebouncedEvent>, _>| {
                if let Ok(events) = result {
                    let buffer_clone = buffer.clone();
                    let root_clone = project_root.clone();
                    let flush_tx = force_flush_tx.clone();

                    // Use the captured handle to spawn on the tokio runtime
                    runtime_handle.spawn(async move {
                        Self::handle_events(events, project_id, root_clone, buffer_clone, flush_tx)
                            .await;
                    });
                }
            },
        )
        .map_err(|e| {
            let err_msg = format!(
                "Failed to create file watcher for project {}: {}",
                project_id, e
            );

            // Check if it's an inotify limit error
            if err_msg.contains("inotify") || err_msg.contains("watch limit") {
                eprintln!(
                    "[file-watcher] WARNING: {} - System watch limit may be reached. \
                    Consider increasing fs.inotify.max_user_watches",
                    err_msg
                );
            } else {
                eprintln!("[file-watcher] ERROR: {}", err_msg);
            }

            err_msg
        })?;

        // Start watching recursively
        debouncer
            .watcher()
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| {
                let err_msg = format!("Failed to start watching directory: {}", e);
                eprintln!("[file-watcher] {}", err_msg);
                err_msg
            })?;

        self.watchers.insert(project_id, debouncer);

        eprintln!(
            "[file-watcher] Successfully started watching project {}",
            project_id
        );

        Ok(())
    }

    /// Stop watching a project
    pub fn stop_watching(&mut self, project_id: i64) -> Result<(), String> {
        if let Some(_debouncer) = self.watchers.remove(&project_id) {
            eprintln!("[file-watcher] Stopped watching project {}", project_id);
            Ok(())
        } else {
            Ok(()) // Not an error if not watching
        }
    }

    /// Start watching all projects on app startup
    pub async fn start_all(&mut self, projects: Vec<(i64, PathBuf)>) -> Result<(), String> {
        // Start the background flush task if not already started
        self.ensure_flush_task_started().await;

        let mut errors = Vec::new();

        for (project_id, path) in projects {
            if let Err(e) = self.start_watching(project_id, path) {
                // Log error but continue with other projects
                eprintln!(
                    "[file-watcher] Failed to start watching project {}: {}",
                    project_id, e
                );
                errors.push(format!("Project {}: {}", project_id, e));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            // Return combined error message
            Err(format!(
                "Failed to start watching {} project(s): {}",
                errors.len(),
                errors.join("; ")
            ))
        }
    }

    /// Stop all watchers on shutdown
    pub fn stop_all(&mut self) -> Result<(), String> {
        eprintln!("[file-watcher] Stopping all file watchers");
        self.watchers.clear();
        Ok(())
    }

    /// Handle file system events
    async fn handle_events(
        events: Vec<DebouncedEvent>,
        project_id: i64,
        project_root: PathBuf,
        buffer: Arc<Mutex<Vec<FileEvent>>>,
        force_flush_tx: Option<mpsc::Sender<()>>,
    ) {
        let mut buffer_guard = buffer.lock().await;

        for event in events {
            // Check for symlinks and paths outside project root (AC #5)
            match Self::get_relative_path_with_validation(&project_root, &event.path) {
                Ok(relative_path) => {
                    // Apply filters
                    if Self::should_ignore(&event.path) {
                        continue;
                    }

                    // Create file event
                    let file_event = FileEvent {
                        project_id,
                        file_path: relative_path,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };

                    buffer_guard.push(file_event);

                    // Force flush if buffer exceeds threshold (AC #4)
                    if buffer_guard.len() >= FORCE_FLUSH_THRESHOLD {
                        eprintln!(
                            "[file-watcher] Buffer threshold reached ({} events), triggering force flush",
                            buffer_guard.len()
                        );
                        if let Some(tx) = &force_flush_tx {
                            // Signal the flush task to run immediately
                            let _ = tx.try_send(());
                        }
                    }
                }
                Err(warning) => {
                    // Log warning for paths outside root or symlinks (AC #3, AC #5)
                    eprintln!("[file-watcher] {}", warning);
                }
            }
        }
    }

    /// Get relative path from project root with validation (AC #5)
    /// Returns Ok(relative_path) or Err(warning_message) for logging
    fn get_relative_path_with_validation(root: &Path, full_path: &Path) -> Result<String, String> {
        // Check if path is a symlink (AC #5)
        if full_path.is_symlink() {
            // Resolve the symlink to check if it points outside root
            match std::fs::read_link(full_path) {
                Ok(target) => {
                    let resolved = if target.is_absolute() {
                        target
                    } else {
                        full_path.parent().unwrap_or(root).join(&target)
                    };

                    // Check if resolved path is still within project root
                    if !resolved.starts_with(root) {
                        return Err(format!(
                            "Skipping symlink {:?} - points outside project root to {:?}",
                            full_path, resolved
                        ));
                    }
                }
                Err(e) => {
                    return Err(format!(
                        "Warning: Could not resolve symlink {:?}: {}",
                        full_path, e
                    ));
                }
            }
        }

        // Get relative path
        match full_path.strip_prefix(root) {
            Ok(relative) => match relative.to_str() {
                Some(s) => Ok(s.to_string()),
                None => Err(format!(
                    "Skipping path {:?} - contains invalid UTF-8",
                    full_path
                )),
            },
            Err(_) => Err(format!(
                "Skipping path {:?} - outside project root {:?}",
                full_path, root
            )),
        }
    }

    /// Get relative path from project root (simple version for tests)
    #[allow(dead_code)]
    fn get_relative_path(root: &Path, full_path: &Path) -> Option<String> {
        full_path
            .strip_prefix(root)
            .ok()
            .and_then(|p| p.to_str())
            .map(|s| s.to_string())
    }

    /// Check if path should be ignored based on filter rules (AC #3)
    fn should_ignore(path: &Path) -> bool {
        // Check each component of the path
        for component in path.components() {
            let comp_str = component.as_os_str().to_string_lossy();

            // Ignore common directories
            if matches!(
                comp_str.as_ref(),
                "node_modules" | ".git" | "target" | "dist" | "build" | ".idea" | ".vscode"
            ) {
                return true;
            }
        }

        // Get filename
        if let Some(filename) = path.file_name() {
            let name = filename.to_string_lossy();

            // Ignore specific files
            if matches!(name.as_ref(), ".DS_Store" | "thumbs.db") {
                return true;
            }

            // Ignore temp patterns
            // But allow config files like .env, .gitignore, etc.
            if name.starts_with('.') && !Self::is_config_file(&name) {
                return true;
            }

            // Ignore files ending with ~
            if name.ends_with('~') {
                return true;
            }

            // Ignore swap files
            if name.ends_with(".swp") {
                return true;
            }
        }

        false
    }

    /// Check if a dotfile is a config file that should be tracked (Issue #4 - expanded list)
    fn is_config_file(name: &str) -> bool {
        // Exact matches for common config files
        if matches!(
            name,
            // Environment and Git
            ".env" | ".env.local" | ".env.development" | ".env.production" | ".env.test"
            | ".gitignore" | ".gitattributes" | ".gitmodules"
            // Editor config
            | ".editorconfig"
            // JavaScript/TypeScript tooling
            | ".prettierrc" | ".prettierignore"
            | ".eslintrc" | ".eslintrc.js" | ".eslintrc.json" | ".eslintrc.cjs" | ".eslintignore"
            | ".babelrc" | ".babelrc.js" | ".babelrc.json"
            | ".stylelintrc" | ".stylelintrc.json"
            // Node.js
            | ".npmrc" | ".nvmrc" | ".yarnrc" | ".npmignore"
            // Docker
            | ".dockerignore"
            // Rust
            | ".rustfmt.toml" | ".cargo"
            // CI/CD (YAML files starting with .)
            | ".gitlab-ci.yml" | ".travis.yml"
            // Pre-commit
            | ".pre-commit-config.yaml"
            // Python
            | ".python-version" | ".flake8"
        ) {
            return true;
        }

        // Pattern matches for versioned config files (e.g., .env.staging)
        if name.starts_with(".env.") {
            return true;
        }

        false
    }

    /// Ensure the background flush task is started (called from async context)
    async fn ensure_flush_task_started(&mut self) {
        let mut started = self.flush_task_started.lock().await;
        if !*started {
            eprintln!("[file-watcher] Starting background flush task");
            let buffer = self.event_buffer.clone();
            let db_pool = self.db_pool.clone();

            // Create channel for force flush signals (Issue #1)
            let (tx, mut rx) = mpsc::channel::<()>(10);
            self.force_flush_tx = Some(tx);

            tokio::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(5));

                loop {
                    // Wait for either: interval tick OR force flush signal
                    tokio::select! {
                        _ = interval.tick() => {},
                        _ = rx.recv() => {
                            eprintln!("[file-watcher] Force flush triggered");
                        }
                    }

                    let mut buffer_guard = buffer.lock().await;

                    if buffer_guard.is_empty() {
                        continue;
                    }

                    // Take events from buffer
                    let events_to_flush: Vec<FileEvent> = buffer_guard.drain(..).collect();
                    drop(buffer_guard); // Release lock before DB operation

                    eprintln!(
                        "[file-watcher] Flushing {} file events to database",
                        events_to_flush.len()
                    );

                    // Write to database
                    if let Err(e) = Self::flush_to_db(&db_pool, events_to_flush).await {
                        eprintln!("[file-watcher] Failed to flush events to database: {}", e);
                    }
                }
            });

            *started = true;
        }
    }

    /// Flush events to database using prepared statement (Issue #6)
    async fn flush_to_db(pool: &crate::db::DbPool, events: Vec<FileEvent>) -> Result<(), String> {
        if events.is_empty() {
            return Ok(());
        }

        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get DB connection: {}", e))?;

        // Use a transaction for batch insert
        let tx = conn
            .unchecked_transaction()
            .map_err(|e| format!("Failed to start transaction: {}", e))?;

        // Use prepare_cached for better performance with repeated inserts (Issue #6)
        {
            let mut stmt = tx
                .prepare_cached(
                    "INSERT INTO observer_events (timestamp, event_type, file_path, project_id, window_title, process_name)
                     VALUES (?1, 'file_change', ?2, ?3, NULL, NULL)",
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            for event in events {
                stmt.execute(rusqlite::params![
                    event.timestamp,
                    event.file_path,
                    event.project_id
                ])
                .map_err(|e| format!("Failed to insert file event: {}", e))?;
            }
        }

        tx.commit()
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_ignore_node_modules() {
        let path = PathBuf::from("/project/node_modules/package/index.js");
        assert!(
            WatcherManager::should_ignore(&path),
            "node_modules should be ignored"
        );
    }

    #[test]
    fn test_should_ignore_git_directory() {
        let path = PathBuf::from("/project/.git/objects/abc123");
        assert!(
            WatcherManager::should_ignore(&path),
            ".git should be ignored"
        );
    }

    #[test]
    fn test_should_ignore_target_directory() {
        let path = PathBuf::from("/project/target/debug/binary");
        assert!(
            WatcherManager::should_ignore(&path),
            "target should be ignored"
        );
    }

    #[test]
    fn test_should_ignore_ds_store() {
        let path = PathBuf::from("/project/.DS_Store");
        assert!(
            WatcherManager::should_ignore(&path),
            ".DS_Store should be ignored"
        );
    }

    #[test]
    fn test_should_ignore_thumbs_db() {
        let path = PathBuf::from("/project/thumbs.db");
        assert!(
            WatcherManager::should_ignore(&path),
            "thumbs.db should be ignored"
        );
    }

    #[test]
    fn test_should_ignore_swap_file() {
        let path = PathBuf::from("/project/file.swp");
        assert!(
            WatcherManager::should_ignore(&path),
            ".swp files should be ignored"
        );
    }

    #[test]
    fn test_should_ignore_temp_file() {
        let path = PathBuf::from("/project/file~");
        assert!(
            WatcherManager::should_ignore(&path),
            "files ending with ~ should be ignored"
        );
    }

    #[test]
    fn test_should_not_ignore_env_file() {
        let path = PathBuf::from("/project/.env");
        assert!(
            !WatcherManager::should_ignore(&path),
            ".env should NOT be ignored"
        );
    }

    #[test]
    fn test_should_not_ignore_gitignore() {
        let path = PathBuf::from("/project/.gitignore");
        assert!(
            !WatcherManager::should_ignore(&path),
            ".gitignore should NOT be ignored"
        );
    }

    #[test]
    fn test_should_not_ignore_regular_file() {
        let path = PathBuf::from("/project/src/main.rs");
        assert!(
            !WatcherManager::should_ignore(&path),
            "Regular files should NOT be ignored"
        );
    }

    #[test]
    fn test_get_relative_path() {
        let root = PathBuf::from("/home/user/project");
        let full_path = PathBuf::from("/home/user/project/src/main.rs");

        let relative = WatcherManager::get_relative_path(&root, &full_path);
        assert_eq!(relative, Some("src/main.rs".to_string()));
    }

    #[test]
    fn test_get_relative_path_outside_root() {
        let root = PathBuf::from("/home/user/project");
        let full_path = PathBuf::from("/home/user/other/file.txt");

        let relative = WatcherManager::get_relative_path(&root, &full_path);
        assert_eq!(relative, None, "Paths outside root should return None");
    }

    #[test]
    fn test_get_relative_path_nested() {
        let root = PathBuf::from("/home/user/project");
        let full_path = PathBuf::from("/home/user/project/src/components/Button.tsx");

        let relative = WatcherManager::get_relative_path(&root, &full_path);
        assert_eq!(relative, Some("src/components/Button.tsx".to_string()));
    }

    // Tests for expanded config file whitelist (Issue #4)
    #[test]
    fn test_should_not_ignore_npmrc() {
        let path = PathBuf::from("/project/.npmrc");
        assert!(
            !WatcherManager::should_ignore(&path),
            ".npmrc should NOT be ignored"
        );
    }

    #[test]
    fn test_should_not_ignore_dockerignore() {
        let path = PathBuf::from("/project/.dockerignore");
        assert!(
            !WatcherManager::should_ignore(&path),
            ".dockerignore should NOT be ignored"
        );
    }

    #[test]
    fn test_should_not_ignore_gitlab_ci() {
        let path = PathBuf::from("/project/.gitlab-ci.yml");
        assert!(
            !WatcherManager::should_ignore(&path),
            ".gitlab-ci.yml should NOT be ignored"
        );
    }

    #[test]
    fn test_should_not_ignore_env_variants() {
        // Test various .env.* variants
        for env_file in &[
            ".env.local",
            ".env.development",
            ".env.production",
            ".env.staging",
        ] {
            let path = PathBuf::from(format!("/project/{}", env_file));
            assert!(
                !WatcherManager::should_ignore(&path),
                "{} should NOT be ignored",
                env_file
            );
        }
    }

    // Tests for path validation (Issue #2)
    #[test]
    fn test_get_relative_path_with_validation_valid() {
        let root = PathBuf::from("/home/user/project");
        let full_path = PathBuf::from("/home/user/project/src/main.rs");

        let result = WatcherManager::get_relative_path_with_validation(&root, &full_path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "src/main.rs");
    }

    #[test]
    fn test_get_relative_path_with_validation_outside_root() {
        let root = PathBuf::from("/home/user/project");
        let full_path = PathBuf::from("/home/user/other/file.txt");

        let result = WatcherManager::get_relative_path_with_validation(&root, &full_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside project root"));
    }

    // Integration test for database flush (Issue #3)
    #[tokio::test]
    async fn test_flush_to_db_writes_events() {
        use r2d2_sqlite::SqliteConnectionManager;
        use std::time::Duration;

        // Create test database with schema
        let manager = SqliteConnectionManager::memory().with_init(|conn| {
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA foreign_keys=ON;",
            )
        });

        let pool = r2d2::Pool::builder()
            .max_size(1)
            .connection_timeout(Duration::from_secs(5))
            .build(manager)
            .unwrap();

        // Run migrations to create tables
        let mut conn = pool.get().unwrap();
        crate::db::run_migrations(&mut conn).unwrap();

        // Insert test projects to satisfy foreign key constraint
        conn.execute(
            "INSERT INTO projects (id, path, name, type) VALUES (1, '/test/project1', 'project1', 'git')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO projects (id, path, name, type) VALUES (2, '/test/project2', 'project2', 'folder')",
            [],
        ).unwrap();
        drop(conn);

        // Create test events
        let events = vec![
            FileEvent {
                project_id: 1,
                file_path: "src/main.rs".to_string(),
                timestamp: 1234567890,
            },
            FileEvent {
                project_id: 1,
                file_path: "src/lib.rs".to_string(),
                timestamp: 1234567891,
            },
            FileEvent {
                project_id: 2,
                file_path: "Cargo.toml".to_string(),
                timestamp: 1234567892,
            },
        ];

        // Flush events to database
        let result = WatcherManager::flush_to_db(&pool, events).await;
        assert!(result.is_ok(), "flush_to_db should succeed: {:?}", result);

        // Verify events were written
        let conn = pool.get().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM observer_events WHERE event_type = 'file_change'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 3, "Should have 3 file_change events in database");

        // Verify project_id is correct
        let project_1_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM observer_events WHERE project_id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(project_1_count, 2, "Project 1 should have 2 events");
    }

    // Test for force flush threshold constant
    #[test]
    fn test_force_flush_threshold_is_1000() {
        assert_eq!(FORCE_FLUSH_THRESHOLD, 1000);
    }
}
