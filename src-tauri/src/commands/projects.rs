use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: Option<i64>,
    pub path: String,
    pub name: String,
    pub r#type: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub is_archived: Option<bool>,
    pub deleted_at: Option<String>,
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
    #[serde(skip_serializing_if = "Option::is_none", rename = "deletedAt")]
    pub deleted_at: Option<String>,
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
            .and_then(|duration| {
                let secs = duration.as_secs();
                // Simple ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
                chrono::DateTime::from_timestamp(secs as i64, 0)
                    .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
            })
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
/// If a soft-deleted project exists with the same path, restore it instead
/// Returns the newly created or restored Project struct
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
        .map_err(|_| "Unable to access application data".to_string())?;

    // Check if a soft-deleted project exists with this path
    let existing_deleted: Option<i64> = conn
        .query_row(
            "SELECT id FROM projects WHERE path = ?1 AND deleted_at IS NOT NULL",
            rusqlite::params![&path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to check for existing project: {}", e))?;

    let project_id = if let Some(id) = existing_deleted {
        // Restore the soft-deleted project
        conn.execute(
            "UPDATE projects SET deleted_at = NULL, name = ?1, type = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            rusqlite::params![&name, project_type, id],
        )
        .map_err(|e| format!("Failed to restore project: {}", e))?;
        id
    } else {
        // Insert new project
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
        conn.last_insert_rowid()
    };

    // Fetch the complete project record and return as ProjectResponse
    let response: ProjectResponse = conn
        .query_row(
            "SELECT id, path, name, type, created_at, updated_at, is_archived, deleted_at FROM projects WHERE id = ?1",
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
                    deleted_at: row.get(7)?,
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
            .map_err(|_| "Unable to access application data".to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, path, name, type, created_at, updated_at, is_archived, deleted_at FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC")
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
                    deleted_at: row.get(7)?,
                    file_count: None,
                    last_activity: None,
                })
            })
            .map_err(|e| format!("Failed to query projects: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect projects: {}", e))?;

        projects_result
    }; // Connection is dropped here

    // Scan stats for folder projects only (for performance)
    // Git projects will use git commit history once Task 2.2 (git integration) is complete
    for project in &mut projects {
        if project.r#type == "git" {
            // Get last commit date for Git projects (lightweight - no full history scan)
            let path = project.path.clone();
            let last_activity = tokio::task::spawn_blocking(move || {
                crate::commands::git::get_last_commit_date(&path)
            })
            .await
            .ok()
            .flatten();
            project.last_activity = last_activity;
        } else if project.r#type == "folder" {
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
        .map_err(|_| "Unable to access application data".to_string())?;

    conn.execute(
        "DELETE FROM projects WHERE id = ?1",
        rusqlite::params![project_id],
    )
    .map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}

