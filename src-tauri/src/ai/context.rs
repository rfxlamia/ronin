/// Context aggregation for AI generation
use crate::commands::git::GitContext;
use crate::context::devlog::DevlogContent;

const MAX_PAYLOAD_SIZE: usize = 10 * 1024; // 10KB
const GIT_PRIORITY_SIZE: usize = 6 * 1024; // 6KB reserved for Git context

/// Behavior context from Silent Observer (Epic 6)
#[derive(Debug, Clone, Default)]
pub struct BehaviorContext {
    pub ai_sessions: usize,
    pub patterns: Vec<String>,
    pub stuck_detected: bool,
    pub last_active_file: Option<String>,
}

/// Build AI context from Git repository data
pub fn build_git_context(git_context: &GitContext) -> String {
    let mut context = String::new();

    // Branch information
    context.push_str(&format!("**Current Branch:** {}\n\n", git_context.branch));

    // Status information
    if git_context.status.uncommitted_files == 0 {
        context.push_str("**Working Directory:** Clean (no uncommitted changes)\n\n");
    } else {
        context.push_str(&format!(
            "**Working Directory:** {} uncommitted file(s)\n\n",
            git_context.status.uncommitted_files
        ));
    }

    // Recent commits
    context.push_str(&format!(
        "**Recent Activity:** Last {} commits\n\n",
        git_context.commits.len()
    ));

    for commit in &git_context.commits {
        // Truncate long commit messages to keep payload small (char-based, not byte-based)
        let message = if commit.message.chars().count() > 100 {
            let truncated: String = commit.message.chars().take(100).collect();
            format!("{}...", truncated)
        } else {
            commit.message.clone()
        };

        // Use short SHA (first 8 chars or full SHA if shorter)
        let short_sha = if commit.sha.len() >= 8 {
            &commit.sha[..8]
        } else {
            &commit.sha
        };

        context.push_str(&format!(
            "- {} by {} ({})\n  {}\n",
            short_sha, commit.author, commit.date, message
        ));

        // Show files if not too many
        if !commit.files.is_empty() && commit.files.len() <= 3 {
            context.push_str("  Files: ");
            context.push_str(&commit.files.join(", "));
            context.push('\n');
        } else if commit.files.len() > 3 {
            context.push_str(&format!("  Files: {} changed\n", commit.files.len()));
        }
        context.push('\n');
    }

    context
}

/// Build system prompt with Ronin philosophy and context
pub fn build_system_prompt(
    git_context_str: &str,
    devlog: Option<&DevlogContent>,
    behavior: Option<&BehaviorContext>,
) -> String {
    let context_sources = build_context_sources(git_context_str, devlog, behavior);
    let (based_on, prioritization) = build_attribution_and_priority(devlog, behavior);

    format!(
        r#"You are Ronin, a mindful AI consultant analyzing a developer's project context.

**Philosophy Guidelines:**
- 勇 (Yu): Suggest, never command. Use "Consider...", "Suggestion:", not "You must..."
- 仁 (Jin): Empathetic tone. "You were stuck on auth.rs" NOT "You were unproductive"
- Output format: Markdown with **bold** for key terms

**Context provided:**
{}{}
**Your response structure:**
## Context
{{What they were working on - file, feature, specific location}}

## Next Steps
{{Actionable suggestions, 2-3 bullet points}}

**Based on:** {}"#,
        context_sources, prioritization, based_on
    )
}

/// Build attribution string and prioritization notes based on available context sources
fn build_attribution_and_priority(
    devlog: Option<&DevlogContent>,
    behavior: Option<&BehaviorContext>,
) -> (String, String) {
    let has_devlog = devlog.is_some();
    let has_behavior = behavior
        .map(|b| b.ai_sessions > 0 || b.stuck_detected || !b.patterns.is_empty())
        .unwrap_or(false);

    let mut sources = vec!["Git history"];
    let mut priority_notes = Vec::new();

    if has_devlog {
        sources.push("DEVLOG");
        priority_notes
            .push("- Use DEVLOG for user intent, blockers, planned next steps (the \"Why\")");
    }

    if has_behavior {
        sources.push("Behavior");
        priority_notes.push("- Use Behavior data for recent activity patterns and AI tool usage");
    }

    priority_notes.push("- Use Git history for actual progress, modified files (the \"What\")");

    let based_on = sources.join(" · ");
    let prioritization = if priority_notes.len() > 1 {
        format!("\n**PRIORITIZATION:**\n{}\n", priority_notes.join("\n"))
    } else {
        String::new()
    };

    (based_on, prioritization)
}

