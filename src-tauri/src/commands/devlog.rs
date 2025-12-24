//! DEVLOG editor commands for the frontend
//!
//! Provides commands to read, append, and write DEVLOG.md files.

use crate::context::devlog::find_devlog_path;
use chrono::Local;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(serde::Serialize)]
pub struct DevlogData {
    pub content: String,
    pub mtime: u64,
}

/// Get the full content of a DEVLOG file for a project with mtime
#[tauri::command]
pub async fn get_devlog_with_mtime(project_path: String) -> Result<DevlogData, String> {
    let path = Path::new(&project_path);
    let devlog_path = find_devlog_path(path).unwrap_or_else(|| path.join("DEVLOG.md")); // Default to root if not found (for content)

    let content = if devlog_path.exists() {
        fs::read_to_string(&devlog_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mtime = if devlog_path.exists() {
        get_file_mtime(&devlog_path)?
    } else {
        0
    };

    Ok(DevlogData { content, mtime })
}

/// Get the modification timestamp of the DEVLOG file
#[tauri::command]
pub async fn get_devlog_mtime(project_path: String) -> Result<u64, String> {
    let path = Path::new(&project_path);

    if let Some(devlog_path) = find_devlog_path(path) {
        get_file_mtime(&devlog_path)
    } else {
        Ok(0)
    }
}

/// Reload external file with error recovery
#[tauri::command]
pub async fn resolve_conflict_reload(project_path: String) -> Result<DevlogData, String> {
    get_devlog_with_mtime(project_path).await
}

/// Append a new entry to the DEVLOG with a timestamp header
#[tauri::command]
pub async fn append_devlog(
    project_path: String,
    content: String,
    expected_mtime: u64,
) -> Result<(), String> {
    let path = Path::new(&project_path);

    // Find existing DEVLOG or create in root
    let devlog_path = find_or_create_devlog_path(path)?;

    // CONFLICT DETECTION: Check mtime before write
    if devlog_path.exists() {
        let current_mtime = get_file_mtime(&devlog_path)?;
        if current_mtime != expected_mtime && expected_mtime != 0 {
            return Err("CONFLICT".to_string());
        }
    }

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
        format!(
            "{}{}\n{}\n\n{}",
            existing,
            separator,
            header,
            content.trim()
        )
    };

    fs::write(&devlog_path, new_content).map_err(|e| format!("Failed to write DEVLOG: {}", e))?;

    Ok(())
}

/// Overwrite the entire DEVLOG file (for edit mode)
#[tauri::command]
pub async fn write_devlog(
    project_path: String,
    content: String,
    expected_mtime: u64,
) -> Result<(), String> {
    let path = Path::new(&project_path);

    // Find existing DEVLOG or create in root
    let devlog_path = find_or_create_devlog_path(path)?;

    // CONFLICT DETECTION: Check mtime before write
    if devlog_path.exists() {
        let current_mtime = get_file_mtime(&devlog_path)?;
        if current_mtime != expected_mtime && expected_mtime != 0 {
            return Err("CONFLICT".to_string());
        }
    }

    fs::write(&devlog_path, content).map_err(|e| format!("Failed to write DEVLOG: {}", e))?;

    Ok(())
}

/// Find existing DEVLOG path or return path for new one in root
fn find_or_create_devlog_path(project_path: &Path) -> Result<PathBuf, String> {
    if let Some(path) = find_devlog_path(project_path) {
        return Ok(path);
    }

    // Create in root if doesn't exist
    let root_path = project_path.join("DEVLOG.md");

    // Ensure parent directory exists (should always be true for root)
    if let Some(parent) = root_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    Ok(root_path)
}

/// Helper to get file modification time
fn get_file_mtime(path: &Path) -> Result<u64, String> {
    let metadata = fs::metadata(path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    let mtime = metadata
        .modified()
        .map_err(|e| format!("Failed to get mtime: {}", e))?
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    Ok(mtime)
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct DevlogCommit {
    pub hash: String,
    pub date: String,
    pub author: String,
    pub message: String,
}

/// Get the commit history of the DEVLOG file
#[tauri::command]
pub async fn get_devlog_history(project_path: String) -> Result<Vec<DevlogCommit>, String> {
    use std::process::Command;

    let path = Path::new(&project_path);
    let devlog_path = find_devlog_path(path).unwrap_or_else(|| path.join("DEVLOG.md"));

    if !devlog_path.exists() {
        return Err("DEVLOG.md not found in project".to_string());
    }

    // Get relative path for git command
    let relative_path = devlog_path
        .strip_prefix(path)
        .map_err(|e| format!("Failed to determine relative path: {}", e))?;

    let output = Command::new("git")
        .current_dir(path)
        .args([
            "log",
            "-n",
            "50",
            "--pretty=format:%H::::%aI::::%an::::%s",
            "--",
        ])
        .arg(relative_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        // Check if it's because it's not a git repo
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("not a git repository") {
            return Err(
                "Failed to retrieve DEVLOG history. Ensure this is a Git repository.".to_string(),
            );
        }
        return Err(format!("Git command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split("::::").collect();
        if parts.len() >= 4 {
            commits.push(DevlogCommit {
                hash: parts[0].to_string(),
                date: parts[1].to_string(),
                author: parts[2].to_string(),
                message: parts[3].chars().take(100).collect(), // Truncate message
            });
        }
    }

    Ok(commits)
}

/// Get the content of the DEVLOG file at a specific commit
#[tauri::command]
pub async fn get_devlog_version(
    project_path: String,
    commit_hash: String,
) -> Result<String, String> {
    use std::process::Command;

    // Validate hash format (simple check)
    if !commit_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid commit hash".to_string());
    }

    let path = Path::new(&project_path);
    let devlog_path = find_devlog_path(path).unwrap_or_else(|| path.join("DEVLOG.md"));

    let relative_path = devlog_path
        .strip_prefix(path)
        .map_err(|e| format!("Failed to determine relative path: {}", e))?;

    let output = Command::new("git")
        .current_dir(path)
        .arg("show")
        .arg(format!("{}:{}", commit_hash, relative_path.display()))
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        return Err("Failed to retrieve version content".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Command;
    use tempfile::TempDir;

    fn create_test_project() -> TempDir {
        tempfile::tempdir().expect("Failed to create temp dir")
    }

    fn init_git_repo(path: &Path) {
        Command::new("git")
            .current_dir(path)
            .arg("init")
            .output()
            .expect("Failed to init git");

        Command::new("git")
            .current_dir(path)
            .args(&["config", "user.email", "test@example.com"])
            .output()
            .expect("Failed to config email");

        Command::new("git")
            .current_dir(path)
            .args(&["config", "user.name", "Test User"])
            .output()
            .expect("Failed to config name");
    }

    #[tokio::test]
    async fn test_get_devlog_with_mtime_empty() {
        let temp = create_test_project();
        let result = get_devlog_with_mtime(temp.path().to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        let data = result.unwrap();
        assert_eq!(data.content, "");
        assert_eq!(data.mtime, 0);
    }

    #[tokio::test]
    async fn test_get_devlog_with_mtime_existing() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "# DEVLOG\n\nTest content").unwrap();

        let result = get_devlog_with_mtime(temp.path().to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        let data = result.unwrap();
        assert!(data.content.contains("Test content"));
        assert!(data.mtime > 0);
    }

    #[tokio::test]
    async fn test_append_devlog_new_file() {
        let temp = create_test_project();
        let project_path = temp.path().to_string_lossy().to_string();

        let result = append_devlog(project_path.clone(), "First entry".to_string(), 0).await;
        assert!(result.is_ok());

        let data = get_devlog_with_mtime(project_path).await.unwrap();
        assert!(data.content.contains("# DEVLOG"));
        assert!(data.content.contains("First entry"));
    }

    #[tokio::test]
    async fn test_append_devlog_conflict() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "Initial content").unwrap();

        let project_path = temp.path().to_string_lossy().to_string();
        let initial_data = get_devlog_with_mtime(project_path.clone()).await.unwrap();

        // Simulate external change (wait a bit to ensure mtime diff if filesystem resolution is low)
        std::thread::sleep(std::time::Duration::from_millis(10));
        fs::write(&devlog_path, "External change").unwrap();

        // Try to append using old mtime
        let result = append_devlog(
            project_path.clone(),
            "My entry".to_string(),
            initial_data.mtime,
        )
        .await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "CONFLICT");
    }

    #[tokio::test]
    async fn test_write_devlog_conflict() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "Initial content").unwrap();

        let project_path = temp.path().to_string_lossy().to_string();
        let initial_data = get_devlog_with_mtime(project_path.clone()).await.unwrap();

        // Simulate external change
        std::thread::sleep(std::time::Duration::from_millis(10));
        fs::write(&devlog_path, "External change").unwrap();

        // Try to write using old mtime
        let result = write_devlog(
            project_path.clone(),
            "My overwrite".to_string(),
            initial_data.mtime,
        )
        .await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "CONFLICT");
    }

    #[tokio::test]
    async fn test_resolve_conflict_reload() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "External content").unwrap();

        let result = resolve_conflict_reload(temp.path().to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().content, "External content");
    }

    #[tokio::test]
    async fn test_get_devlog_history_no_git() {
        let temp = create_test_project();
        let project_path = temp.path().to_string_lossy().to_string();

        let result = get_devlog_history(project_path).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("DEVLOG.md not found"));

        // Create file but no git
        fs::write(temp.path().join("DEVLOG.md"), "content").unwrap();
        let result = get_devlog_history(temp.path().to_string_lossy().to_string()).await;

        // This relies on git command failing appropriately
        // In this test env, git command might just fail completely if not installed, or fail with "not a git repository"
        if let Err(e) = result {
            assert!(
                e.contains("Git command failed") || e.contains("Ensure this is a Git repository")
            );
        }
    }

    #[tokio::test]
    async fn test_get_devlog_history_with_git() {
        let temp = create_test_project();
        let project_path = temp.path().to_string_lossy().to_string();

        init_git_repo(temp.path());

        let devlog_path = temp.path().join("DEVLOG.md");
        fs::write(&devlog_path, "Initial").unwrap();

        Command::new("git")
            .current_dir(temp.path())
            .args(&["add", "DEVLOG.md"])
            .output()
            .expect("Failed to add");

        Command::new("git")
            .current_dir(temp.path())
            .args(&["commit", "-m", "Initial commit"])
            .output()
            .expect("Failed to commit");

        let result = get_devlog_history(project_path).await;
        assert!(result.is_ok());
        let commits = result.unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "Initial commit");
    }
}
