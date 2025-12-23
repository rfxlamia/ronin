//! DEVLOG reader module for AI context enhancement
//!
//! Reads DEVLOG.md files from project directories to provide additional
//! context for AI-powered context recovery. Supports multiple standard locations.

use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::path::Path;

/// Maximum file size to read (50KB safety cap per NFR6)
const MAX_DEVLOG_SIZE: u64 = 50_000;

/// Maximum number of lines to return
const MAX_DEVLOG_LINES: usize = 500;

/// Result of reading a DEVLOG file
#[derive(Debug, Clone)]
pub struct DevlogContent {
    /// The content of the DEVLOG (last ~500 lines)
    pub content: String,
    /// Number of lines read
    pub lines_read: usize,
    /// Whether the content was truncated
    pub truncated: bool,
    /// The path where DEVLOG was found (e.g., "DEVLOG.md", "docs/DEVLOG.md")
    /// Reserved for future attribution enhancement to show which location was used
    #[allow(dead_code)]
    pub source_path: String,
}

/// Standard locations to check for DEVLOG.md
pub const DEVLOG_LOCATIONS: &[&str] = &["DEVLOG.md", "docs/DEVLOG.md", ".devlog/DEVLOG.md"];

/// Find existing DEVLOG path
///
/// Returns `Some(PathBuf)` if a DEVLOG file is found in any standard location.
/// Returns `None` if no DEVLOG file exists.
pub fn find_devlog_path(project_path: &Path) -> Option<std::path::PathBuf> {
    for location in DEVLOG_LOCATIONS {
        let devlog_path = project_path.join(location);
        if devlog_path.exists() {
            return Some(devlog_path);
        }
    }
    None
}

/// Read DEVLOG.md from a project directory
///
/// Checks standard locations in order:
/// 1. `{project_root}/DEVLOG.md`
/// 2. `{project_root}/docs/DEVLOG.md`
/// 3. `{project_root}/.devlog/DEVLOG.md`
///
/// Returns `None` if no DEVLOG found, file is empty, or permission denied.
pub fn read_devlog(project_path: &Path) -> Option<DevlogContent> {
    for location in DEVLOG_LOCATIONS {
        let devlog_path = project_path.join(location);

        if let Some(content) = try_read_devlog(&devlog_path, location) {
            return Some(content);
        }
    }

    None
}

/// Try to read a DEVLOG from a specific path
fn try_read_devlog(path: &Path, source_location: &str) -> Option<DevlogContent> {
    // Check if file exists
    if !path.exists() {
        return None;
    }

    // Get file metadata
    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            // Silently handle errors - permission denied, file not found, etc.
            let _ = e; // Suppress unused variable warning
            return None;
        }
    };

    // Check for empty file
    if metadata.len() == 0 {
        return None;
    }

    // Open file
    let file = match File::open(path) {
        Ok(f) => f,
        Err(e) => {
            // Silently handle errors - permission denied, file not found, etc.
            let _ = e; // Suppress unused variable warning
            return None;
        }
    };

    let file_size = metadata.len();

    // For large files, seek to near the end to get last ~50KB
    let content = if file_size > MAX_DEVLOG_SIZE {
        read_tail_of_file(file, file_size)
    } else {
        read_entire_file(file)
    };

    content.map(|(text, lines_read, truncated)| DevlogContent {
        content: text,
        lines_read,
        truncated,
        source_path: source_location.to_string(),
    })
}

/// Read the entire file (for files <= 50KB)
fn read_entire_file(file: File) -> Option<(String, usize, bool)> {
    let reader = BufReader::new(file);
    let mut lines: Vec<String> = Vec::new();

    for line_result in reader.lines() {
        match line_result {
            Ok(line) => lines.push(line),
            Err(_e) => {
                // Handle non-UTF8 data gracefully - skip invalid lines
                continue;
            }
        }
    }

    if lines.is_empty() {
        return None;
    }

    // Take last MAX_DEVLOG_LINES
    let truncated = lines.len() > MAX_DEVLOG_LINES;
    let start_idx = if truncated {
        lines.len() - MAX_DEVLOG_LINES
    } else {
        0
    };
    let selected_lines: Vec<&str> = lines[start_idx..].iter().map(|s| s.as_str()).collect();
    let lines_read = selected_lines.len();

    Some((selected_lines.join("\n"), lines_read, truncated))
}

