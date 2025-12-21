//! DEVLOG editor commands for the frontend
//!
//! Provides commands to read, append, and write DEVLOG.md files.

use crate::context::devlog::{read_devlog, DEVLOG_LOCATIONS};
use chrono::Local;
use std::fs;
use std::path::Path;

/// Get the full content of a DEVLOG file for a project
#[tauri::command]
pub async fn get_devlog_content(project_path: String) -> Result<String, String> {
    let path = Path::new(&project_path);

    match read_devlog(path) {
        Some(content) => Ok(content.content),
        None => Ok(String::new()), // Return empty string if no DEVLOG exists
    }
}

/// Get the modification timestamp of the DEVLOG file
#[tauri::command]
pub async fn get_devlog_mtime(project_path: String) -> Result<u64, String> {
    let path = Path::new(&project_path);

    for location in DEVLOG_LOCATIONS {
        let devlog_path = path.join(location);
        if devlog_path.exists() {
            let metadata = fs::metadata(&devlog_path)
                .map_err(|e| format!("Failed to get file metadata: {}", e))?;

            let mtime = metadata
                .modified()
                .map_err(|e| format!("Failed to get modification time: {}", e))?;

            let duration = mtime
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| format!("Failed to convert time: {}", e))?;

            return Ok(duration.as_secs());
        }
    }

    // No DEVLOG exists yet, return 0
    Ok(0)
}

/// Append a new entry to the DEVLOG with a timestamp header
#[tauri::command]
pub async fn append_devlog(project_path: String, content: String) -> Result<(), String> {
    let path = Path::new(&project_path);

    // Find existing DEVLOG or create in root
    let devlog_path = find_or_create_devlog_path(path)?;

    // Generate timestamp header
    let timestamp = Local::now().format("%Y-%m-%d %H:%M").to_string();
    let header = format!("## {}", timestamp);

    // Read existing content
    let existing = fs::read_to_string(&devlog_path).unwrap_or_default();

    // Append new content with timestamp
    let separator = if existing.is_empty() || existing.ends_with('\n') {
        ""
    } else {
        "\n"
    };

    let new_content = if existing.is_empty() {
        format!("# DEVLOG\n\n{}\n\n{}", header, content.trim())
    } else {
        format!("{}{}\n{}\n\n{}", existing, separator, header, content.trim())
    };

    fs::write(&devlog_path, new_content)
        .map_err(|e| format!("Failed to write DEVLOG: {}", e))?;

    Ok(())
}

/// Overwrite the entire DEVLOG file (for edit mode)
#[tauri::command]
pub async fn write_devlog(project_path: String, content: String) -> Result<(), String> {
    let path = Path::new(&project_path);

    // Find existing DEVLOG or create in root
    let devlog_path = find_or_create_devlog_path(path)?;

    fs::write(&devlog_path, content)
        .map_err(|e| format!("Failed to write DEVLOG: {}", e))?;

    Ok(())
}

/// Find existing DEVLOG path or return path for new one in root
fn find_or_create_devlog_path(project_path: &Path) -> Result<std::path::PathBuf, String> {
    // Check standard locations
    for location in DEVLOG_LOCATIONS {
        let devlog_path = project_path.join(location);
        if devlog_path.exists() {
            return Ok(devlog_path);
        }
    }

    // Create in root if doesn't exist
    let root_path = project_path.join("DEVLOG.md");

    // Ensure parent directory exists (should always be true for root)
    if let Some(parent) = root_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    Ok(root_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_project() -> TempDir {
        tempfile::tempdir().expect("Failed to create temp dir")
    }

    #[tokio::test]
    async fn test_get_devlog_content_empty() {
        let temp = create_test_project();
        let result = get_devlog_content(temp.path().to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "");
    }

    #[tokio::test]
    async fn test_get_devlog_content_existing() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "# DEVLOG\n\nTest content").unwrap();

        let result = get_devlog_content(temp.path().to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(result.unwrap().contains("Test content"));
    }

    #[tokio::test]
    async fn test_append_devlog_new_file() {
        let temp = create_test_project();
        let project_path = temp.path().to_string_lossy().to_string();

        let result = append_devlog(project_path.clone(), "First entry".to_string()).await;
        assert!(result.is_ok());

        let content = get_devlog_content(project_path).await.unwrap();
        assert!(content.contains("# DEVLOG"));
        assert!(content.contains("First entry"));
        // Should have timestamp header like "## 2025-12-21 14:30"
        assert!(content.contains("## 20"));
    }

    #[tokio::test]
    async fn test_append_devlog_existing_file() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "# DEVLOG\n\n## 2025-12-20 10:00\n\nExisting entry").unwrap();

        let project_path = temp.path().to_string_lossy().to_string();
        let result = append_devlog(project_path.clone(), "New entry".to_string()).await;
        assert!(result.is_ok());

        let content = get_devlog_content(project_path).await.unwrap();
        assert!(content.contains("Existing entry"));
        assert!(content.contains("New entry"));
    }

    #[tokio::test]
    async fn test_write_devlog_overwrite() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "Old content").unwrap();

        let project_path = temp.path().to_string_lossy().to_string();
        let result = write_devlog(project_path.clone(), "New content".to_string()).await;
        assert!(result.is_ok());

        let content = get_devlog_content(project_path).await.unwrap();
        assert!(!content.contains("Old content"));
        assert!(content.contains("New content"));
    }

    #[tokio::test]
    async fn test_get_devlog_mtime() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "Test").unwrap();

        let project_path = temp.path().to_string_lossy().to_string();
        let result = get_devlog_mtime(project_path).await;
        assert!(result.is_ok());
        assert!(result.unwrap() > 0);
    }
}
