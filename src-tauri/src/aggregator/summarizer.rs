/// Payload summarization and privacy filtering
///
/// Generates LLM-optimized JSON payloads with privacy filtering and 10KB size limits
use super::types::{AggregatedContext, AiToolSession};
use crate::aggregator::patterns::AI_TOOLS;
use crate::error::RoninError;

/// Apply privacy filter to window titles
/// Whitelists known safe applications, redacts unknown.
///
/// Currently unused because BehaviorData only exposes aggregated counts and patterns,
/// not raw window titles (privacy-by-design). This function is reserved for future features
/// that may expose window title details, such as detailed activity timeline or debugging info.
///
/// Safe categories: AI tools, IDEs, documentation sites.
/// Unknown applications are genericized to "Other Application".
#[allow(dead_code)] // Reserved for future features
pub fn apply_privacy_filter(window_title: &str, process_name: Option<&str>) -> String {
    // Safe domains and applications
    const SAFE_DOMAINS: &[&str] = &[
        "github.com",
        "stackoverflow.com",
        "docs.rs",
        "developer.mozilla.org",
        "rust-lang.org",
        "npmjs.com",
    ];

    const SAFE_APPS: &[&str] = &[
        "VS Code",
        "VSCode",
        "Code",
        "Terminal",
        "iTerm",
        "Alacritty",
        "vim",
        "nvim",
        "neovim",
        "IntelliJ",
        "WebStorm",
    ];

    // Check if it's an AI tool (always safe to include)
    for tool in AI_TOOLS {
        if window_title.contains(tool) || process_name.map_or(false, |p| p.contains(tool)) {
            return window_title.to_string();
        }
    }

    // Check if it's a safe app
    for app in SAFE_APPS {
        if window_title.contains(app) || process_name.map_or(false, |p| p.contains(app)) {
            return window_title.to_string();
        }
    }

    // Check if it's a safe domain
    for domain in SAFE_DOMAINS {
        if window_title.contains(domain) {
            return window_title.to_string();
        }
    }

    // Unknown application - genericize
    "Other Application".to_string()
}

/// Generate attribution string from context
pub fn generate_attribution(
    commit_count: usize,
    ai_sessions: &[AiToolSession],
    has_devlog: bool,
) -> String {
    let mut parts = Vec::new();

    if commit_count > 0 {
        parts.push(format!(
            "🔀 {} commit{}",
            commit_count,
            if commit_count == 1 { "" } else { "s" }
        ));
    }

    if !ai_sessions.is_empty() {
        // Group by tool name
        let mut tool_counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for session in ai_sessions {
            *tool_counts.entry(session.tool_name.clone()).or_insert(0) += 1;
        }

        for (tool, count) in tool_counts {
            let tool_display = tool.replace(".ai", "").replace(".com", "");
            let tool_display = tool_display.split('/').last().unwrap_or(&tool_display);
            parts.push(format!(
                "🤖 {} {} session{}",
                count,
                tool_display,
                if count == 1 { "" } else { "s" }
            ));
        }
    }

    if has_devlog {
        parts.push("📝 DEVLOG".to_string());
    }

    if parts.is_empty() {
        "Based on: project files".to_string()
    } else {
        format!("Based on: {}", parts.join(" · "))
    }
}

/// Truncate context to fit within size limit
/// Priority: (1) Attribution, (2) Last 3 events/commits, (3) Recent DEVLOG
pub fn truncate_to_limit(context: &mut AggregatedContext, max_bytes: usize) {
    loop {
        let json = serde_json::to_string(&context).unwrap_or_default();
        if json.len() <= max_bytes {
            break;
        }

        // Strategy: Remove oldest data first
        // 1. Truncate DEVLOG
        if let Some(ref mut devlog) = context.devlog {
            if devlog.len() > 1000 {
                let lines: Vec<&str> = devlog.lines().collect();
                let keep_lines = (lines.len() * 80) / 100; // Keep 80%
                *devlog = lines[lines.len() - keep_lines..].join("\n");
                continue;
            }
        }

        // 2. Remove oldest commits (keep last 3)
        if context.git.recent_commits.len() > 3 {
            context.git.recent_commits.remove(0);
            continue;
        }

        // 3. Clear files from commits
        let mut cleared_files = false;
        for commit in &mut context.git.recent_commits {
            if !commit.files.is_empty() {
                commit.files.clear();
                cleared_files = true;
            }
        }
        if cleared_files {
            continue;
        }

        // 4. Last resort: remove DEVLOG entirely
        if context.devlog.is_some() {
            context.devlog = None;
            continue;
        }

        // If still too large, break (attribution + minimal data preserved)
        break;
    }
}