/// Soft delete a project by setting deleted_at timestamp
#[tauri::command]
pub async fn remove_project(
    project_id: i64,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    conn.execute(
        "UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1",
        rusqlite::params![project_id],
    )
    .map_err(|e| format!("Failed to remove project: {}", e))?;

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
        .map_err(|_| "Unable to access application data".to_string())?;

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
        .map_err(|_| "Unable to access application data".to_string())?;

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
    use rusqlite::OptionalExtension;
    use std::fs;

    /// Helper to create a database pool for testing
    fn create_test_db() -> (std::path::PathBuf, crate::db::DbPool) {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_projects_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        fs::create_dir_all(&test_dir).unwrap();
        let db_path = test_dir.join("test.db");

        let manager = r2d2_sqlite::SqliteConnectionManager::file(&db_path).with_init(|conn| {
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA foreign_keys=ON;",
            )
        });

        let pool = r2d2::Pool::builder()
            .max_size(10)
            .connection_timeout(std::time::Duration::from_secs(5))
            .build(manager)
            .unwrap();

        // Run migrations to create projects table
        let mut conn = pool.get().unwrap();
        crate::db::run_migrations(&mut conn).unwrap();

        (test_dir, pool)
    }

    #[tokio::test]
    async fn test_remove_project_sets_deleted_at() {
        let (test_dir, pool) = create_test_db();

        // Add a project first (manually using direct SQL for testing purposes)
        let conn = pool.get().unwrap();
        let project_path = "/test/remove-project-path";
        let project_name = "Test Remove Project";
        let project_type = "folder"; // Use folder type for testing

        conn.execute(
            "INSERT INTO projects (path, name, type) VALUES (?1, ?2, ?3)",
            rusqlite::params![project_path, project_name, project_type],
        )
        .unwrap();

        let project_id = conn.last_insert_rowid();

        // Verify project was added
        let project_before: Project = conn
            .query_row(
                "SELECT id, path, name, type, created_at, updated_at, is_archived, deleted_at FROM projects WHERE id = ?1",
                rusqlite::params![project_id],
                |row| {
                    Ok(Project {
                        id: Some(row.get(0)?),
                        path: row.get(1)?,
                        name: row.get(2)?,
                        r#type: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                        is_archived: row.get(6)?,
                        deleted_at: row.get(7)?,
                    })
                }
            )
            .unwrap();

        assert_eq!(project_before.name, project_name);

        // Test the remove_project function using the pool directly
        conn.execute(
            "UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1",
            rusqlite::params![project_before.id.unwrap()],
        )
        .unwrap();

        // Verify project is no longer returned by get_projects query (soft deleted)
        let count_query: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL AND id = ?1",
                rusqlite::params![project_before.id.unwrap()],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count_query, 0); // No project should be found in the filtered query

        // Verify project still exists in DB with deleted_at set by querying directly
        let deleted_project: Option<String> = conn
            .query_row(
                "SELECT deleted_at FROM projects WHERE id = ?1",
                rusqlite::params![project_before.id.unwrap()],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert!(deleted_project.is_some());
        assert!(!deleted_project.unwrap().is_empty()); // Should have a timestamp

        fs::remove_dir_all(test_dir).ok();
    }

    #[tokio::test]
    async fn test_get_projects_filters_out_deleted_projects() {
        let (test_dir, pool) = create_test_db();

        // Add two projects manually
        let conn = pool.get().unwrap();

        // Add first project
        conn.execute(
            "INSERT INTO projects (path, name, type) VALUES (?1, ?2, ?3)",
            rusqlite::params!["/test/path1", "Project 1", "folder"],
        )
        .unwrap();
        let project1_id = conn.last_insert_rowid();

        // Add second project
        conn.execute(
            "INSERT INTO projects (path, name, type) VALUES (?1, ?2, ?3)",
            rusqlite::params!["/test/path2", "Project 2", "folder"],
        )
        .unwrap();
        let project2_id = conn.last_insert_rowid();

        // Verify both projects are present when querying directly
        let count_before: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count_before, 2);

        // Test that get_projects returns both projects (before deletion)
        let projects_before: Vec<Project> = conn
            .prepare("SELECT id, path, name, type, created_at, updated_at, is_archived, deleted_at FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC")
            .unwrap()
            .query_map([], |row| {
                Ok(Project {
                    id: Some(row.get(0)?),
                    path: row.get(1)?,
                    name: row.get(2)?,
                    r#type: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    is_archived: row.get(6)?,
                    deleted_at: row.get(7)?,
                })
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(projects_before.len(), 2);

        // Remove the first project by setting deleted_at (test the remove functionality)
        conn.execute(
            "UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1",
            rusqlite::params![project1_id],
        )
        .unwrap();

        // Verify only one project is returned by get_projects query (the other is soft deleted)
        let projects_after: Vec<Project> = conn
            .prepare("SELECT id, path, name, type, created_at, updated_at, is_archived, deleted_at FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC")
            .unwrap()
            .query_map([], |row| {
                Ok(Project {
                    id: Some(row.get(0)?),
                    path: row.get(1)?,
                    name: row.get(2)?,
                    r#type: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    is_archived: row.get(6)?,
                    deleted_at: row.get(7)?,
                })
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(projects_after.len(), 1);
        assert_eq!(projects_after[0].id.unwrap(), project2_id);

        fs::remove_dir_all(test_dir).ok();
    }

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

/// Structure to represent a scanned project candidate
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ScannedProject {
    pub path: String,
    pub name: String,
}

/// Scan common project locations for Git repositories
#[tauri::command]
pub async fn scan_projects<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ScannedProject>, String> {
    use tokio::task;
    use walkdir::WalkDir;

    // Use Tauri v2 standard to get home directory
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    // Common project locations - include both cases and variations
    let scan_paths = [
        // Standard variations (case-sensitive on Linux)
        home_dir.join("Projects"),
        home_dir.join("projects"),
        home_dir.join("project"), // User's preference
        home_dir.join("Code"),
        home_dir.join("code"),
        home_dir.join("Dev"),
        home_dir.join("dev"),
        home_dir.join("Repos"),
        home_dir.join("repos"),
        home_dir.join("src"),       // Common for Rust/Go devs
        home_dir.join("workspace"), // Common for Java/IDE users
        home_dir.join("work"),
        home_dir.join("git"),
        home_dir.join(".local").join("share"),
    ];

    // Use spawn_blocking to run the synchronous walkdir operations
    task::spawn_blocking(move || {
        let mut projects = Vec::new();

        for scan_path in scan_paths {
            if !scan_path.exists() {
                continue;
            }

            // Walk the directory tree with depth limit of 3
            for entry in WalkDir::new(&scan_path)
                .max_depth(3)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_dir())
            {
                let path = entry.path();

                // Check if this directory contains a .git folder
                if path.join(".git").exists() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        projects.push(ScannedProject {
                            path: path.to_string_lossy().to_string(),
                            name: name.to_string(),
                        });
                    }
                }
            }
        }

        Ok(projects)
    })
    .await
    .map_err(|e| format!("Failed to complete scan: {}", e))?
}

#[cfg(test)]
mod scan_tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_scanned_project_structure() {
        let project = ScannedProject {
            path: "/test/path".to_string(),
            name: "test-project".to_string(),
        };

