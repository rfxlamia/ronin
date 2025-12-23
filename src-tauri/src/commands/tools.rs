use crate::commands::git::{get_git_history, get_git_status, GitCommit, GitStatus};
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

// Validation helper
fn validate_tool_path(
    pool: &DbPool,
    project_path: &str,
    requested_path: &str,
) -> Result<PathBuf, String> {
    // 1. FIRST: Verify project exists in tracked projects database
    let conn = pool.get().map_err(|e| format!("Database error: {}", e))?;
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE path = ?1",
            [project_path],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if exists == 0 {
        return Err("Project not tracked. Only tracked projects can be accessed.".to_string());
    }

    // 2. THEN: Resolve paths to canonical form
    let project_canonical =
        fs::canonicalize(project_path).map_err(|_| "Project path does not exist".to_string())?;

    let full_path = project_canonical.join(requested_path);
    // canonicalize resolves symlinks equivalent to realpath
    let requested_canonical =
        fs::canonicalize(&full_path).map_err(|_| format!("Path not found: {}", requested_path))?;

    // 3. Check path doesn't escape project directory
    if !requested_canonical.starts_with(&project_canonical) {
        return Err("Invalid path: Attempts to escape project directory".to_string());
    }

    // 4. Check for symlink attacks (double check)
    // If canonical path is within project, and we used canonicalize(), we are safe from symlinks pointing OUT.
    // However, if the symlink ITSELF is inside, but points OUT, canonicalize() reveals that.
    // So the check above covers it.

    // 5. Reject system directory access (belt-and-suspenders, though implicit in starts_with logic unless project IS strict subset of system)
    let system_dirs = ["/etc", "/sys", "/proc", "/dev", "/root"];
    for sys_dir in &system_dirs {
        // Only check if canonical path strictly starts with system dir
        // (path_buf.starts_with handles component boundary correctly)
        if requested_canonical.starts_with(Path::new(sys_dir)) {
            return Err(format!(
                "Access denied: Cannot access system directory {}",
                sys_dir
            ));
        }
    }

    Ok(requested_canonical)
}

#[tauri::command]
pub async fn read_file(
    db: State<'_, DbPool>,
    project_path: String,
    file_path: String,
) -> Result<String, String> {
    read_file_impl(&db, &project_path, &file_path)
}

fn read_file_impl(pool: &DbPool, project_path: &str, file_path: &str) -> Result<String, String> {
    // Validate path first
    let path = validate_tool_path(pool, project_path, file_path)?;

    // Read file content
    let metadata =
        fs::metadata(&path).map_err(|e| format!("Failed to get file metadata: {}", e))?;

    // Enforce size limit (e.g., 1MB)
    const MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB
    if metadata.len() > MAX_FILE_SIZE {
        return Err("File too large (max 1MB)".to_string());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Check for null bytes to reject binary files
    if content.contains('\0') {
        return Err("File is binary (contains null bytes), cannot read as text".to_string());
    }

    Ok(content)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    name: String,
    path: String, // Relative to project root
    is_dir: bool,
    size: u64,
    modified: i64,
}

#[tauri::command]
pub async fn list_dir(
    db: State<'_, DbPool>,
    project_path: String,
    dir_path: String,
) -> Result<Vec<FileEntry>, String> {
    list_dir_impl(&db, &project_path, &dir_path)
}

fn list_dir_impl(
    pool: &DbPool,
    project_path: &str,
    dir_path: &str,
) -> Result<Vec<FileEntry>, String> {
    // Validate path first
    let path = validate_tool_path(pool, project_path, dir_path)?;

    let mut entries = Vec::new();
    let dir_entries =
        fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in dir_entries {
        let entry = entry.map_err(|e| format!("Entry error: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Metadata error: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Filter hidden files
        if file_name.starts_with('.') {
            continue;
        }

        let is_dir = metadata.is_dir();
        // size: directories usually 4096, but we can just use len() or 0
        let size = metadata.len();

        let modified = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64
            })
            .unwrap_or(0);

        // Path relative to project root
        // project_path + dir_path + file_name
        // Use PathBuf to join correctly
        let relative_path = Path::new(dir_path)
            .join(&file_name)
            .to_string_lossy()
            .to_string();

        entries.push(FileEntry {
            name: file_name,
            path: relative_path,
            is_dir,
            size,
            modified,
        });
    }

    // Sort: directories first (alphabetical), then files (alphabetical)
    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            return b.is_dir.cmp(&a.is_dir); // true (dir) > false (file)
        }
        a.name.cmp(&b.name)
    });

    Ok(entries)
}