/// Read the tail of a large file (for files > 50KB)
fn read_tail_of_file(mut file: File, file_size: u64) -> Option<(String, usize, bool)> {
    // Seek to near the end
    let seek_position = file_size.saturating_sub(MAX_DEVLOG_SIZE);

    if file.seek(SeekFrom::Start(seek_position)).is_err() {
        return None;
    }

    // Read remaining bytes
    let mut buffer = Vec::new();
    if file.read_to_end(&mut buffer).is_err() {
        return None;
    }

    // Convert to string, handling non-UTF8 gracefully
    let text = String::from_utf8_lossy(&buffer);

    // If we seeked into the middle of a line, skip to next newline
    let text = if seek_position > 0 {
        if let Some(idx) = text.find('\n') {
            &text[idx + 1..]
        } else {
            &text[..]
        }
    } else {
        &text[..]
    };

    // Split into lines and take last MAX_DEVLOG_LINES
    let lines: Vec<&str> = text.lines().collect();

    if lines.is_empty() {
        return None;
    }

    let truncated = true; // We already know we truncated since file > MAX_DEVLOG_SIZE
    let start_idx = if lines.len() > MAX_DEVLOG_LINES {
        lines.len() - MAX_DEVLOG_LINES
    } else {
        0
    };
    let selected_lines = &lines[start_idx..];
    let lines_read = selected_lines.len();

    Some((selected_lines.join("\n"), lines_read, truncated))
}

