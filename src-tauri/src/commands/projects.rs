use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: Option<i64>,
    pub path: String,
    pub name: String,
    pub r#type: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub is_archived: Option<bool>,
}

/// Response struct for frontend - guarantees id is present
/// Includes transient fields for folder projects (file_count, last_activity)
#[derive(Debug, Clone, Serialize)]
pub struct ProjectResponse {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub r#type: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "isArchived")]
    pub is_archived: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "fileCount")]
    pub file_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "lastActivityAt")]
    pub last_activity: Option<String>,
}

/// Detect if a directory contains a Git repository
pub fn detect_git_repo<P: AsRef<Path>>(path: P) -> bool {
    let git_dir = PathBuf::from(path.as_ref()).join(".git");
    git_dir.exists() && git_dir.is_dir()
}

/// Scan project directory for file count and last activity
/// Returns (file_count, last_activity_timestamp)
/// Excludes: node_modules, target, .git, dist, build, vendor, and hidden files
pub fn scan_project_stats<P: AsRef<Path>>(path: P) -> (u32, Option<String>) {
    use std::time::SystemTime;
    use walkdir::WalkDir;

    let mut file_count: u32 = 0;
    let mut last_modified: Option<SystemTime> = None;

    // Helper to check if entry should be excluded
    fn is_excluded(entry: &walkdir::DirEntry) -> bool {
        let name = entry.file_name().to_string_lossy();

        // Exclude hidden files/directories (starting with .)
        if name.starts_with('.') {
            return true;
        }

        // Exclude common build/dependency directories
        if entry.file_type().is_dir() {
            matches!(
                name.as_ref(),
                "node_modules" | "target" | "dist" | "build" | "vendor"
            )
        } else {
            false
        }
    }

    // Walk directory with exclusions
    for entry in WalkDir::new(path.as_ref())
        .into_iter()
        .filter_entry(|e| !is_excluded(e))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            file_count += 1;

            // Track last modified time
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    match last_modified {
                        None => last_modified = Some(modified),
                        Some(current) if modified > current => last_modified = Some(modified),
                        _ => {}
                    }
                }
            }
        }
    }

    // Convert SystemTime to ISO 8601 string
    let last_activity = last_modified.and_then(|time| {
        time.duration_since(SystemTime::UNIX_EPOCH)
            .ok()
            .map(|duration| {
                let secs = duration.as_secs();
                // Simple ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
                chrono::DateTime::from_timestamp(secs as i64, 0)
                    .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
            })
            .flatten()
    });

    (file_count, last_activity)
}

/// Extract folder name from path
pub fn extract_folder_name<P: AsRef<Path>>(path: P) -> Result<String, String> {
    path.as_ref()
        .file_name()
        .and_then(|name| name.to_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path: cannot extract folder name".to_string())
}

/// Add a new project to the database
/// Returns the newly created Project struct
#[tauri::command]
pub async fn add_project(
    path: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<ProjectResponse, String> {
    // Validate the path exists
    let project_path = PathBuf::from(&path);
    if !project_path.exists() {
        return Err("Path does not exist".to_string());
    }
    if !project_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Detect project type (git or folder)
    let project_type = if detect_git_repo(&project_path) {
        "git"
    } else {
        "folder"
    };

    // Extract folder name
    let name = extract_folder_name(&project_path)?;

    // Get database connection
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    // Insert into database
    conn.execute(
        "INSERT INTO projects (path, name, type) VALUES (?1, ?2, ?3)",
        rusqlite::params![&path, &name, project_type],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            "Project already tracked".to_string()
        } else {
            format!("Failed to insert project: {}", e)
        }
    })?;

    // Get the inserted project ID
    let project_id = conn.last_insert_rowid();

    // Fetch the complete project record and return as ProjectResponse
    let response: ProjectResponse = conn
        .query_row(
            "SELECT id, path, name, type, created_at, updated_at, is_archived FROM projects WHERE id = ?1",
            rusqlite::params![project_id],
            |row| {
                Ok(ProjectResponse {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    r#type: row.get(3)?,
                    created_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                    updated_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                    is_archived: row.get(6)?,
                    file_count: None,
                    last_activity: None,
                })
            },
        )
        .map_err(|e| format!("Failed to fetch inserted project: {}", e))?;

    Ok(response)
}

/// Get all projects from the database
#[tauri::command]
pub async fn get_projects(
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Vec<ProjectResponse>, String> {
    // Fetch all projects from database first (synchronously)
    let mut projects = {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        let mut stmt = conn
            .prepare("SELECT id, path, name, type, created_at, updated_at, is_archived FROM projects ORDER BY updated_at DESC")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let projects_result = stmt
            .query_map([], |row| {
                Ok(ProjectResponse {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    r#type: row.get(3)?,
                    created_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                    updated_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                    is_archived: row.get(6)?,
                    file_count: None,
                    last_activity: None,
                })
            })
            .map_err(|e| format!("Failed to query projects: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect projects: {}", e))?;

        projects_result
    }; // Connection is dropped here

    // For folder projects, scan stats asynchronously
    for project in &mut projects {
        if project.r#type == "folder" {
            let path = project.path.clone();

            // Use spawn_blocking to prevent blocking the async runtime
            let (file_count, last_activity) =
                tokio::task::spawn_blocking(move || scan_project_stats(&path))
                    .await
                    .map_err(|e| format!("Failed to scan project stats: {}", e))?;

            project.file_count = Some(file_count);
            project.last_activity = last_activity;
        }
    }

    Ok(projects)
}