/// Build combined context sources string with Git history, optional DEVLOG, and behavior
fn build_context_sources(
    git_context_str: &str,
    devlog: Option<&DevlogContent>,
    behavior: Option<&BehaviorContext>,
) -> String {
    let mut sources = String::new();

    // 1. Git History (always present)
    sources.push_str("## 1. GIT HISTORY:\n");
    sources.push_str(git_context_str);

    // 2. DEVLOG (if present)
    if let Some(devlog_content) = devlog {
        sources.push_str("\n\n## 2. DEVLOG (User's Development Log):\n");
        // Wrap in XML tags to prevent prompt injection (Architecture requirement)
        sources.push_str("<devlog>\n");
        sources.push_str(&devlog_content.content);
        sources.push_str("\n</devlog>");

        if devlog_content.truncated {
            sources.push_str("\n(Note: DEVLOG was truncated to last ~500 lines)");
        }
    }

    // 3. Behavior Context (Epic 6 - Silent Observer data)
    if let Some(behavior_ctx) = behavior {
        if behavior_ctx.ai_sessions > 0
            || behavior_ctx.stuck_detected
            || !behavior_ctx.patterns.is_empty()
        {
            sources.push_str("\n\n## 3. BEHAVIOR (Silent Observer):\n");

            if behavior_ctx.ai_sessions > 0 {
                sources.push_str(&format!(
                    "**AI Tool Sessions:** {} (Claude, ChatGPT, etc.)\n",
                    behavior_ctx.ai_sessions
                ));
            }

            if let Some(ref file) = behavior_ctx.last_active_file {
                sources.push_str(&format!("**Last Active File:** {}\n", file));
            }

            if !behavior_ctx.patterns.is_empty() {
                sources.push_str(&format!(
                    "**Detected Patterns:** {}\n",
                    behavior_ctx.patterns.join(", ")
                ));
            }

            if behavior_ctx.stuck_detected {
                sources.push_str("**⚠️ Stuck Pattern Detected:** Developer appears stuck (45+ min same topic, repeated AI queries, no progress signals)\n");
            }
        }
    }

    sources
}

/// Enforce token budget: if combined Git + DEVLOG > 10KB, truncate DEVLOG intelligently
pub fn enforce_token_budget(
    git_context_str: &str,
    devlog: Option<DevlogContent>,
) -> Option<DevlogContent> {
    let git_size = git_context_str.len();

    match devlog {
        None => None,
        Some(mut devlog_content) => {
            let combined_size = git_size + devlog_content.content.len();

            if combined_size <= MAX_PAYLOAD_SIZE {
                // Fits within budget
                Some(devlog_content)
            } else {
                // Need to truncate DEVLOG
                // Priority 1: Keep Git (reserve GIT_PRIORITY_SIZE)
                let available_for_devlog =
                    MAX_PAYLOAD_SIZE.saturating_sub(git_size.max(GIT_PRIORITY_SIZE));

                if available_for_devlog < 500 {
                    // Not enough space for meaningful DEVLOG content
                    None
                } else {
                    // Truncate DEVLOG at section boundaries
                    let (truncated_content, was_truncated) =
                        crate::context::devlog::truncate_at_section_boundary(
                            &devlog_content.content,
                            available_for_devlog,
                        );

                    devlog_content.content = truncated_content;
                    devlog_content.truncated = devlog_content.truncated || was_truncated;

                    Some(devlog_content)
                }
            }
        }
    }
}

