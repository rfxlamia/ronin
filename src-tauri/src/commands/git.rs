/// Git commands for repository operations using git2
///
/// Provides get_git_history and other git-related operations
use git2::{Oid, Repository};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    pub sha: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

/// Get git commit history for a repository
#[tauri::command]
pub async fn get_git_history(path: String, limit: Option<usize>) -> Result<Vec<GitCommit>, String> {
    // Default to 20 commits if not specified
    let max_commits = limit.unwrap_or(20);

    // Try to open repository
    let repo = Repository::open(&path)
        .map_err(|e| format!("Not a git repository or failed to open: {}", e))?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;

    // Start from HEAD
    revwalk
        .push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;

    let mut commits = Vec::new();

    for (idx, oid_result) in revwalk.enumerate() {
        if idx >= max_commits {
            break;
        }

        let oid: Oid = oid_result.map_err(|e| format!("Failed to get commit OID: {}", e))?;

        let commit = repo
            .find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;

        let author = commit.author();
        let time = commit.time();

        // Convert git time to ISO 8601 string
        let datetime = chrono::DateTime::<chrono::Utc>::from_timestamp(time.seconds(), 0)
            .ok_or_else(|| "Invalid timestamp".to_string())?;

        commits.push(GitCommit {
            sha: oid.to_string(),
            author: author.name().unwrap_or("Unknown").to_string(),
            date: datetime.to_rfc3339(),
            message: commit.message().unwrap_or("").trim().to_string(),
        });
    }

    Ok(commits)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_git_history_invalid_path() {
        let result = get_git_history("/nonexistent/path".to_string(), None).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Not a git repository"));
    }

    #[tokio::test]
    async fn test_get_git_history_limit() {
        // This test requires a valid git repo
        // We'll test with the current project if available
        let current_dir = std::env::current_dir().unwrap();
        let project_root = current_dir
            .parent()
            .and_then(|p| p.parent())
            .unwrap_or(&current_dir);

        if let Ok(commits) =
            get_git_history(project_root.to_string_lossy().to_string(), Some(5)).await
        {
            assert!(commits.len() <= 5, "Should respect limit");

            // Verify commit structure
            if let Some(first_commit) = commits.first() {
                assert!(!first_commit.sha.is_empty(), "SHA should not be empty");
                assert!(
                    !first_commit.author.is_empty(),
                    "Author should not be empty"
                );
                assert!(!first_commit.date.is_empty(), "Date should not be empty");
            }
        }
    }
}
