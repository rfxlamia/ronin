/// Type definitions for context aggregation
///
/// Defines data structures for aggregated context from Git, DEVLOG, and behavior sources
use serde::{Deserialize, Serialize};

/// Complete aggregated context for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregatedContext {
    pub project: String,
    pub git: GitContextData,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub devlog: Option<String>,
    pub behavior: BehaviorData,
    pub attribution: String,
}

/// Git context data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitContextData {
    pub branch: String,
    pub uncommitted: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_commit: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub recent_commits: Vec<CommitSummary>,
}

/// Commit summary for context
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitSummary {
    pub message: String,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub files: Vec<String>,
}

/// Behavior tracking data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorData {
    pub ai_sessions: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_active_file: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub patterns: Vec<String>,
    pub stuck_detected: bool,
}

/// Observer event from database
#[derive(Debug, Clone)]
pub struct ObserverEvent {
    pub timestamp: i64,
    #[allow(dead_code)] // Present in DB schema, reserved for future filtering
    pub event_type: String,
    pub window_title: Option<String>,
    pub process_name: Option<String>,
    #[allow(dead_code)] // Window events don't use file_path (fetched separately as FileEvent)
    pub file_path: Option<String>,
}

/// AI tool session detected in behavior
#[derive(Debug, Clone)]
pub struct AiToolSession {
    pub tool_name: String,
    pub start_time: i64,
    pub end_time: i64,
    pub window_titles: Vec<String>,
}

/// File modification event
#[derive(Debug, Clone)]
pub struct FileEvent {
    pub timestamp: i64,
    pub file_path: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aggregated_context_serialization() {
        let context = AggregatedContext {
            project: "test".to_string(),
            git: GitContextData {
                branch: "main".to_string(),
                uncommitted: 2,
                last_commit: Some("feat: test".to_string()),
                recent_commits: vec![],
            },
            devlog: Some("test devlog".to_string()),
            behavior: BehaviorData {
                ai_sessions: 3,
                last_active_file: Some("src/main.rs".to_string()),
                patterns: vec!["AI-Assisted Iteration".to_string()],
                stuck_detected: false,
            },
            attribution: "Based on: 🔀 5 commits · 🤖 3 Claude sessions · 📝 DEVLOG".to_string(),
        };

        let json = serde_json::to_string(&context).expect("Should serialize");
        assert!(json.contains("test"));
        assert!(json.contains("main"));
        assert!(json.contains("AI-Assisted Iteration"));
    }

    #[test]
    fn test_commit_summary_serialization() {
        let commit = CommitSummary {
            message: "feat: add feature".to_string(),
            timestamp: "1234567890".to_string(),
            files: vec!["src/main.rs".to_string()],
        };

        let json = serde_json::to_string(&commit).expect("Should serialize");
        assert!(json.contains("feat: add feature"));
        assert!(json.contains("1234567890"));
    }

    #[test]
    fn test_behavior_data_empty_patterns() {
        let behavior = BehaviorData {
            ai_sessions: 0,
            last_active_file: None,
            patterns: vec![],
            stuck_detected: false,
        };

        let json = serde_json::to_string(&behavior).expect("Should serialize");
        // Empty patterns should be omitted due to skip_serializing_if
        assert!(!json.contains("\"patterns\""));
    }
}
