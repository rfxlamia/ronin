# Story 6.4: Context Aggregator

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **all my context sources (Git, DEVLOG, behavior) merged intelligently**,
So that **the AI provides accurate context recovery that understands my AI-assisted workflow ("Vibe Coding")**.

## Acceptance Criteria

1.  **Context Aggregation Logic**:
    - Implement `ContextAggregator` service in `src-tauri/src/aggregator/mod.rs`.
    - Service aggregates data from 3 sources:
        1.  **Git**: Last 5 commits, current branch, uncommitted files (via `git` CLI).
        2.  **DEVLOG**: Last 500 lines of `DEVLOG.md` (if exists).
        3.  **Behavior**: Window titles and file modification events from `observer_events` table (last 2 hours) using **`rusqlite`**.
    - **Performance**: Aggregation query and processing must complete in **< 500ms** (NFR1).
    - **UI Responsiveness**: All DB operations must use `spawn_blocking` to prevent freezing the main thread (NFR8).

2.  **AI Tool Detection (AI-Era Logic)**:
    - Identify window titles matching common AI tools (from Research 2025-12-26):
        - `claude.ai`, `chat.openai.com`, `chatgpt.com`, `gemini.google.com`
        - `perplexity.ai`, `phind.com`
        - `Cursor`, `Windsurf`, `Codeium`, `Copilot`, `v0.dev`
    - Classify these events as "AI Consultation Sessions" rather than generic app usage.

3.  **Pattern Detection Algorithms**:
    - **Correlation Engine**: Detect **"AI-Assisted Iteration"**:
        - Logic: AI Tool Window Event → File Edit Event (within 5 minutes).
    - **Stuck Pattern (New Definition)**:
        - Logic: **45+ minutes** of activity on the same file/topic...
        - AND repeated AI tool usage...
        - WITHOUT "progress signals" (Commit, New File, or successful Build/Test if detectable).
        - *Note: Old "5 edits without commit" rule is explicitly abandoned.*
    - **Focus Session**: Single file edits + AI tool usage for > 30 minutes.
    - **AI-Assisted Breakthrough**:
        - Logic: Long AI session (>15 min) → Successful test/compile (if detectable) or "Problem solved" commit message.

4.  **Payload Summarization (<10KB)**:
    - Summarize aggregated data into a JSON structure optimized for LLM consumption.
    - **Privacy Filter**:
        - Include: Relative file paths, commit messages, window application names/titles (whitelisted or genericized).
        - Exclude: File content (except DEVLOG), raw window titles if sensitive (e.g., "Bank of America").
    - **Attribution**: Generate a human-readable attribution string:
        - Format: `"Based on: 🔀 8 commits · 🤖 4 Claude sessions · 📝 DEVLOG"`
    - **Limit & Truncation Strategy**:
        - Strictly enforce **10KB** limit.
        - **Priority**: Always preserve (1) Attribution string, (2) Most recent 3 events/commits, (3) Recent DEVLOG.
        - Truncate oldest history first.

5.  **Integration & Error Handling**:
    - Expose `get_aggregated_context(project_id)` command for frontend.
    - Result must be JSON serializable.
    - Errors must be mapped to `RoninError` enum for consistent frontend handling.

## Tasks / Subtasks

- [x] **Scaffold Aggregator Module & Error Types**
  - [x] Create `src-tauri/src/error.rs` and define `enum RoninError` (if not exists) to standardize application errors.
  - [x] Create `src-tauri/src/aggregator/mod.rs` and `src-tauri/src/aggregator/types.rs`.
  - [x] Define `AggregatedContext` struct (Git, DevLog, Behavior sections).
  - [x] Register module in `src-tauri/src/lib.rs` (AppState) to ensure it's accessible.

- [x] **Implement Data Fetchers**
  - [x] `fetch_git_context(project_path)`: Reuse existing Git command logic but return structured data.
  - [x] `fetch_devlog_context(project_path)`: Read `DEVLOG.md`, take last 500 lines.
  - [x] `fetch_behavior_context(project_id, duration)`: SQL query to `observer_events` for last 2 hours.
    - [x] Use `rusqlite::params![]` macro for clarity.
    - [x] Wrap in `spawn_blocking` to prevent UI freeze.
    - [x] **Forward Context Linking**: Attribute generic AI windows to project based on subsequent window usage (Context Linking).

- [x] **Implement Pattern Detection Logic**
  - [x] Create `src-tauri/src/aggregator/patterns.rs`.
  - [x] Implement `detect_ai_tools(events)`: Match window titles against `AI_TOOLS` list.
  - [x] Implement `correlate_sessions(window_events, file_events)`: Find AI -> Edit pairs.
  - [x] Implement `detect_stuck(events)`: 45m window logic.
  - [x] Implement `detect_breakthrough(events)`: AI session -> Success signal logic.

