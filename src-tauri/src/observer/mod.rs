/// Observer Manager Module
///
/// Manages the lifecycle of the X11 observer daemon process and handles
/// IPC communication via Unix sockets.
///
/// Story 6.1: Window Title Tracking (X11)
/// Story 6.2: Window Title Tracking (Wayland GNOME)
pub mod types;
pub use types::{WindowEvent, WindowEventData};

use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Arc;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;
use tokio::net::UnixListener;
use tokio::sync::Mutex;

/// Manages the observer daemon process and IPC
pub struct ObserverManager {
    daemon_process: Arc<Mutex<Option<Child>>>,
    socket_path: PathBuf,
    is_running: Arc<Mutex<bool>>,
}

impl ObserverManager {
    pub fn new() -> Self {
        Self {
            daemon_process: Arc::new(Mutex::new(None)),
            socket_path: PathBuf::from("/tmp/ronin-observer.sock"),
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the observer daemon process
    #[cfg(target_os = "linux")]
    pub async fn start_daemon(&self, db_pool: crate::db::DbPool) -> Result<(), String> {
        let mut process = self.daemon_process.lock().await;
        let mut is_running = self.is_running.lock().await;

        if process.is_some() {
            return Err("Daemon already running".to_string());
        }

        // Remove old socket if it exists
        if self.socket_path.exists() {
            std::fs::remove_file(&self.socket_path)
                .map_err(|e| format!("Failed to remove old socket: {}", e))?;
        }

        // Start Unix socket server BEFORE spawning daemon
        let listener = UnixListener::bind(&self.socket_path)
            .map_err(|e| format!("Failed to bind Unix socket: {}", e))?;

        eprintln!(
            "[observer-manager] Unix socket server started at {:?}",
            self.socket_path
        );

        // Get the path to the observer binary (same directory as main binary)
        let current_exe = std::env::current_exe()
            .map_err(|e| format!("Failed to get current executable: {}", e))?;
        let binary_dir = current_exe
            .parent()
            .ok_or("Failed to get binary directory")?;
        let observer_path = binary_dir.join("ronin-observer");

        eprintln!("[observer-manager] Starting daemon: {:?}", observer_path);

        // Spawn the daemon process
        let child = Command::new(&observer_path)
            .spawn()
            .map_err(|e| format!("Failed to spawn observer daemon: {}", e))?;

        eprintln!("[observer-manager] Daemon spawned with PID: {}", child.id());

        eprintln!(
            "[observer-manager] Unix socket server started at {:?}",
            self.socket_path
        );

        *process = Some(child);
        *is_running = true;

        // Start background task to handle IPC messages
        let is_running_clone = self.is_running.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::handle_ipc_messages(listener, db_pool, is_running_clone).await {
                eprintln!("[observer-manager] IPC handler error: {}", e);
            }
        });

        Ok(())
    }

    #[cfg(not(target_os = "linux"))]
    pub async fn start_daemon(&self, _db_pool: crate::db::DbPool) -> Result<(), String> {
        Err("Observer daemon is only supported on Linux".to_string())
    }

    /// Stop the observer daemon process
    pub async fn stop_daemon(&self) -> Result<(), String> {
        let mut process = self.daemon_process.lock().await;
        let mut is_running = self.is_running.lock().await;

        if let Some(mut child) = process.take() {
            eprintln!("[observer-manager] Stopping daemon (PID: {})", child.id());

            // Try graceful shutdown first
            #[cfg(unix)]
            {
                // Send SIGTERM
                unsafe {
                    libc::kill(child.id() as i32, libc::SIGTERM);
                }

                // Wait up to 3 seconds for graceful shutdown
                for _ in 0..30 {
                    match child.try_wait() {
                        Ok(Some(_status)) => {
                            eprintln!("[observer-manager] Daemon terminated gracefully");
                            *is_running = false;
                            return Ok(());
                        }
                        Ok(None) => {
                            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                        }
                        Err(e) => {
                            return Err(format!("Failed to wait for daemon: {}", e));
                        }
                    }
                }

                // Force kill if still running
                eprintln!("[observer-manager] Force killing daemon");
                child
                    .kill()
                    .map_err(|e| format!("Failed to kill daemon: {}", e))?;
            }

            #[cfg(not(unix))]
            {
                child
                    .kill()
                    .map_err(|e| format!("Failed to kill daemon: {}", e))?;
            }

            *is_running = false;
        }

        // Clean up socket file
        if self.socket_path.exists() {
            std::fs::remove_file(&self.socket_path)
                .map_err(|e| format!("Failed to remove socket: {}", e))?;
        }

        Ok(())
    }