/// Delete a project from the database
#[tauri::command]
pub async fn delete_project(
    project_id: i64,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    conn.execute(
        "DELETE FROM projects WHERE id = ?1",
        rusqlite::params![project_id],
    )
    .map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}

/// Archive a project (sets is_archived = 1)
#[tauri::command]
pub async fn archive_project(
    project_id: i64,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    conn.execute(
        "UPDATE projects SET is_archived = 1 WHERE id = ?1",
        rusqlite::params![project_id],
    )
    .map_err(|e| format!("Failed to archive project: {}", e))?;

    Ok(())
}

/// Restore an archived project (sets is_archived = 0)
#[tauri::command]
pub async fn restore_project(
    project_id: i64,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    conn.execute(
        "UPDATE projects SET is_archived = 0 WHERE id = ?1",
        rusqlite::params![project_id],
    )
    .map_err(|e| format!("Failed to restore project: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_detect_git_repo_with_git() {
        // Create a temporary directory with .git folder
        let temp_dir = std::env::temp_dir().join(format!("test_git_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let git_dir = temp_dir.join(".git");
        fs::create_dir_all(&git_dir).unwrap();

        assert!(detect_git_repo(&temp_dir), "Should detect git repository");

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_detect_git_repo_without_git() {
        // Create a temporary directory without .git folder
        let temp_dir = std::env::temp_dir().join(format!("test_nogit_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        assert!(
            !detect_git_repo(&temp_dir),
            "Should not detect git repository"
        );

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_detect_git_repo_with_git_file() {
        // Create a temporary directory with .git as a file (not a directory)
        let temp_dir = std::env::temp_dir().join(format!("test_gitfile_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let git_file = temp_dir.join(".git");
        fs::write(&git_file, "gitdir: ../other/.git").unwrap();

        assert!(
            !detect_git_repo(&temp_dir),
            "Should not detect git if .git is a file"
        );

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_extract_folder_name() {
        assert_eq!(
            extract_folder_name("/home/user/projects/myproject").unwrap(),
            "myproject"
        );
        assert_eq!(
            extract_folder_name("/tmp/test-folder").unwrap(),
            "test-folder"
        );
        assert_eq!(
            extract_folder_name("relative/path/folder").unwrap(),
            "folder"
        );
    }

    #[test]
    fn test_extract_folder_name_root() {
        // Root path should fail
        let result = extract_folder_name("/");
        assert!(result.is_err());
    }

    #[test]
    fn test_scan_project_stats_empty_folder() {
        // Create empty temporary directory
        let temp_dir = std::env::temp_dir().join(format!("test_scan_empty_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let (file_count, last_activity) = scan_project_stats(&temp_dir);

        assert_eq!(file_count, 0, "Empty folder should have 0 files");
        assert!(
            last_activity.is_none(),
            "Empty folder should have no last activity"
        );

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_project_stats_with_files() {
        // Create temporary directory with some files
        let temp_dir = std::env::temp_dir().join(format!("test_scan_files_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create test files
        fs::write(temp_dir.join("file1.txt"), "content1").unwrap();
        fs::write(temp_dir.join("file2.txt"), "content2").unwrap();
        fs::write(temp_dir.join("file3.md"), "content3").unwrap();

        let (file_count, last_activity) = scan_project_stats(&temp_dir);

        assert_eq!(file_count, 3, "Should count 3 files");
        assert!(last_activity.is_some(), "Should have last activity");

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_project_stats_excludes_hidden() {
        // Create temporary directory with hidden files
        let temp_dir =
            std::env::temp_dir().join(format!("test_scan_hidden_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create visible and hidden files
        fs::write(temp_dir.join("visible.txt"), "content").unwrap();
        fs::write(temp_dir.join(".hidden"), "hidden content").unwrap();

        // Create hidden directory
        let hidden_dir = temp_dir.join(".hidden_dir");
        fs::create_dir_all(&hidden_dir).unwrap();
        fs::write(hidden_dir.join("file.txt"), "content").unwrap();

        let (file_count, _) = scan_project_stats(&temp_dir);

        assert_eq!(file_count, 1, "Should only count visible files, not hidden");

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_project_stats_excludes_node_modules() {
        // Create temporary directory with node_modules
        let temp_dir =
            std::env::temp_dir().join(format!("test_scan_node_modules_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create files in root
        fs::write(temp_dir.join("package.json"), "{}").unwrap();

        // Create node_modules with files
        let node_modules = temp_dir.join("node_modules");
        fs::create_dir_all(&node_modules).unwrap();
        fs::write(node_modules.join("dependency.js"), "code").unwrap();

        let (file_count, _) = scan_project_stats(&temp_dir);

        assert_eq!(file_count, 1, "Should exclude node_modules directory");

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_project_stats_excludes_target() {
        // Create temporary directory with target directory
        let temp_dir =
            std::env::temp_dir().join(format!("test_scan_target_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create files in root
        fs::write(temp_dir.join("Cargo.toml"), "[package]").unwrap();

        // Create target with files
        let target_dir = temp_dir.join("target");
        fs::create_dir_all(&target_dir).unwrap();
        fs::write(target_dir.join("binary"), "binary").unwrap();

        let (file_count, _) = scan_project_stats(&temp_dir);

        assert_eq!(file_count, 1, "Should exclude target directory");

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_project_stats_nonexistent_path() {
        // Test with non-existent path (should handle gracefully)
        let nonexistent = std::env::temp_dir().join(format!("nonexistent_{}", std::process::id()));

        let (file_count, last_activity) = scan_project_stats(&nonexistent);

        assert_eq!(file_count, 0, "Nonexistent path should return 0 files");
        assert!(
            last_activity.is_none(),
            "Nonexistent path should have no last activity"
        );
    }
}
