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
///
/// Uses "Forward Context Linking": Generic AI windows (Claude, ChatGPT) are only
/// attributed to a project if a subsequent window (within 5 switches) contains
/// the project name. This prevents AI sessions from bleeding across all projects.
pub fn fetch_behavior_context(
    project_id: i64,
    duration_hours: i64,
    db_pool: &DbPool,
    project_name: &str,
) -> Result<(Vec<ObserverEvent>, Vec<FileEvent>), RoninError> {
    let conn = db_pool
        .get()
        .map_err(|e| RoninError::Database(format!("Failed to get DB connection: {}", e)))?;

    let cutoff_time = chrono::Utc::now().timestamp_millis() - (duration_hours * 60 * 60 * 1000);

    // Step 1: Get project-specific file events (these have explicit project_id)
    let mut file_stmt = conn
        .prepare(
            "SELECT timestamp, file_path 
             FROM observer_events 
             WHERE project_id = ?1 AND timestamp > ?2 AND file_path IS NOT NULL
             ORDER BY timestamp ASC",
        )
        .map_err(|e| RoninError::Database(format!("Failed to prepare file query: {}", e)))?;

    let file_events: Vec<FileEvent> = file_stmt
        .query_map(rusqlite::params![project_id, cutoff_time], |row| {
            Ok(FileEvent {
                timestamp: row.get(0)?,
                file_path: row.get(1)?,
            })
        })
        .map_err(|e| RoninError::Database(format!("File query failed: {}", e)))?
        .filter_map(Result::ok)
        .collect();

    // Step 2: Get ALL window events (project_id = NULL) for forward context linking
    let mut window_stmt = conn
        .prepare(
            "SELECT timestamp, event_type, window_title, process_name 
             FROM observer_events 
             WHERE project_id IS NULL AND timestamp > ?1
             ORDER BY timestamp ASC",
        )
        .map_err(|e| RoninError::Database(format!("Failed to prepare window query: {}", e)))?;

    let all_windows: Vec<ObserverEvent> = window_stmt
        .query_map(rusqlite::params![cutoff_time], |row| {
            Ok(ObserverEvent {
                timestamp: row.get(0)?,
                event_type: row.get(1)?,
                window_title: row.get(2)?,
                process_name: row.get(3)?,
                file_path: None,
            })
        })
        .map_err(|e| RoninError::Database(format!("Window query failed: {}", e)))?
        .filter_map(Result::ok)
        .collect();

    // Step 3: Apply forward context linking
    // For each window, check if it belongs to this project:
    // - Direct match: window title contains project name
    // - Forward link: generic AI window followed by project-specific window within 5 switches
    let linked_windows = apply_forward_context_linking(&all_windows, project_name);

    Ok((linked_windows, file_events))
}

/// Apply forward context linking algorithm
///
/// Rules:
/// 1. Windows with project name in title → directly attributed
/// 2. Generic AI windows (Claude, ChatGPT) → check next 5 windows for project match
/// 3. Other generic windows → not attributed
fn apply_forward_context_linking(
    windows: &[ObserverEvent],
    project_name: &str,
) -> Vec<ObserverEvent> {
    use super::patterns::AI_TOOLS;

    let project_lower = project_name.to_lowercase();
    let mut result = Vec::new();

    for (i, window) in windows.iter().enumerate() {
        // Handle Option<String> for window_title
        let title_lower = window
            .window_title
            .as_ref()
            .map(|t| t.to_lowercase())
            .unwrap_or_default();

        // Rule 1: Direct match - window title contains project name
        if title_lower.contains(&project_lower) {
            result.push(window.clone());
            continue;
        }

        // Rule 2: Check if this is an AI tool window
        let is_ai_window = AI_TOOLS
            .iter()
            .any(|tool| title_lower.contains(&tool.to_lowercase()));

        if is_ai_window {
            // Look at next 5 windows for project context
            let has_project_context = windows.iter().skip(i + 1).take(5).any(|w| {
                w.window_title
                    .as_ref()
                    .map(|t| t.to_lowercase().contains(&project_lower))
                    .unwrap_or(false)
            });

            if has_project_context {
                result.push(window.clone());
            }
            // If no project context found within 5 windows, skip this AI window
        }
        // Rule 3: Other generic windows (YouTube, etc.) are not attributed
    }

    result
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