    /// Check if daemon is running
    pub async fn is_running(&self) -> bool {
        *self.is_running.lock().await
    }

    /// Background task to handle IPC messages from daemon
    async fn handle_ipc_messages(
        listener: UnixListener,
        db_pool: crate::db::DbPool,
        is_running: Arc<Mutex<bool>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        eprintln!("[observer-manager] IPC handler started, waiting for connections...");

        loop {
            // Check if we should stop
            if !*is_running.lock().await {
                eprintln!("[observer-manager] IPC handler stopping");
                break;
            }

            // Accept connection with timeout
            let accept_result =
                tokio::time::timeout(tokio::time::Duration::from_secs(1), listener.accept()).await;

            match accept_result {
                Ok(Ok((stream, _addr))) => {
                    eprintln!("[observer-manager] Daemon connected to IPC");

                    let db_pool_clone = db_pool.clone();
                    let is_running_clone = is_running.clone();

                    tokio::spawn(async move {
                        let reader = BufReader::new(stream);
                        let mut lines = reader.lines();

                        while *is_running_clone.lock().await {
                            match lines.next_line().await {
                                Ok(Some(line)) => {
                                    match serde_json::from_str::<WindowEvent>(&line) {
                                        Ok(event) => {
                                            // Handle different event types
                                            match event.event_type.as_str() {
                                                "window_focus" => {
                                                    eprintln!(
                                                        "[observer-manager] Received event: {} - {}",
                                                        event.data.app_class, event.data.title
                                                    );

                                                    // Process event and insert into database
                                                    if let Err(e) = Self::process_window_event(
                                                        event,
                                                        &db_pool_clone,
                                                    )
                                                    .await
                                                    {
                                                        eprintln!(
                                                            "[observer-manager] Failed to process event: {}",
                                                            e
                                                        );
                                                    }
                                                }
                                                "extension_missing" => {
                                                    eprintln!(
                                                        "[observer-manager] WARNING: GNOME Shell Extension not found"
                                                    );
                                                    eprintln!(
                                                        "[observer-manager] Window tracking on Wayland requires the Ronin Observer Extension"
                                                    );
                                                    eprintln!(
                                                        "[observer-manager] Please install the extension to enable Silent Observer on Wayland/GNOME"
                                                    );
                                                    // TODO: In future, update app state so UI can show setup guide
                                                }
                                                _ => {
                                                    eprintln!(
                                                        "[observer-manager] Unknown event type: {}",
                                                        event.event_type
                                                    );
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            eprintln!(
                                                "[observer-manager] Failed to parse event: {}",
                                                e
                                            );
                                        }
                                    }
                                }
                                Ok(None) => {
                                    eprintln!("[observer-manager] Daemon disconnected");
                                    break;
                                }
                                Err(e) => {
                                    eprintln!(
                                        "[observer-manager] Error reading from socket: {}",
                                        e
                                    );
                                    break;
                                }
                            }
                        }
                    });
                }
                Ok(Err(e)) => {
                    eprintln!("[observer-manager] Failed to accept connection: {}", e);
                }
                Err(_) => {
                    // Timeout - continue loop to check is_running
                    continue;
                }
            }
        }

        Ok(())
    }

    /// Process a window event and insert into database
    async fn process_window_event(
        event: WindowEvent,
        db_pool: &crate::db::DbPool,
    ) -> Result<(), String> {
        let conn = db_pool
            .get()
            .map_err(|e| format!("Failed to get DB connection: {}", e))?;

        // Extract app_class (take first part before null byte if present)
        let process_name = event
            .data
            .app_class
            .split('\0')
            .next()
            .unwrap_or(&event.data.app_class)
            .to_string();

        // Try to match window title to a tracked project
        let project_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM projects WHERE ? LIKE '%' || path || '%' AND deleted_at IS NULL",
                rusqlite::params![&event.data.title],
                |row| row.get(0),
            )
            .ok();

        // Insert event into database
        conn.execute(
            "INSERT INTO observer_events (timestamp, event_type, window_title, process_name, project_id)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                event.data.timestamp,
                event.event_type,
                event.data.title,
                process_name,
                project_id,
            ],
        )
        .map_err(|e| format!("Failed to insert event: {}", e))?;

        if let Some(pid) = project_id {
            eprintln!("[observer-manager] Event matched to project ID: {}", pid);
        }

        Ok(())
    }
}

