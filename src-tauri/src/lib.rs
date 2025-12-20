mod commands;
mod db;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_pool = db::init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db_pool)
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
            commands::git::get_git_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