#[tauri::command]
pub async fn git_status(db: State<'_, DbPool>, project_path: String) -> Result<GitStatus, String> {
    // Validate key project path. We pass "." as requested path to get the project root.
    let valid_path = validate_tool_path(&db, &project_path, ".")?;
    get_git_status(valid_path.to_string_lossy().to_string()).await
}

#[tauri::command]
pub async fn git_log(
    db: State<'_, DbPool>,
    project_path: String,
    limit: Option<usize>,
) -> Result<Vec<GitCommit>, String> {
    let valid_path = validate_tool_path(&db, &project_path, ".")?;
    get_git_history(valid_path.to_string_lossy().to_string(), limit).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use r2d2_sqlite::SqliteConnectionManager;
    use std::fs::File;
    use std::io::Write;
    use std::process::Command;
    use std::time::Duration;

    // Helper to create test DB (copied/adapted from db.rs for standalone testing)
    fn create_test_db() -> (PathBuf, DbPool) {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_tools_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        fs::create_dir_all(&test_dir).unwrap();
        let db_path = test_dir.join("test.db");

        let manager = SqliteConnectionManager::file(&db_path);
        let pool = r2d2::Pool::builder().max_size(1).build(manager).unwrap();

        // Init tables
        let conn = pool.get().unwrap();
        conn.execute(
            "CREATE TABLE projects (
                id INTEGER PRIMARY KEY, 
                path TEXT UNIQUE NOT NULL, 
                name TEXT NOT NULL, 
                type TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        (test_dir, pool)
    }

    // Helper to setup git repo
    fn setup_git_repo(path: &Path) {
        Command::new("git")
            .args(["init"])
            .current_dir(path)
            .output()
            .unwrap();
        Command::new("git")
            .args(["config", "user.name", "Test"])
            .current_dir(path)
            .output()
            .unwrap();
        Command::new("git")
            .args(["config", "user.email", "test@test.com"])
            .current_dir(path)
            .output()
            .unwrap();
    }

    #[tokio::test]
    async fn test_git_status_dirty() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("git_project");
        fs::create_dir(&project_path).unwrap();
        setup_git_repo(&project_path);

        // Add file
        File::create(project_path.join("test.txt")).unwrap();

        // Canonicalize key for DB
        let project_key = project_path
            .canonicalize()
            .unwrap()
            .to_string_lossy()
            .to_string();

        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_key.as_str()],
            )
            .unwrap();
        }

        // We can replicate logic since we can't easily create tauri::State in unit test
        let valid_path = validate_tool_path(&pool, &project_key, ".").unwrap();
        let status = get_git_status(valid_path.to_string_lossy().to_string())
            .await
            .unwrap();

        assert!(!status.is_clean);
        assert!(!status.modified_files.is_empty());

        fs::remove_dir_all(test_dir).ok();
    }

    #[tokio::test]
    async fn test_git_log() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("git_log_project");
        fs::create_dir(&project_path).unwrap();
        setup_git_repo(&project_path);

        // Commit 1
        File::create(project_path.join("a.txt")).unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(&project_path)
            .output()
            .unwrap();
        Command::new("git")
            .args(["commit", "-m", "Commit 1"])
            .current_dir(&project_path)
            .output()
            .unwrap();

        // Commit 2
        File::create(project_path.join("b.txt")).unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(&project_path)
            .output()
            .unwrap();
        Command::new("git")
            .args(["commit", "-m", "Commit 2"])
            .current_dir(&project_path)
            .output()
            .unwrap();

        let project_key = project_path
            .canonicalize()
            .unwrap()
            .to_string_lossy()
            .to_string();
        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_key.as_str()],
            )
            .unwrap();
        }

        let valid_path = validate_tool_path(&pool, &project_key, ".").unwrap();
        let logs = get_git_history(valid_path.to_string_lossy().to_string(), Some(10))
            .await
            .unwrap();

        assert!(logs.len() >= 2);
        assert_eq!(logs[0].message, "Commit 2");
        assert_eq!(logs[1].message, "Commit 1");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_list_dir_sorting() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("list_project");
        fs::create_dir(&project_path).unwrap();

        let project_path_canonical = project_path.canonicalize().unwrap();
        let project_path_str = project_path_canonical.to_str().unwrap();

        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_path_str],
            )
            .unwrap();
        }

        // Create structure:
        // - src/ (dir)
        // - docs/ (dir)
        // - README.md (file)
        // - .hidden (file - should be ignored)
        // - z_data.json (file)

        fs::create_dir(project_path.join("src")).unwrap();
        fs::create_dir(project_path.join("docs")).unwrap();
        File::create(project_path.join("README.md")).unwrap();
        File::create(project_path.join(".hidden")).unwrap();
        File::create(project_path.join("z_data.json")).unwrap();

        let entries = list_dir_impl(&pool, project_path_str, ".").unwrap();

        // Expected order: docs, src, README.md, z_data.json
        // (dirs sorted alphabetically, then files sorted alphabetically)

        assert_eq!(entries.len(), 4, "Should have 4 visible entries");

        assert_eq!(entries[0].name, "docs");
        assert!(entries[0].is_dir);

        assert_eq!(entries[1].name, "src");
        assert!(entries[1].is_dir);

        assert_eq!(entries[2].name, "README.md");
        assert!(!entries[2].is_dir);

        assert_eq!(entries[3].name, "z_data.json");
        assert!(!entries[3].is_dir);

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_read_file_success() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("read_project");
        fs::create_dir(&project_path).unwrap();

        // Canonicalize setup
        let project_path_canonical = project_path.canonicalize().unwrap();
        let project_path_str = project_path_canonical.to_str().unwrap();

        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_path_str],
            )
            .unwrap();
        }

        let file_path = project_path_canonical.join("hello.txt");
        let mut f = File::create(&file_path).unwrap();
        f.write_all(b"Hello World").unwrap();

        let content = read_file_impl(&pool, project_path_str, "hello.txt");
        assert!(content.is_ok());
        assert_eq!(content.unwrap(), "Hello World");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_read_file_binary_rejection() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("bin_project");
        fs::create_dir(&project_path).unwrap();

        let project_path_canonical = project_path.canonicalize().unwrap();
        let project_path_str = project_path_canonical.to_str().unwrap();

        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_path_str],
            )
            .unwrap();
        }

        let file_path = project_path_canonical.join("image.png");
        let mut f = File::create(&file_path).unwrap();
        // Zero byte is typically considered binary
        f.write_all(b"Hello \0 World").unwrap();

        let content = read_file_impl(&pool, project_path_str, "image.png");
        assert!(content.is_err());
        assert_eq!(
            content.unwrap_err(),
            "File is binary (contains null bytes), cannot read as text"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_read_file_size_limit() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("size_project");
        fs::create_dir(&project_path).unwrap();

        let project_path_canonical = project_path.canonicalize().unwrap();
        let project_path_str = project_path_canonical.to_str().unwrap();

        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_path_str],
            )
            .unwrap();
        }

        let file_path = project_path_canonical.join("large.txt");
        let f = File::create(&file_path).unwrap();
        f.set_len(1024 * 1024 + 1).unwrap(); // 1MB + 1 byte

        let content = read_file_impl(&pool, project_path_str, "large.txt");
        assert!(content.is_err());
        assert_eq!(content.unwrap_err(), "File too large (max 1MB)");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_validate_path_traversal() {
        let (test_dir, pool) = create_test_db();
        // Setup project
        let project_path = test_dir.join("my_project");
        fs::create_dir(&project_path).unwrap();
        let project_path_str = project_path.to_str().unwrap();

        // Register project in DB
        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_path_str],
            )
            .unwrap();
        } // Drop conn

        // Create a file OUTSIDE the project but inside test_dir
        let secret_file = test_dir.join("secret.txt");
        File::create(&secret_file).unwrap();

        // Attempt traversal to that file
        let result = validate_tool_path(&pool, project_path_str, "../secret.txt");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid path: Attempts to escape project directory"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_validate_valid_path() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("valid_project");
        fs::create_dir(&project_path).unwrap();
        let file_path = project_path.join("README.md");
        File::create(&file_path).unwrap();

        // Need to canonicalize to match what DB and validator expect (or ensure consistent usage)
        let project_path_canonical = project_path.canonicalize().unwrap();
        let project_path_str = project_path_canonical.to_str().unwrap();

        {
            let conn = pool.get().unwrap();
            conn.execute(
                "INSERT INTO projects (path, name, type) VALUES (?1, 'Project', 'git')",
                [project_path_str],
            )
            .unwrap();
        } // Drop conn

        let result = validate_tool_path(&pool, project_path_str, "README.md");
        assert!(result.is_ok());
        // result should be the full canonical path to README.md
        let expected = project_path_canonical.join("README.md");
        assert_eq!(result.unwrap(), expected);

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_validate_untracked_project() {
        let (test_dir, pool) = create_test_db();
        let project_path = test_dir.join("untracked");
        fs::create_dir(&project_path).unwrap();

        // Do NOT insert into DB

        let result = validate_tool_path(&pool, project_path.to_str().unwrap(), ".");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Project not tracked"));

        fs::remove_dir_all(test_dir).ok();
    }
}