/// Validate payload size and log warnings
pub fn validate_payload_size(prompt: &str) -> Result<(), String> {
    let size = prompt.len();

    if size > MAX_PAYLOAD_SIZE {
        return Err(format!(
            "Payload too large: {} bytes (max {})",
            size, MAX_PAYLOAD_SIZE
        ));
    }

    // Payload size is within acceptable limits

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::git::{GitCommit, GitStatus};

    #[test]
    fn test_build_git_context_clean() {
        let context = GitContext {
            branch: "main".to_string(),
            status: GitStatus {
                branch: "main".to_string(),
                uncommitted_files: 0,
                unpushed_commits: 0,
                last_commit_timestamp: 0,
                has_remote: false,
                is_detached: false,
                has_conflicts: false,
                is_empty: false,
            },
            commits: vec![GitCommit {
                sha: "abc123def456".to_string(),
                author: "Test Author".to_string(),
                date: "2024-12-21T10:00:00Z".to_string(),
                message: "Add feature".to_string(),
                files: vec!["src/main.rs".to_string()],
            }],
        };

        let result = build_git_context(&context);
        assert!(result.contains("**Current Branch:** main"));
        assert!(result.contains("Clean (no uncommitted changes)"));
        assert!(result.contains("abc123de")); // Short SHA
        assert!(result.contains("Test Author"));
        assert!(result.contains("Add feature"));
    }

    #[test]
    fn test_build_git_context_dirty() {
        let context = GitContext {
            branch: "feature-branch".to_string(),
            status: GitStatus {
                branch: "feature-branch".to_string(),
                uncommitted_files: 2,
                unpushed_commits: 0,
                last_commit_timestamp: 0,
                has_remote: false,
                is_detached: false,
                has_conflicts: false,
                is_empty: false,
            },
            commits: vec![],
        };

        let result = build_git_context(&context);
        assert!(result.contains("feature-branch"));
        assert!(result.contains("2 uncommitted file(s)"));
    }

    #[test]
    fn test_build_system_prompt_without_devlog() {
        let git_str = "Test git context";
        let prompt = build_system_prompt(git_str, None, None);

        assert!(prompt.contains("Ronin"));
        assert!(prompt.contains("勇 (Yu)"));
        assert!(prompt.contains("仁 (Jin)"));
        assert!(prompt.contains("Test git context"));
        assert!(prompt.contains("## Context"));
        assert!(prompt.contains("## Next Steps"));
        assert!(prompt.contains("**Based on:** Git history"));
        // When no devlog or behavior, should not mention DEVLOG or PRIORITIZATION
        assert!(!prompt.contains("DEVLOG"));
        assert!(!prompt.contains("PRIORITIZATION"));
    }

    #[test]
    fn test_build_system_prompt_with_devlog() {
        let git_str = "Test git context";
        let devlog = DevlogContent {
            content: "# DEVLOG\n\n## Today\n- Working on feature X".to_string(),
            lines_read: 4,
            truncated: false,
            source_path: "DEVLOG.md".to_string(),
        };
        let prompt = build_system_prompt(git_str, Some(&devlog), None);

        assert!(prompt.contains("Ronin"));
        assert!(prompt.contains("Test git context"));
        assert!(prompt.contains("<devlog>"));
        assert!(prompt.contains("Working on feature X"));
        assert!(prompt.contains("</devlog>"));
        assert!(prompt.contains("**Based on:** Git history · DEVLOG"));
        assert!(prompt.contains("PRIORITIZATION"));
    }

    #[test]
    fn test_build_system_prompt_with_truncated_devlog() {
        let git_str = "Test git context";
        let devlog = DevlogContent {
            content: "# DEVLOG content".to_string(),
            lines_read: 500,
            truncated: true,
            source_path: "DEVLOG.md".to_string(),
        };
        let prompt = build_system_prompt(git_str, Some(&devlog), None);

        assert!(prompt.contains("truncated to last ~500 lines"));
    }

    #[test]
    fn test_enforce_token_budget_no_devlog() {
        let git_str = "Small git context";
        let result = enforce_token_budget(git_str, None);
        assert!(result.is_none());
    }

    #[test]
    fn test_enforce_token_budget_within_limit() {
        let git_str = "Small git context";
        let devlog = DevlogContent {
            content: "Small devlog".to_string(),
            lines_read: 1,
            truncated: false,
            source_path: "DEVLOG.md".to_string(),
        };

        let result = enforce_token_budget(git_str, Some(devlog));
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.content, "Small devlog");
        assert!(!result.truncated);
    }

    #[test]
    fn test_enforce_token_budget_truncates_large_devlog() {
        let git_str = "x".repeat(5000); // 5KB git context
        let devlog = DevlogContent {
            content: "y".repeat(8000), // 8KB devlog - combined would be 13KB > 10KB
            lines_read: 100,
            truncated: false,
            source_path: "DEVLOG.md".to_string(),
        };

        let result = enforce_token_budget(&git_str, Some(devlog));
        assert!(result.is_some());
        let result = result.unwrap();
        // Should be truncated to fit within budget
        assert!(result.content.len() < 8000);
        assert!(result.truncated);
    }

    #[test]
    fn test_validate_payload_size_ok() {
        let small_prompt = "Small payload".to_string();
        assert!(validate_payload_size(&small_prompt).is_ok());
    }

    #[test]
    fn test_validate_payload_size_too_large() {
        let large_prompt = "x".repeat(15 * 1024); // 15KB
        let result = validate_payload_size(&large_prompt);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Payload too large"));
    }

    #[test]
    fn test_validate_payload_size_warning() {
        let medium_prompt = "x".repeat(9 * 1024); // 9KB - triggers warning
        let result = validate_payload_size(&medium_prompt);
        assert!(result.is_ok()); // Still valid, just warns
    }

    #[test]
    fn test_truncate_long_commit_message() {
        let long_message = "a".repeat(150);
        let context = GitContext {
            branch: "main".to_string(),
            status: GitStatus {
                branch: "main".to_string(),
                uncommitted_files: 0,
                unpushed_commits: 0,
                last_commit_timestamp: 0,
                has_remote: false,
                is_detached: false,
                has_conflicts: false,
                is_empty: false,
            },
            commits: vec![GitCommit {
                sha: "abc123".to_string(),
                author: "Test".to_string(),
                date: "2024-12-21".to_string(),
                message: long_message,
                files: vec![],
            }],
        };

        let result = build_git_context(&context);
        // Should truncate to 100 chars + "..."
        assert!(result.contains("..."));
        // Original message was 150, so truncated version should be shorter
        assert!(!result.contains(&"a".repeat(150)));
    }
}
