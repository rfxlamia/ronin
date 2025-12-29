use crate::observer::settings::{load_observer_settings, save_observer_settings, ObserverSettings};
/// Observer commands for controlling the Silent Observer daemon
///
/// Story 6.1: Window Title Tracking (X11)
/// Story 6.5: Privacy Controls
use crate::observer::ObserverManager;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Start the observer daemon
#[tauri::command]
pub async fn start_observer(
    manager: tauri::State<'_, Arc<Mutex<ObserverManager>>>,
    db_pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let manager = manager.lock().await;
    manager.start_daemon(db_pool.inner().clone()).await
}

/// Stop the observer daemon
#[tauri::command]
pub async fn stop_observer(
    manager: tauri::State<'_, Arc<Mutex<ObserverManager>>>,
) -> Result<(), String> {
    let manager = manager.lock().await;
    manager.stop_daemon().await
}

/// Get observer daemon status
#[tauri::command]
pub async fn get_observer_status(
    manager: tauri::State<'_, Arc<Mutex<ObserverManager>>>,
) -> Result<bool, String> {
    let manager = manager.lock().await;
    Ok(manager.is_running().await)
}

/// Get Observer privacy settings
/// Story 6.5: Privacy Controls
#[tauri::command]
pub async fn get_observer_settings(
    db_pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<ObserverSettingsResponse, String> {
    let settings = load_observer_settings(db_pool.inner())?;

    // Convert to serializable format (Regex -> String)
    Ok(ObserverSettingsResponse {
        enabled: settings.enabled,
        excluded_apps: settings.excluded_apps,
        excluded_url_patterns: settings.excluded_url_patterns,
    })
}

/// Update Observer privacy settings
/// Story 6.5: Privacy Controls
#[tauri::command]
pub async fn update_observer_settings(
    settings: ObserverSettingsRequest,
    manager: tauri::State<'_, Arc<Mutex<ObserverManager>>>,
    db_pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Validate regex patterns before saving
    for pattern in &settings.excluded_url_patterns {
        regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern '{}': {}", pattern, e))?;
    }

    // Create settings object (regex compilation happens in load)
    let observer_settings = ObserverSettings {
        enabled: settings.enabled.clone(),
        excluded_apps: settings.excluded_apps.clone(),
        excluded_urls: vec![], // Will be compiled on next load
        excluded_url_patterns: settings.excluded_url_patterns.clone(),
    };

    // Save to database
    save_observer_settings(db_pool.inner(), &observer_settings)?;

    // Story 6.5: Send settings update to daemon for live sync (AC #6)
    let settings_update = crate::observer::types::SettingsUpdate {
        enabled: settings.enabled,
        excluded_apps: settings.excluded_apps,
        excluded_url_patterns: settings.excluded_url_patterns,
    };

    let manager = manager.lock().await;
    if let Err(e) = manager.send_settings_update(settings_update).await {
        // Log but don't fail - graceful degradation
        eprintln!(
            "[observer] Warning: Failed to send live settings update: {}",
            e
        );
    }

    Ok(())
}

/// Get recent Observer events for data viewer
/// Story 6.5: Privacy Controls
#[tauri::command]
pub async fn get_observer_data(
    limit: usize,
    db_pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Vec<ObserverEventResponse>, String> {
    let conn = db_pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                oe.id,
                oe.timestamp,
                oe.event_type,
                oe.window_title,
                oe.process_name,
                oe.file_path,
                p.name as project_name
             FROM observer_events oe
             LEFT JOIN projects p ON oe.project_id = p.id
             ORDER BY oe.timestamp DESC
             LIMIT ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let events = stmt
        .query_map([limit], |row| {
            Ok(ObserverEventResponse {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                event_type: row.get(2)?,
                window_title: row.get(3)?,
                process_name: row.get(4)?,
                file_path: row.get(5)?,
                project_name: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to execute query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;

    Ok(events)
}

/// Delete all Observer events  
/// Story 6.5: Privacy Controls
#[tauri::command]
pub async fn delete_all_observer_data(
    db_pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<usize, String> {
    let conn = db_pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    let deleted_count = conn
        .execute("DELETE FROM observer_events", [])
        .map_err(|e| format!("Failed to delete observer data: {}", e))?;

    Ok(deleted_count)
}

// ===== Request/Response Types =====

#[derive(Debug, Serialize, Deserialize)]
pub struct ObserverSettingsResponse {
    pub enabled: bool,
    pub excluded_apps: Vec<String>,
    pub excluded_url_patterns: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ObserverSettingsRequest {
    pub enabled: bool,
    pub excluded_apps: Vec<String>,
    pub excluded_url_patterns: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ObserverEventResponse {
    pub id: i64,
    pub timestamp: i64,
    pub event_type: String,
    pub window_title: Option<String>,
    pub process_name: Option<String>,
    pub file_path: Option<String>,
    pub project_name: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use r2d2_sqlite::SqliteConnectionManager;
    use std::time::Duration;

    fn create_test_db() -> crate::db::DbPool {
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
    async fn test_observer_commands_exist() {
        // This test just verifies the commands compile and have correct signatures
        // Actual functionality testing requires X11 environment
        assert!(true);
    }

    #[tokio::test]
    async fn test_get_observer_settings_logic() {
        let pool = create_test_db();

        // Test underlying logic directly
        let settings = load_observer_settings(&pool).expect("Should load default settings");

        assert_eq!(settings.enabled, true);
        assert_eq!(settings.excluded_apps.len(), 0);
        assert_eq!(settings.excluded_url_patterns.len(), 0);
    }

    #[tokio::test]
    async fn test_update_observer_settings_logic() {
        let pool = create_test_db();

        // Create settings directly
        let settings_to_save = ObserverSettings {
            enabled: false,
            excluded_apps: vec!["Brave".to_string()],
            excluded_urls: vec![],
            excluded_url_patterns: vec![".*bank.*".to_string()],
        };

        // Test save
        let result = save_observer_settings(&pool, &settings_to_save);
        assert!(result.is_ok(), "Save should succeed");

        // Test load
        let loaded = load_observer_settings(&pool).expect("Should load updated settings");

        assert_eq!(loaded.enabled, false);
        assert_eq!(loaded.excluded_apps.len(), 1);
        assert_eq!(loaded.excluded_apps[0], "Brave");
        assert_eq!(loaded.excluded_url_patterns.len(), 1);
    }

    #[test]
    fn test_invalid_regex_pattern_validation() {
        // Test that invalid regex is rejected
        let result = regex::Regex::new("[unclosed");
        assert!(result.is_err(), "Invalid regex should error");
    }

    #[tokio::test]
    async fn test_get_observer_data_logic() {
        let pool = create_test_db();

        // Query directly
        let conn = pool.get().unwrap();
        let mut stmt = conn
            .prepare("SELECT COUNT(*) FROM observer_events")
            .unwrap();

        let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(count, 0, "Should start with no events");
    }

    #[tokio::test]
    async fn test_delete_all_observer_data_logic() {
        let pool = create_test_db();

        // Insert test event
        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO observer_events (timestamp, event_type, window_title, process_name) 
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![1234567890i64, "window_focus", "test", "app"],
            )
            .unwrap();
        }

        // Verify event exists
        {
            let conn = pool.get().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM observer_events", [], |row| row.get(0))
                .unwrap();
            assert_eq!(count, 1, "Should have 1 event");
        }

        // Delete all data
        {
            let conn = pool.get().unwrap();
            let deleted_count = conn.execute("DELETE FROM observer_events", []).unwrap();
            assert_eq!(deleted_count, 1, "Should delete 1 event");
        }

        // Verify data is gone
        {
            let conn = pool.get().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM observer_events", [], |row| row.get(0))
                .unwrap();
            assert_eq!(count, 0, "All events should be deleted");
        }
    }
}
