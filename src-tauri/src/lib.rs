mod ai;
mod commands;
mod context;
mod db;
pub mod observer;
mod security;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_pool = db::init_db().expect("Failed to initialize database");

    // Initialize observer manager
    let observer_manager =
        std::sync::Arc::new(tokio::sync::Mutex::new(observer::ObserverManager::new()));

    // Initialize file watcher manager (Story 6.3)
    // Note: We create it here but start watching in the setup hook within Tauri's async context
    let watcher_manager = std::sync::Arc::new(tokio::sync::Mutex::new(
        observer::WatcherManager::new(db_pool.clone()),
    ));

    // Clone for setup hook
    let watcher_for_setup = watcher_manager.clone();
    let db_pool_for_setup = db_pool.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db_pool)
        .manage(observer_manager)
        .manage(watcher_manager)
        .setup(move |_app| {
            // Start watching all projects in Tauri's async runtime context (Story 6.3)
            // We use spawn_blocking for DB query since rusqlite types are not Send
            tauri::async_runtime::spawn(async move {
                // Query projects using spawn_blocking (rusqlite types are not Send)
                let db_pool_clone = db_pool_for_setup.clone();
                let project_paths_result = tokio::task::spawn_blocking(move || {
                    let conn = db_pool_clone.get()?;
                    let mut stmt =
                        conn.prepare("SELECT id, path FROM projects WHERE deleted_at IS NULL")?;
                    let projects: Vec<(i64, String)> = stmt
                        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
                        .filter_map(|r| r.ok())
                        .collect();
                    Ok::<Vec<(i64, std::path::PathBuf)>, Box<dyn std::error::Error + Send + Sync>>(
                        projects
                            .into_iter()
                            .map(|(id, path)| (id, std::path::PathBuf::from(path)))
                            .collect(),
                    )
                })
                .await;

                let project_paths = match project_paths_result {
                    Ok(Ok(paths)) => paths,
                    Ok(Err(e)) => {
                        eprintln!("[app] Warning: Failed to query projects for watcher: {}", e);
                        return;
                    }
                    Err(e) => {
                        eprintln!("[app] Warning: Failed to spawn DB query: {}", e);
                        return;
                    }
                };

                let count = project_paths.len();
                let mut watcher = watcher_for_setup.lock().await;

                match watcher.start_all(project_paths).await {
                    Ok(()) => eprintln!("[app] Started watching {} projects", count),
                    Err(e) => eprintln!("[app] Warning: Failed to start watching projects: {}", e),
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::projects::add_project,
            commands::projects::get_projects,
            commands::projects::delete_project,
            commands::projects::remove_project,
            commands::projects::archive_project,
            commands::projects::restore_project,
            commands::projects::scan_projects,
            commands::settings::get_setting,
            commands::settings::update_setting,
            commands::settings::get_ai_providers,
            commands::settings::set_default_provider,
            commands::settings::save_provider_api_key,
            commands::settings::get_provider_api_key,
            commands::settings::test_provider_connection,
            commands::git::get_git_history,
            commands::git::get_git_branch,
            commands::git::get_git_status,
            commands::git::get_git_context,
            commands::git::commit_changes,
            commands::git::safe_push,
            commands::ide::open_in_ide,
            commands::ai::set_api_key,
            commands::ai::get_api_key,
            commands::ai::delete_api_key,
            commands::ai::test_api_connection,
            commands::ai::generate_context,
            commands::devlog::get_devlog_with_mtime,
            commands::devlog::get_devlog_mtime,
            commands::devlog::resolve_conflict_reload,
            commands::devlog::append_devlog,
            commands::devlog::write_devlog,
            commands::devlog::get_devlog_history,
            commands::devlog::get_devlog_version,
            commands::observer::start_observer,
            commands::observer::stop_observer,
            commands::observer::get_observer_status
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Stop observer daemon on app exit (Story 6.1, AC #6)
                let observer_mgr = app_handle
                    .state::<std::sync::Arc<tokio::sync::Mutex<observer::ObserverManager>>>();
                let observer_mgr_clone = observer_mgr.inner().clone();

                // Stop file watcher on app exit (Story 6.3, AC #6)
                let watcher_mgr = app_handle
                    .state::<std::sync::Arc<tokio::sync::Mutex<observer::WatcherManager>>>();
                let watcher_mgr_clone = watcher_mgr.inner().clone();

                // Use block_on since we're in the exit handler
                if let Ok(runtime) = tokio::runtime::Runtime::new() {
                    runtime.block_on(async {
                        // Stop observer daemon
                        let mgr = observer_mgr_clone.lock().await;
                        if let Err(e) = mgr.stop_daemon().await {
                            eprintln!("[app] Failed to stop observer daemon on exit: {}", e);
                        } else {
                            eprintln!("[app] Observer daemon stopped on exit");
                        }
                        drop(mgr);

                        // Stop file watcher
                        let mut watcher = watcher_mgr_clone.lock().await;
                        if let Err(e) = watcher.stop_all() {
                            eprintln!("[app] Failed to stop file watcher on exit: {}", e);
                        } else {
                            eprintln!("[app] File watcher stopped on exit");
                        }
                    });
                }
            }
        });
}