/// Intelligently truncate DEVLOG content at section boundaries for token budget
///
/// When combined Git + DEVLOG exceeds 10KB, this function truncates
/// the DEVLOG at markdown section boundaries (headers) rather than
/// cutting mid-paragraph.
pub fn truncate_at_section_boundary(content: &str, max_bytes: usize) -> (String, bool) {
    if content.len() <= max_bytes {
        return (content.to_string(), false);
    }

    // Find all section headers (lines starting with #)
    let lines: Vec<&str> = content.lines().collect();
    let mut result = String::new();
    let mut last_section_end = 0;

    for (i, line) in lines.iter().enumerate() {
        // Track section boundaries
        if line.starts_with('#') && i > 0 {
            // Check if adding up to previous section fits
            let section_content: String = lines[last_section_end..i].join("\n");
            if result.len() + section_content.len() < max_bytes {
                if !result.is_empty() {
                    result.push('\n');
                }
                result.push_str(&section_content);
                last_section_end = i;
            } else {
                // Would exceed limit, stop here
                break;
            }
        }
    }

    // Try to add the last section
    if last_section_end < lines.len() {
        let remaining: String = lines[last_section_end..].join("\n");
        if result.len() + remaining.len() < max_bytes {
            if !result.is_empty() {
                result.push('\n');
            }
            result.push_str(&remaining);
            return (result, false);
        }
    }

    // Add truncation note
    if result.is_empty() {
        // If no sections fit, just take what we can
        let truncated: String = content.chars().take(max_bytes - 50).collect();
        return (
            format!("{}\n\n(DEVLOG truncated to fit 10KB limit)", truncated),
            true,
        );
    }

    (
        format!("{}\n\n(DEVLOG truncated to fit 10KB limit)", result),
        true,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::TempDir;

    /// Helper to create a test project with DEVLOG
    fn create_test_project() -> TempDir {
        tempfile::tempdir().expect("Failed to create temp dir")
    }

    // =============================================================================
    // FR: DEVLOG Ingestion Tests (AC 1)
    // =============================================================================

    #[test]
    fn test_read_devlog_from_root() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        let content = "# DEVLOG\n\n## 2024-12-21\n- Fixed bug in auth module\n- Added tests";
        fs::write(&devlog_path, content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.content.contains("Fixed bug in auth module"));
        assert_eq!(devlog.source_path, "DEVLOG.md");
        assert!(!devlog.truncated);
    }

    #[test]
    fn test_read_devlog_from_docs_folder() {
        let temp = create_test_project();
        let docs_dir = temp.path().join("docs");
        fs::create_dir(&docs_dir).unwrap();
        let devlog_path = docs_dir.join("DEVLOG.md");

        let content = "# DEVLOG from docs\n\n## Entry\n- Working on feature";
        fs::write(&devlog_path, content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.content.contains("DEVLOG from docs"));
        assert_eq!(devlog.source_path, "docs/DEVLOG.md");
    }

    #[test]
    fn test_read_devlog_from_devlog_folder() {
        let temp = create_test_project();
        let devlog_dir = temp.path().join(".devlog");
        fs::create_dir(&devlog_dir).unwrap();
        let devlog_path = devlog_dir.join("DEVLOG.md");

        let content = "# Hidden DEVLOG\n\n## Entry\n- Secret work";
        fs::write(&devlog_path, content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.content.contains("Hidden DEVLOG"));
        assert_eq!(devlog.source_path, ".devlog/DEVLOG.md");
    }

    #[test]
    fn test_multi_location_priority_root_first() {
        let temp = create_test_project();

        // Create DEVLOG in root
        fs::write(temp.path().join("DEVLOG.md"), "# Root DEVLOG").unwrap();

        // Create DEVLOG in docs
        let docs_dir = temp.path().join("docs");
        fs::create_dir(&docs_dir).unwrap();
        fs::write(docs_dir.join("DEVLOG.md"), "# Docs DEVLOG").unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        // Root should be found first
        assert!(devlog.content.contains("Root DEVLOG"));
        assert_eq!(devlog.source_path, "DEVLOG.md");
    }

    #[test]
    fn test_multi_location_fallback_to_docs() {
        let temp = create_test_project();

        // Only create DEVLOG in docs (not root)
        let docs_dir = temp.path().join("docs");
        fs::create_dir(&docs_dir).unwrap();
        fs::write(docs_dir.join("DEVLOG.md"), "# Docs DEVLOG Only").unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.content.contains("Docs DEVLOG Only"));
        assert_eq!(devlog.source_path, "docs/DEVLOG.md");
    }

    // =============================================================================
    // FR: Missing DEVLOG Fallback Tests (AC 2)
    // =============================================================================

    #[test]
    fn test_missing_devlog_returns_none() {
        let temp = create_test_project();
        // Don't create any DEVLOG

        let result = read_devlog(temp.path());

        assert!(result.is_none());
    }

    #[test]
    fn test_empty_devlog_returns_none() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create empty file
        File::create(&devlog_path).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_none());
    }

    // =============================================================================
    // NFR: Truncation Tests (50KB cap, 500 lines)
    // =============================================================================

    #[test]
    fn test_truncation_on_large_file() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create a file larger than 50KB
        let line = "This is a test line for DEVLOG testing purposes.\n";
        let mut content = String::new();
        // ~51KB of content (1000+ lines)
        for i in 0..1100 {
            content.push_str(&format!("Line {}: {}", i, line));
        }
        fs::write(&devlog_path, &content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.truncated);
        assert!(devlog.lines_read <= MAX_DEVLOG_LINES);
        // Should contain later lines (near the end)
        assert!(devlog.content.contains("Line 1099") || devlog.content.contains("Line 1098"));
    }

    #[test]
    fn test_small_file_no_seek_panic() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create a very small file (less than 50KB)
        let content = "# Small DEVLOG\n\nJust a few lines.";
        fs::write(&devlog_path, content).unwrap();

        // Should not panic on small files
        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(!devlog.truncated);
        assert!(devlog.content.contains("Small DEVLOG"));
    }

    #[test]
    fn test_exactly_500_lines_not_truncated() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create exactly 500 lines
        let mut content = String::new();
        for i in 0..500 {
            content.push_str(&format!("Line {}\n", i));
        }
        fs::write(&devlog_path, &content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(!devlog.truncated);
        assert_eq!(devlog.lines_read, 500);
    }

    #[test]
    fn test_501_lines_truncated() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create 501 lines
        let mut content = String::new();
        for i in 0..501 {
            content.push_str(&format!("Line {}\n", i));
        }
        fs::write(&devlog_path, &content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.truncated);
        assert_eq!(devlog.lines_read, 500);
        // Should contain Line 500 (the last line), not Line 0 (the first)
        assert!(devlog.content.contains("Line 500"));
        assert!(!devlog.content.contains("Line 0\n")); // Line 0 should be dropped
    }

    // =============================================================================
    // NFR: Error Handling Tests
    // =============================================================================

    #[test]
    fn test_nonexistent_path_returns_none() {
        let result = read_devlog(Path::new("/nonexistent/path/that/does/not/exist"));
        assert!(result.is_none());
    }

    // Note: Permission denied test requires elevated privileges to create,
    // so we test the logic path exists but can't easily test actual permission denial

    // =============================================================================
    // NFR: UTF-8 Handling Tests
    // =============================================================================

    #[test]
    fn test_utf8_content_preserved() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create content with various UTF-8 characters
        let content = "# DEVLOG 日本語\n\n## Entry with émojis 🎉\n- Fixed bug with café encoding\n- Added 中文 support";
        fs::write(&devlog_path, content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert!(devlog.content.contains("日本語"));
        assert!(devlog.content.contains("🎉"));
        assert!(devlog.content.contains("café"));
        assert!(devlog.content.contains("中文"));
    }

    #[test]
    fn test_binary_data_handled_gracefully() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        // Create file with some binary data mixed in
        let mut file = File::create(&devlog_path).unwrap();
        file.write_all(b"# Valid header\n").unwrap();
        file.write_all(&[0xFF, 0xFE, 0x00, 0x01]).unwrap(); // Invalid UTF-8 bytes
        file.write_all(b"\n## More valid content\n").unwrap();
        drop(file);

        // Should not panic, should handle gracefully
        let result = read_devlog(temp.path());

        // May return Some with lossy conversion or None depending on implementation
        // The key is it doesn't panic
        if let Some(devlog) = result {
            // If we get content, it should still have valid parts
            assert!(
                devlog.content.contains("Valid header")
                    || devlog.content.contains("More valid content")
            );
        }
    }

    // =============================================================================
    // Token Budget / Section Boundary Truncation Tests (AC 4)
    // =============================================================================

    #[test]
    fn test_truncate_at_section_boundary_no_truncation_needed() {
        let content =
            "# Section 1\n\nContent for section 1.\n\n# Section 2\n\nContent for section 2.";

        let (result, truncated) = truncate_at_section_boundary(content, 1000);

        assert!(!truncated);
        assert_eq!(result, content);
    }

    #[test]
    fn test_truncate_at_section_boundary_respects_headers() {
        let content = "# Section 1\n\nShort content.\n\n# Section 2\n\nThis section has much more content that would push us over the limit if we included it all.";

        let (result, truncated) = truncate_at_section_boundary(content, 50);

        assert!(truncated);
        // Should include section 1 but not section 2 (or truncate gracefully)
        assert!(result.contains("Section 1"));
        assert!(result.contains("(DEVLOG truncated to fit 10KB limit)"));
    }

    #[test]
    fn test_truncate_never_cuts_mid_section() {
        let content = "# Section 1\n\nFirst paragraph.\n\nSecond paragraph.\n\n# Section 2\n\nThird paragraph.";

        // Set limit that would cut mid-section if naive
        let (result, _truncated) = truncate_at_section_boundary(content, 60);

        // Should not have partial "Second para" or similar
        // Either include full section or not at all
        if result.contains("Second paragraph") {
            // If included, should be complete
            assert!(result.contains("First paragraph"));
        }
    }

    // =============================================================================
    // Integration Tests
    // =============================================================================

    #[test]
    fn test_realistic_devlog_content() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        let content = r#"# DEVLOG - Ronin Development

## 2024-12-21

### Morning Session
- Started work on AI context integration
- Implemented streaming response handling
- Fixed race condition in event listeners

### Blockers
- OpenRouter rate limiting during testing
- Need to implement caching strategy

## 2024-12-20

### Features Completed
- [x] ContextPanel component
- [x] Attribution display
- [x] Error state handling

### Next Steps
1. Implement DEVLOG analysis
2. Add token budget enforcement
3. Update attribution UI
"#;
        fs::write(&devlog_path, content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();

        // Should capture key information
        assert!(devlog.content.contains("AI context integration"));
        assert!(devlog.content.contains("Blockers"));
        assert!(devlog.content.contains("DEVLOG analysis"));
        assert!(!devlog.truncated);
    }

    #[test]
    fn test_lines_read_count_accurate() {
        let temp = create_test_project();
        let devlog_path = temp.path().join("DEVLOG.md");

        let content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
        fs::write(&devlog_path, content).unwrap();

        let result = read_devlog(temp.path());

        assert!(result.is_some());
        let devlog = result.unwrap();
        assert_eq!(devlog.lines_read, 5);
    }
}
