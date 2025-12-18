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
}

/// Response struct for frontend - guarantees id is present
#[derive(Debug, Clone, Serialize)]
pub struct ProjectResponse {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub r#type: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Detect if a directory contains a Git repository
pub fn detect_git_repo<P: AsRef<Path>>(path: P) -> bool {
    let git_dir = PathBuf::from(path.as_ref()).join(".git");
    git_dir.exists() && git_dir.is_dir()
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
            "SELECT id, path, name, type, created_at, updated_at FROM projects WHERE id = ?1",
            rusqlite::params![project_id],
            |row| {
                Ok(ProjectResponse {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    r#type: row.get(3)?,
                    created_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                    updated_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
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
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, path, name, type, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let projects = stmt
        .query_map([], |row| {
            Ok(ProjectResponse {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                r#type: row.get(3)?,
                created_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                updated_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            })
        })
        .map_err(|e| format!("Failed to query projects: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect projects: {}", e))?;

    Ok(projects)
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
}
