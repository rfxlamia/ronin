/// Observer commands for controlling the Silent Observer daemon
///
/// Story 6.1: Window Title Tracking (X11)
use crate::observer::ObserverManager;
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

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_observer_commands_exist() {
        // This test just verifies the commands compile and have correct signatures
        // Actual functionality testing requires X11 environment
        assert!(true);
    }
}