        assert_eq!(project.path, "/test/path");
        assert_eq!(project.name, "test-project");
    }

    #[test]
    fn test_scan_empty_directories() {
        // Create temporary directory structure
        let temp_dir = std::env::temp_dir().join(format!("test_scan_empty_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create test directories without .git
        let projects_dir = temp_dir.join("Projects");
        fs::create_dir_all(&projects_dir).unwrap();

        let project1_dir = projects_dir.join("project1");
        fs::create_dir_all(&project1_dir).unwrap();

        // Mock the app handle with a temporary home directory
        // Note: This is a simplified test that doesn't use the real Tauri app handle
        // For a full integration test, we'd need to set up a Tauri app context
        let scan_result = std::thread::spawn(move || {
            // Simulate the scanning logic directly
            use walkdir::WalkDir;

            let mut projects = Vec::new();
            let scan_paths = [projects_dir.clone()];

            for scan_path in scan_paths {
                if !scan_path.exists() {
                    continue;
                }

                // Walk the directory tree with depth limit of 3
                for entry in WalkDir::new(&scan_path)
                    .max_depth(3)
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.file_type().is_dir())
                {
                    let path = entry.path();

                    // Check if this directory contains a .git folder
                    if path.join(".git").exists() {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            projects.push(ScannedProject {
                                path: path.to_string_lossy().to_string(),
                                name: name.to_string(),
                            });
                        }
                    }
                }
            }

            projects
        })
        .join()
        .unwrap();

        // Should find no projects since none have .git directories
        assert_eq!(scan_result.len(), 0);

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_with_git_directories() {
        // Create temporary directory structure
        let temp_dir = std::env::temp_dir().join(format!("test_scan_git_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create test directories with .git
        let projects_dir = temp_dir.join("Projects");
        fs::create_dir_all(&projects_dir).unwrap();

        let project1_dir = projects_dir.join("project1");
        fs::create_dir_all(&project1_dir).unwrap();
        let git_dir1 = project1_dir.join(".git");
        fs::create_dir_all(&git_dir1).unwrap();

        let project2_dir = projects_dir.join("project2");
        fs::create_dir_all(&project2_dir).unwrap();
        let git_dir2 = project2_dir.join(".git");
        fs::create_dir_all(&git_dir2).unwrap();

        // Mock the app handle with a temporary home directory
        let scan_result = std::thread::spawn(move || {
            // Simulate the scanning logic directly
            use walkdir::WalkDir;

            let mut projects = Vec::new();
            let scan_paths = [projects_dir.clone()];

            for scan_path in scan_paths {
                if !scan_path.exists() {
                    continue;
                }

                // Walk the directory tree with depth limit of 3
                for entry in WalkDir::new(&scan_path)
                    .max_depth(3)
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.file_type().is_dir())
                {
                    let path = entry.path();

                    // Check if this directory contains a .git folder
                    if path.join(".git").exists() {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            projects.push(ScannedProject {
                                path: path.to_string_lossy().to_string(),
                                name: name.to_string(),
                            });
                        }
                    }
                }
            }

            projects
        })
        .join()
        .unwrap();

        // Should find 2 projects
        assert_eq!(scan_result.len(), 2);
        assert!(scan_result.iter().any(|p| p.name == "project1"));
        assert!(scan_result.iter().any(|p| p.name == "project2"));

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }

    #[test]
    fn test_scan_depth_limit() {
        // Create temporary directory structure with nested git repos
        let temp_dir = std::env::temp_dir().join(format!("test_scan_depth_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create nested directory structure: Projects/deep/nested/repo
        // Depth:                   0     1     2      3    <- .git folder is at depth 3
        let projects_dir = temp_dir.join("Projects");
        fs::create_dir_all(&projects_dir).unwrap();

        let deep_dir = projects_dir
            .join("deep")
            .join("nested")
            .join("very")
            .join("deep");
        fs::create_dir_all(&deep_dir).unwrap();

        let repo_dir = deep_dir.join("repo");
        fs::create_dir_all(&repo_dir).unwrap();
        let git_dir = repo_dir.join(".git");
        fs::create_dir_all(&git_dir).unwrap();

        // Mock the app handle with a temporary home directory
        let scan_result = std::thread::spawn(move || {
            // Simulate the scanning logic directly
            use walkdir::WalkDir;

            let mut projects = Vec::new();
            let scan_paths = [projects_dir.clone()];

            for scan_path in scan_paths {
                if !scan_path.exists() {
                    continue;
                }

                // Walk the directory tree with depth limit of 3
                for entry in WalkDir::new(&scan_path)
                    .max_depth(3) // This should limit us to depth 3 (Projects/deep/nested/very) but not find repo inside deeper
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.file_type().is_dir())
                {
                    let path = entry.path();

                    // Check if this directory contains a .git folder
                    if path.join(".git").exists() {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            projects.push(ScannedProject {
                                path: path.to_string_lossy().to_string(),
                                name: name.to_string(),
                            });
                        }
                    }
                }
            }

            projects
        })
        .join()
        .unwrap();

        // Should find 0 projects because the git repo is at depth 5 (Projects/deep/nested/very/deep/repo/.git)
        // which exceeds our max_depth of 3
        assert_eq!(scan_result.len(), 0);

        // Cleanup
        fs::remove_dir_all(temp_dir).ok();
    }
}
