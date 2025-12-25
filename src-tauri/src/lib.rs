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

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db_pool)
        .manage(observer_manager)
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
                let manager = app_handle
                    .state::<std::sync::Arc<tokio::sync::Mutex<observer::ObserverManager>>>();
                let manager_clone = manager.inner().clone();

                // Use block_on since we're in the exit handler
                if let Ok(runtime) = tokio::runtime::Runtime::new() {
                    runtime.block_on(async {
                        let mgr = manager_clone.lock().await;
                        if let Err(e) = mgr.stop_daemon().await {
                            eprintln!("[app] Failed to stop observer daemon on exit: {}", e);
                        } else {
                            eprintln!("[app] Observer daemon stopped on exit");
                        }
                    });
                }
            }
        });
}
