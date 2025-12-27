/// Pattern detection for AI-era developer behavior
///
/// Implements pattern detection algorithms based on AI-era research (2025-12-26)
/// Detects: AI tool usage, iteration patterns, stuck states, breakthroughs, and focus sessions
use super::types::{AiToolSession, FileEvent, ObserverEvent};

/// AI tools for detection (from AI-era research)
pub const AI_TOOLS: &[&str] = &[
    // Chatbot interfaces
    "Claude", // Matches "Claude - Chat" window titles
    "claude.ai",
    "ChatGPT", // Matches "ChatGPT" window titles
    "chat.openai.com",
    "chatgpt.com",
    "gemini.google.com",
    "Gemini",
    "perplexity.ai",
    "Perplexity",
    "phind.com",
    // AI-native IDEs
    "Cursor",
    "Windsurf",
    "Codeium",
    // Embedded AI
    "Copilot",
    "GitHub Copilot",
    // Code generation tools
    "v0.dev",
    "bolt.new",
    "replit.com",
    "Replit",
];

/// Detect AI tool usage sessions from window events
pub fn detect_ai_tools(events: &[ObserverEvent]) -> Vec<AiToolSession> {
    let mut sessions = Vec::new();
    let mut current_session: Option<(String, i64, Vec<String>)> = None;

    for event in events {
        if let Some(title) = &event.window_title {
            let is_ai_tool = AI_TOOLS.iter().any(|tool| {
                title.contains(tool)
                    || event
                        .process_name
                        .as_ref()
                        .map_or(false, |p| p.contains(tool))
            });

            if is_ai_tool {
                let tool_name = AI_TOOLS
                    .iter()
                    .find(|tool| title.contains(*tool))
                    .or_else(|| {
                        event
                            .process_name
                            .as_ref()
                            .and_then(|p| AI_TOOLS.iter().find(|tool| p.contains(*tool)))
                    })
                    .unwrap_or(&"Unknown AI Tool")
                    .to_string();

                match &mut current_session {
                    Some((name, _start, titles)) if *name == tool_name => {
                        // Continue existing session
                        titles.push(title.clone());
                    }
                    Some((name, start, titles)) => {
                        // Different tool, end previous session
                        sessions.push(AiToolSession {
                            tool_name: name.clone(),
                            start_time: *start,
                            end_time: event.timestamp,
                            window_titles: titles.clone(),
                        });
                        current_session = Some((tool_name, event.timestamp, vec![title.clone()]));
                    }
                    None => {
                        // Start new session
                        current_session = Some((tool_name, event.timestamp, vec![title.clone()]));
                    }
                }
            } else if let Some((name, start, titles)) = current_session.take() {
                // Non-AI event, close current session
                sessions.push(AiToolSession {
                    tool_name: name,
                    start_time: start,
                    end_time: event.timestamp,
                    window_titles: titles,
                });
            }
        }
    }

    // Close final session if exists
    if let Some((name, start, titles)) = current_session {
        let end_time = events.last().map(|e| e.timestamp).unwrap_or(start);
        sessions.push(AiToolSession {
            tool_name: name,
            start_time: start,
            end_time,
            window_titles: titles,
        });
    }

    sessions
}

/// Correlate AI sessions with file edits to detect iteration patterns
pub fn correlate_ai_iterations(
    ai_sessions: &[AiToolSession],
    file_events: &[FileEvent],
) -> Vec<String> {
    let mut patterns = Vec::new();
    const CORRELATION_WINDOW_MS: i64 = 5 * 60 * 1000; // 5 minutes

    for session in ai_sessions {
        // Check if file edit happened within 5 minutes after AI session
        let has_following_edit = file_events.iter().any(|fe| {
            fe.timestamp >= session.start_time
                && fe.timestamp <= session.end_time + CORRELATION_WINDOW_MS
        });

        if has_following_edit {
            patterns.push("AI-Assisted Iteration".to_string());
        }
    }

    patterns
}

/// Detect stuck pattern (new AI-era definition)
/// Logic: 45+ minutes + repeated AI tool usage + NO progress signals
pub fn detect_stuck(
    events: &[ObserverEvent],
    ai_sessions: &[AiToolSession],
    file_events: &[FileEvent],
) -> bool {
    const STUCK_THRESHOLD_MS: i64 = 45 * 60 * 1000; // 45 minutes

    if events.is_empty() || ai_sessions.is_empty() {
        return false;
    }

    // Check if there's a long duration on same topic
    let total_duration = events.last().unwrap().timestamp - events.first().unwrap().timestamp;
    if total_duration < STUCK_THRESHOLD_MS {
        return false;
    }

    // Check for repeated AI tool usage (2+ sessions)
    if ai_sessions.len() < 2 {
        return false;
    }

    // Check for progress signals:
    // - File modifications (indicates active work)
    // - Multiple different files (indicates progress)
    let unique_files: std::collections::HashSet<_> =
        file_events.iter().map(|fe| &fe.file_path).collect();

    // If working on 3+ different files, consider it progress
    if unique_files.len() >= 3 {
        return false;
    }

    // If there are recent file modifications (within last 10 minutes), not stuck
    let last_event_time = events.last().unwrap().timestamp;
    let recent_edits = file_events
        .iter()
        .any(|fe| last_event_time - fe.timestamp < 10 * 60 * 1000);

    // Stuck if: long duration + repeated AI + no recent progress
    !recent_edits
}

