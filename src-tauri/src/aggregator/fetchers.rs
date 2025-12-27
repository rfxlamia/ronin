/// Data fetchers for context aggregation
///
/// Fetches data from Git, DEVLOG, and behavior tracking sources
use super::types::{CommitSummary, FileEvent, GitContextData, ObserverEvent};
use crate::commands::git;
use crate::db::DbPool;
use crate::error::RoninError;
use std::path::Path;

/// Fetch Git context data (branch, commits, status)
pub async fn fetch_git_context(project_path: &Path) -> Result<GitContextData, RoninError> {
    let path_str = project_path.to_string_lossy().to_string();

    // Get branch name
    let branch = git::get_git_branch(path_str.clone())
        .await
        .unwrap_or_else(|_| "unknown".to_string());

    // Get status for uncommitted files count
    let status = git::get_git_status(path_str.clone()).await.ok();
    let uncommitted = status.as_ref().map(|s| s.uncommitted_files).unwrap_or(0);

    // Get last commit message
    let last_commit = git::get_git_history(path_str.clone(), Some(1))
        .await
        .ok()
        .and_then(|commits| commits.first().map(|c| c.message.clone()));

    // Get recent commits (last 5)
    let recent_commits = git::get_git_history(path_str, Some(5))
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|c| CommitSummary {
            message: c.message,
            timestamp: c.date,
            files: c.files,
        })
        .collect();

    Ok(GitContextData {
        branch,
        uncommitted: uncommitted as usize,
        last_commit,
        recent_commits,
    })
}

/// Fetch DEVLOG context (last 500 lines)
pub fn fetch_devlog_context(project_path: &Path) -> Option<String> {
    let devlog_path = project_path.join("DEVLOG.md");

    if !devlog_path.exists() {
        return None;
    }

    match std::fs::read_to_string(&devlog_path) {
        Ok(content) => {
            let lines: Vec<&str> = content.lines().collect();
            let start_index = if lines.len() > 500 {
                lines.len() - 500
            } else {
                0
            };
            Some(lines[start_index..].join("\n"))
        }
        Err(_) => None,
    }
}

/// Fetch behavior context from observer_events table
/// Returns (window_events, file_events)
pub fn fetch_behavior_context(
    project_id: i64,
    duration_hours: i64,
    db_pool: &DbPool,
) -> Result<(Vec<ObserverEvent>, Vec<FileEvent>), RoninError> {
    let conn = db_pool
        .get()
        .map_err(|e| RoninError::Database(format!("Failed to get DB connection: {}", e)))?;

    let cutoff_time = chrono::Utc::now().timestamp_millis() - (duration_hours * 60 * 60 * 1000);

    // Query window focus events
    let mut stmt = conn
        .prepare(
            "SELECT timestamp, event_type, window_title, process_name, file_path 
             FROM observer_events 
             WHERE project_id = ?1 AND timestamp > ?2 
             ORDER BY timestamp ASC",
        )
        .map_err(|e| RoninError::Database(format!("Failed to prepare query: {}", e)))?;

    let events = stmt
        .query_map(rusqlite::params![project_id, cutoff_time], |row| {
            Ok(ObserverEvent {
                timestamp: row.get(0)?,
                event_type: row.get(1)?,
                window_title: row.get(2)?,
                process_name: row.get(3)?,
                file_path: row.get(4)?,
            })
        })
        .map_err(|e| RoninError::Database(format!("Query failed: {}", e)))?
        .filter_map(Result::ok)
        .collect::<Vec<_>>();

    // Separate file events from window events
    let file_events: Vec<FileEvent> = events
        .iter()
        .filter_map(|e| {
            e.file_path.as_ref().map(|path| FileEvent {
                timestamp: e.timestamp,
                file_path: path.clone(),
            })
        })
        .collect();

    Ok((events, file_events))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_fetch_git_context_non_git_repo() {
        let temp_dir = TempDir::new().unwrap();
        let result = fetch_git_context(temp_dir.path()).await;

        // Should handle non-git repos gracefully
        assert!(result.is_ok());
        let ctx = result.unwrap();
        assert_eq!(ctx.branch, "unknown");
    }

    #[test]
    fn test_fetch_devlog_context_missing() {
        let temp_dir = TempDir::new().unwrap();
        let result = fetch_devlog_context(temp_dir.path());
        assert!(result.is_none());
    }

    #[test]
    fn test_fetch_devlog_context_exists() {
        let temp_dir = TempDir::new().unwrap();
        let devlog_path = temp_dir.path().join("DEVLOG.md");
        fs::write(&devlog_path, "# DEVLOG\n\nLine 1\nLine 2").unwrap();

        let result = fetch_devlog_context(temp_dir.path());
        assert!(result.is_some());
        let content = result.unwrap();
        assert!(content.contains("DEVLOG"));
        assert!(content.contains("Line 1"));
    }

    #[test]
    fn test_fetch_devlog_context_truncates_to_500_lines() {
        let temp_dir = TempDir::new().unwrap();
        let devlog_path = temp_dir.path().join("DEVLOG.md");

        // Create 600 lines
        let content = (1..=600)
            .map(|i| format!("Line {}", i))
            .collect::<Vec<_>>()
            .join("\n");
        fs::write(&devlog_path, content).unwrap();

        let result = fetch_devlog_context(temp_dir.path());
        assert!(result.is_some());

        let truncated = result.unwrap();
        let line_count = truncated.lines().count();
        assert_eq!(line_count, 500, "Should only return last 500 lines");

        // Should start at line 101
        assert!(truncated.contains("Line 101"));
        assert!(!truncated.contains("Line 100"));
    }
}