- [x] **Implement Summarization & Privacy**
  - [x] Create `src-tauri/src/aggregator/summarizer.rs`.
  - [x] Implement privacy filtering (redact sensitive titles if not in whitelist).
  - [x] Implement truncation logic (Prioritize recent events & attribution).
  - [x] Generate attribution string.

- [x] **Expose Tauri Command**
  - [x] Create `src-tauri/src/commands/aggregator.rs`.
  - [x] Implement `#[tauri::command] get_project_context(id)`.
  - [x] **CRITICAL:** Use `spawn_blocking` for the aggregation task.
  - [x] Map errors to `RoninError` (from `src-tauri/src/error.rs`).
  - [x] Return combined JSON object.

- [x] **Testing**
  - [x] **Unit Tests:** Use standard `#[test]` and `tempfile` (no `rstest` dependency needed).
  - [x] Test pattern detection with mock events (verify "Stuck" vs "Iteration" vs "Breakthrough").
  - [x] Test payload size limit and truncation prioritization.
  - [x] **Performance Verification:** Add `tracing::instrument` to `get_aggregated_context` to verify <500ms execution.


## Dev Notes

### Architecture & Constraints

- **AI-Era Research Compliance**: Strictly follow `docs/analysis/research/domain-modern-developer-behavior-ai-era-research-2025-12-26.md`. Do NOT implement the old "Stack Overflow" or "5 edits" logic.
- **Privacy**: We are aggregating sensitive data (window titles).
    - **Rule**: Never send raw titles to the LLM unless they are "safe" (e.g., detected AI tools, IDEs, known docs).
    - **Strategy**: Map unknown windows to "Other Application" in the payload, but keep them in local SQLite for pattern detection.
- **Performance**: This runs on "Project Card Expand". It must be fast (<500ms). Use efficient SQL queries (indexed on timestamp/project_id).
- **Synchronous DB & UI Blocking**: `rusqlite` is synchronous. To prevent UI freezes (NFR8), ALL database operations must happen inside `spawn_blocking`.
- **Error Handling**: Use `RoninError` enum for structured error handling across the application, replacing ad-hoc `String` errors where possible.

### Relevant Files

- `src-tauri/src/aggregator/mod.rs` (New)
- `src-tauri/src/commands/aggregator.rs` (New)
- `src-tauri/src/db.rs` (Querying events)
- `src-tauri/src/error.rs` (New - Standardized Error Enum)
- `src-tauri/src/lib.rs` (Module registration)
- `docs/analysis/research/domain-modern-developer-behavior-ai-era-research-2025-12-26.md` (Source Truth)

### AI Tool List (Rust Constant)
```rust
const AI_TOOLS: &[&str] = &[
    "claude.ai", "chat.openai.com", "chatgpt.com",
    "gemini.google.com", "perplexity.ai", "phind.com",
    "Cursor", "Windsurf", "Codeium", "Copilot", "v0.dev"
];
```

### JSON Payload Structure (Target)
```json
{
  "project": "ronin",
  "git": { "branch": "main", "uncommitted": 2, "last_commit": "..." },
  "devlog": "...",
  "behavior": {
    "ai_sessions": 4,
    "last_active_file": "src/main.rs",
    "patterns": ["AI-Assisted Iteration", "Focus Session"],
    "stuck_detected": false
  },
  "attribution": "Based on: 🔀 8 commits · 🤖 4 Claude sessions · 📝 DEVLOG"
}
```

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

- Removed debug logs in `src-tauri/src/commands/ai.rs` and `src-tauri/src/aggregator/mod.rs` before 0.1.0-alpha release.

### Completion Notes List

- **Full Stack Integration**: Successfully integrated Aggregator service with AI Context generation and Frontend UI.
- **Behavior Display**: Added "Brain Circuit" icon to Context Panel to visualize AI tool sessions and behavior source.
- **Forward Context Linking**: Implemented a "Forward Context Linking" algorithm to correctly attribute generic AI windows (like "Claude - Chat") to projects. It looks ahead 5 window switches to find a project-specific window (e.g., IDE with project name) and links the preceding AI session to that project.
- **Warp Terminal Support**: Added support for Warp terminal (which has built-in AI) and ensured it attributes to project based on window title.
- **Verification**: Passed 200/200 backend tests and 246/246 frontend tests. Validated with `cargo clippy` and `npm run lint`.

### File List

- `src-tauri/src/aggregator/mod.rs`
- `src-tauri/src/aggregator/types.rs`
- `src-tauri/src/aggregator/fetchers.rs`
- `src-tauri/src/aggregator/patterns.rs`
- `src-tauri/src/aggregator/summarizer.rs`
- `src-tauri/src/commands/aggregator.rs`
- `src-tauri/src/commands/ai.rs`
- `src-tauri/src/ai/context.rs`
- `src-tauri/src/ai/openrouter.rs`
- `src-tauri/src/error.rs`
- `src/types/context.ts`
- `src/components/ContextPanel.tsx`
- `src/hooks/useAiContext.ts`

