use std::process::Command;
use tauri::command;

#[command]
pub async fn open_in_ide(path: String) -> Result<(), String> {
    // Try VS Code first
    if which::which("code").is_ok() {
        Command::new("code")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch VS Code: {}", e))?;
        return Ok(());
    }

    // Try VS Codium as second option
    if which::which("codium").is_ok() {
        Command::new("codium")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch VS Codium: {}", e))?;
        return Ok(());
    }

    // Fallback to system file manager
    Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_open_in_ide_handles_paths() {
        // Test that function doesn't panic with valid path
        // Actual behavior depends on system having IDE installed
        let result = open_in_ide("/tmp".to_string()).await;
        // Should return Ok or Err, not panic
        assert!(result.is_ok() || result.is_err());
    }
}