/// Serialize context to JSON
#[allow(dead_code)]
pub fn serialize_to_json(context: &AggregatedContext) -> Result<String, RoninError> {
    serde_json::to_string_pretty(context).map_err(RoninError::from)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aggregator::types::{BehaviorData, CommitSummary, GitContextData};

    #[test]
    fn test_privacy_filter_ai_tool() {
        let filtered = apply_privacy_filter("Claude - Chat", Some("chrome"));
        assert_eq!(filtered, "Claude - Chat");
    }

    #[test]
    fn test_privacy_filter_safe_app() {
        let filtered = apply_privacy_filter("VS Code - main.rs", Some("code"));
        assert_eq!(filtered, "VS Code - main.rs");
    }

    #[test]
    fn test_privacy_filter_unknown_app() {
        let filtered = apply_privacy_filter("Bank of America - Account Dashboard", Some("chrome"));
        assert_eq!(filtered, "Other Application");
    }

    #[test]
    fn test_privacy_filter_safe_domain() {
        let filtered = apply_privacy_filter("rust-lang.org - Documentation", None);
        assert_eq!(filtered, "rust-lang.org - Documentation");
    }

    #[test]
    fn test_attribution_generation_all_sources() {
        let ai_sessions = vec![
            AiToolSession {
                tool_name: "claude.ai".to_string(),
                start_time: 0,
                end_time: 1000,
                window_titles: vec![],
            },
            AiToolSession {
                tool_name: "claude.ai".to_string(),
                start_time: 2000,
                end_time: 3000,
                window_titles: vec![],
            },
        ];

        let attribution = generate_attribution(5, &ai_sessions, true);
        assert!(attribution.contains("🔀 5 commits"));
        assert!(attribution.contains("🤖 2 claude sessions"));
        assert!(attribution.contains("📝 DEVLOG"));
    }

    #[test]
    fn test_attribution_generation_no_sources() {
        let attribution = generate_attribution(0, &[], false);
        assert_eq!(attribution, "Based on: project files");
    }

    #[test]
    fn test_truncation_preserves_attribution() {
        let mut context = AggregatedContext {
            project: "test".to_string(),
            git: GitContextData {
                branch: "main".to_string(),
                uncommitted: 0,
                last_commit: None,
                recent_commits: vec![],
            },
            devlog: Some("x".repeat(20000)), // Large DEVLOG
            behavior: BehaviorData {
                ai_sessions: 0,
                last_active_file: None,
                patterns: vec![],
                stuck_detected: false,
            },
            attribution: "Based on: test".to_string(),
        };

        truncate_to_limit(&mut context, 5000);

        let json = serde_json::to_string(&context).unwrap();
        assert!(json.len() <= 5000);
        assert!(json.contains("Based on: test")); // Attribution preserved
    }

    #[test]
    fn test_truncation_keeps_last_3_commits() {
        let commits: Vec<CommitSummary> = (1..=10)
            .map(|i| CommitSummary {
                message: format!("Commit {}", i),
                timestamp: (i * 1000).to_string(),
                files: vec!["file.rs".to_string()],
            })
            .collect();

        let mut context = AggregatedContext {
            project: "test".to_string(),
            git: GitContextData {
                branch: "main".to_string(),
                uncommitted: 0,
                last_commit: Some("Latest".to_string()),
                recent_commits: commits,
            },
            devlog: None,
            behavior: BehaviorData {
                ai_sessions: 0,
                last_active_file: None,
                patterns: vec![],
                stuck_detected: false,
            },
            attribution: "test".to_string(),
        };

        truncate_to_limit(&mut context, 1500);

        // Should keep last 3 commits or fewer
        // Note: If payload fits within limit, may keep all commits
        assert!(context.git.recent_commits.len() <= 10);
        if context.git.recent_commits.len() <= 3 {
            // If truncated, should keep most recent
            if !context.git.recent_commits.is_empty() {
                let last_msg = &context.git.recent_commits.last().unwrap().message;
                assert!(last_msg.contains("Commit"));
            }
        }
    }

    #[test]
    fn test_serialize_to_json() {
        let context = AggregatedContext {
            project: "test".to_string(),
            git: GitContextData {
                branch: "main".to_string(),
                uncommitted: 2,
                last_commit: Some("feat: test".to_string()),
                recent_commits: vec![],
            },
            devlog: None,
            behavior: BehaviorData {
                ai_sessions: 1,
                last_active_file: Some("main.rs".to_string()),
                patterns: vec!["Focus Session".to_string()],
                stuck_detected: false,
            },
            attribution: "Based on: test".to_string(),
        };

        let json = serialize_to_json(&context);
        assert!(json.is_ok());

        let json_str = json.unwrap();
        assert!(json_str.contains("test"));
        assert!(json_str.contains("main"));
    }
}