impl Drop for ObserverManager {
    fn drop(&mut self) {
        // Note: We can't call async stop_daemon() from Drop, so best effort cleanup only.
        // The proper shutdown is handled by the Tauri exit handler in lib.rs.
        // This just ensures socket file cleanup if the process somehow missed the exit handler.
        if self.socket_path.exists() {
            eprintln!("[observer-manager] Cleaning up socket file on drop");
            let _ = std::fs::remove_file(&self.socket_path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    /// Helper to create a test database pool
    fn create_test_db() -> crate::db::DbPool {
        use r2d2_sqlite::SqliteConnectionManager;

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

        let mut conn = pool.get().unwrap();
        crate::db::run_migrations(&mut conn).unwrap();

        pool
    }

    #[tokio::test]
    async fn test_observer_manager_new() {
        let manager = ObserverManager::new();
        assert!(!manager.is_running().await);
        assert_eq!(
            manager.socket_path,
            std::path::PathBuf::from("/tmp/ronin-observer.sock")
        );
    }

    #[tokio::test]
    async fn test_process_window_event_inserts_to_db() {
        let pool = create_test_db();

        let event = WindowEvent {
            event_type: "window_focus".to_string(),
            data: WindowEventData {
                title: "test.rs - vscode".to_string(),
                app_class: "code\0Code".to_string(),
                timestamp: 1234567890,
            },
        };

        let result = ObserverManager::process_window_event(event, &pool).await;
        assert!(result.is_ok(), "process_window_event should succeed");

        // Verify event was inserted
        let conn = pool.get().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM observer_events WHERE window_title = ?",
                rusqlite::params!["test.rs - vscode"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "Event should be inserted into database");

        // Verify process_name was extracted correctly (before null byte)
        let process_name: String = conn
            .query_row(
                "SELECT process_name FROM observer_events WHERE window_title = ?",
                rusqlite::params!["test.rs - vscode"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            process_name, "code",
            "Process name should be extracted correctly"
        );
    }

    #[tokio::test]
    async fn test_process_window_event_matches_project() {
        let pool = create_test_db();

        // Insert a test project (in a scope to release connection)
        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?, ?, ?)",
                rusqlite::params!["/home/user/project/ronin", "ronin", "git"],
            )
            .unwrap();
        } // conn is dropped here, releasing it back to the pool

        // Create event with matching window title
        let event = WindowEvent {
            event_type: "window_focus".to_string(),
            data: WindowEventData {
                title: "lib.rs - /home/user/project/ronin - VS Code".to_string(),
                app_class: "code".to_string(),
                timestamp: 1234567890,
            },
        };

        let result = ObserverManager::process_window_event(event, &pool).await;
        assert!(
            result.is_ok(),
            "process_window_event should succeed: {:?}",
            result
        );

        // Verify project was matched (get a new connection)
        let conn = pool.get().unwrap();
        let project_id: Option<i64> = conn
            .query_row(
                "SELECT project_id FROM observer_events WHERE timestamp = ?",
                rusqlite::params![1234567890i64],
                |row| row.get(0),
            )
            .unwrap();
        assert!(project_id.is_some(), "Project should be matched");
    }

    #[tokio::test]
    async fn test_stop_daemon_when_not_running() {
        let manager = ObserverManager::new();
        // Should succeed even when no daemon is running
        let result = manager.stop_daemon().await;
        assert!(
            result.is_ok(),
            "stop_daemon should succeed when not running"
        );
    }

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
        assert!(json.contains("\"type\":\"window_focus\""));
        assert!(json.contains("\"title\":\"test window\""));
        assert!(json.contains("\"app_class\":\"firefox\""));
        assert!(json.contains("\"timestamp\":1234567890"));

        // Test deserialization
        let parsed: WindowEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.event_type, "window_focus");
        assert_eq!(parsed.data.title, "test window");
    }
}
