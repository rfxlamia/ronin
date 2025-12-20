/// Context aggregation for AI generation
use crate::commands::git::GitContext;

const MAX_PAYLOAD_SIZE: usize = 10 * 1024; // 10KB
const WARNING_THRESHOLD: usize = 8 * 1024; // 8KB

/// Build AI context from Git repository data
pub fn build_git_context(git_context: &GitContext) -> String {
    let mut context = String::new();

    // Branch information
    context.push_str(&format!("**Current Branch:** {}\n\n", git_context.branch));

    // Status information
    if git_context.status.is_clean {
        context.push_str("**Working Directory:** Clean (no uncommitted changes)\n\n");
    } else {
        context.push_str(&format!(
            "**Working Directory:** {} uncommitted file(s)\n",
            git_context.status.modified_files.len()
        ));

        // Show first 5 modified files
        let display_count = git_context.status.modified_files.len().min(5);
        for file in git_context.status.modified_files.iter().take(display_count) {
            context.push_str(&format!("  - {}\n", file));
        }

        if git_context.status.modified_files.len() > 5 {
            context.push_str(&format!(
                "  ... and {} more\n",
                git_context.status.modified_files.len() - 5
            ));
        }
        context.push('\n');
    }

    // Recent commits
    context.push_str(&format!(
        "**Recent Activity:** Last {} commits\n\n",
        git_context.commits.len()
    ));

    for commit in &git_context.commits {
        // Truncate long commit messages to keep payload small
        let message = if commit.message.len() > 100 {
            format!("{}...", &commit.message[..100])
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
pub fn build_system_prompt(git_context_str: &str) -> String {
    format!(
        r#"You are Ronin, a mindful AI consultant analyzing a developer's project context.

**Philosophy Guidelines:**
- 勇 (Yu): Suggest, never command. Use "Consider...", "Suggestion:", not "You must..."
- 仁 (Jin): Empathetic tone. "You were stuck on auth.rs" NOT "You were unproductive"
- Output format: Markdown with **bold** for key terms

**Context provided:**
{}

**Your response structure:**
## Context
{{What they were working on - file, feature, specific location}}

## Next Steps
{{Actionable suggestions, 2-3 bullet points}}

**Based on:** Git history"#,
        git_context_str
    )
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

    if size > WARNING_THRESHOLD {
        eprintln!(
            "⚠️  Payload size warning: {} bytes (threshold: {})",
            size, WARNING_THRESHOLD
        );
    }

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
                is_clean: true,
                modified_files: vec![],
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
                is_clean: false,
                modified_files: vec!["src/main.rs".to_string(), "src/lib.rs".to_string()],
            },
            commits: vec![],
        };

        let result = build_git_context(&context);
        assert!(result.contains("feature-branch"));
        assert!(result.contains("2 uncommitted file(s)"));
        assert!(result.contains("src/main.rs"));
        assert!(result.contains("src/lib.rs"));
    }

    #[test]
    fn test_build_system_prompt_format() {
        let git_str = "Test git context";
        let prompt = build_system_prompt(git_str);

        assert!(prompt.contains("Ronin"));
        assert!(prompt.contains("勇 (Yu)"));
        assert!(prompt.contains("仁 (Jin)"));
        assert!(prompt.contains("Test git context"));
        assert!(prompt.contains("## Context"));
        assert!(prompt.contains("## Next Steps"));
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
                is_clean: true,
                modified_files: vec![],
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