/// Detect focus session pattern
/// Logic: Single file + AI tool usage for >30 minutes
pub fn detect_focus_session(
    ai_sessions: &[AiToolSession],
    file_events: &[FileEvent],
) -> Option<String> {
    const FOCUS_THRESHOLD_MS: i64 = 30 * 60 * 1000; // 30 minutes

    if ai_sessions.is_empty() || file_events.is_empty() {
        return None;
    }

    // Check for single file focus
    let unique_files: std::collections::HashSet<_> =
        file_events.iter().map(|fe| &fe.file_path).collect();

    if unique_files.len() == 1 {
        // Calculate total AI session duration
        let total_ai_duration: i64 = ai_sessions.iter().map(|s| s.end_time - s.start_time).sum();

        if total_ai_duration > FOCUS_THRESHOLD_MS {
            return Some("Focus Session".to_string());
        }
    }

    None
}

/// Detect breakthrough pattern
/// Logic: Long AI session (>15 min) followed by success signal
pub fn detect_breakthrough(ai_sessions: &[AiToolSession]) -> Option<String> {
    const BREAKTHROUGH_THRESHOLD_MS: i64 = 15 * 60 * 1000; // 15 minutes

    for session in ai_sessions {
        let duration = session.end_time - session.start_time;
        if duration > BREAKTHROUGH_THRESHOLD_MS {
            // Check for success indicators in window titles
            let has_success = session.window_titles.iter().any(|title| {
                let lower = title.to_lowercase();
                lower.contains("solved")
                    || lower.contains("fixed")
                    || lower.contains("working")
                    || lower.contains("success")
            });

            if has_success {
                return Some("AI-Assisted Breakthrough".to_string());
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_tool_detection_claude() {
        let events = vec![
            ObserverEvent {
                timestamp: 1000,
                event_type: "window_focus".to_string(),
                window_title: Some("Claude - Chat".to_string()),
                process_name: Some("chrome".to_string()),
                file_path: None,
            },
            ObserverEvent {
                timestamp: 2000,
                event_type: "window_focus".to_string(),
                window_title: Some("Claude - New conversation".to_string()),
                process_name: Some("chrome".to_string()),
                file_path: None,
            },
        ];

        let sessions = detect_ai_tools(&events);
        assert_eq!(sessions.len(), 1);
        assert!(sessions[0].tool_name.contains("Claude"));
    }

    #[test]
    fn test_ai_tool_detection_multiple_tools() {
        let events = vec![
            ObserverEvent {
                timestamp: 1000,
                event_type: "window_focus".to_string(),
                window_title: Some("claude.ai - Chat".to_string()),
                process_name: None,
                file_path: None,
            },
            ObserverEvent {
                timestamp: 2000,
                event_type: "window_focus".to_string(),
                window_title: Some("VS Code".to_string()),
                process_name: None,
                file_path: None,
            },
            ObserverEvent {
                timestamp: 3000,
                event_type: "window_focus".to_string(),
                window_title: Some("ChatGPT".to_string()),
                process_name: None,
                file_path: None,
            },
        ];

        let sessions = detect_ai_tools(&events);
        assert_eq!(sessions.len(), 2);
    }

    #[test]
    fn test_iteration_correlation() {
        let ai_sessions = vec![AiToolSession {
            tool_name: "claude.ai".to_string(),
            start_time: 1000,
            end_time: 5000,
            window_titles: vec![],
        }];

        let file_events = vec![FileEvent {
            timestamp: 6000, // Within 5 min window
            file_path: "src/main.rs".to_string(),
        }];

        let patterns = correlate_ai_iterations(&ai_sessions, &file_events);
        assert_eq!(patterns.len(), 1);
        assert_eq!(patterns[0], "AI-Assisted Iteration");
    }

    #[test]
    fn test_stuck_detection_not_stuck_with_progress() {
        let events = vec![
            ObserverEvent {
                timestamp: 0,
                event_type: "window_focus".to_string(),
                window_title: Some("claude.ai".to_string()),
                process_name: None,
                file_path: None,
            },
            ObserverEvent {
                timestamp: 50 * 60 * 1000, // 50 minutes later
                event_type: "window_focus".to_string(),
                window_title: Some("claude.ai".to_string()),
                process_name: None,
                file_path: None,
            },
        ];

        let ai_sessions = vec![
            AiToolSession {
                tool_name: "claude.ai".to_string(),
                start_time: 0,
                end_time: 10000,
                window_titles: vec![],
            },
            AiToolSession {
                tool_name: "claude.ai".to_string(),
                start_time: 20000,
                end_time: 30000,
                window_titles: vec![],
            },
        ];

        let file_events = vec![FileEvent {
            timestamp: 48 * 60 * 1000, // Recent edit
            file_path: "src/main.rs".to_string(),
        }];

        let stuck = detect_stuck(&events, &ai_sessions, &file_events);
        assert!(!stuck, "Should not be stuck with recent progress");
    }

    #[test]
    fn test_focus_session_detection() {
        let ai_sessions = vec![AiToolSession {
            tool_name: "claude.ai".to_string(),
            start_time: 0,
            end_time: 35 * 60 * 1000, // 35 minutes
            window_titles: vec![],
        }];

        let file_events = vec![FileEvent {
            timestamp: 1000,
            file_path: "src/main.rs".to_string(),
        }];

        let focus = detect_focus_session(&ai_sessions, &file_events);
        assert!(focus.is_some());
        assert_eq!(focus.unwrap(), "Focus Session");
    }

    #[test]
    fn test_breakthrough_detection() {
        let ai_sessions = vec![AiToolSession {
            tool_name: "claude.ai".to_string(),
            start_time: 0,
            end_time: 20 * 60 * 1000, // 20 minutes
            window_titles: vec!["Claude - Problem solved!".to_string()],
        }];

        let breakthrough = detect_breakthrough(&ai_sessions);
        assert!(breakthrough.is_some());
        assert_eq!(breakthrough.unwrap(), "AI-Assisted Breakthrough");
    }
}
