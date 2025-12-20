# Story 3.4: AI Context Generation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to ask "Where was I?" and receive a helpful context summary**,
So that **I can resume work on dormant projects with confidence**.

## Definition of Done

- [ ] All 5 acceptance criteria pass manual verification
- [ ] All tasks checked off
- [ ] Regression tests pass (npm test + cargo test)
- [ ] Cache <100KB for 10 projects (performance check)
- [ ] Manual test notes filled by Product Lead

## Acceptance Criteria

1. **OpenRouter Streaming Client**
   - Method: `chat_stream()` in `OpenRouterClient` (Rust)
   - SSE support for incremental chunks
   - Handles rate limits (429) and auth errors (401) gracefully
   - Uses `reqwest` with `stream` feature
   - Timeout: 30 seconds for first chunk (matches NFR1), abort if no data received
   - Model fallback: Try default → fallback models if 404 (see Dev Notes)
   - Emits Tauri events in exact format (see Event Emission Pattern below)

2. **Context Aggregation (Git-Only MVP)**
   - Aggregates Git context: last 5-20 commits, current branch, uncommitted files list
   - Aggregates basic project info: name, path, last modified date
   - Formats context into system prompt (<2KB token usage optimized, <10KB total payload)
   - Validates payload size <10KB before sending (logs warning if >8KB)
   - *Note: DEVLOG and Silent Observer integration comes in later stories*

3. **Prompt Engineering (The "Brain")**
   - System prompt enforces **Ronin Philosophy**:
     - Empathetic tone (仁 Jin): "You were stuck" NOT "You were unproductive"
     - Suggests, never commands (勇 Yu): "Consider..." NOT "You must..."
     - Concise and actionable
   - Output format: Markdown (bolding key terms, lists for steps)
   - Structure: "Context" (What you were doing) + "Next Steps" (Actionable suggestions)
   - Streaming text announced via ARIA live region for accessibility

4. **Tauri Command: `generate_context`**
   - Frontend invokes `generate_context(project_id)`
   - Backend emits `ai-chunk` events to frontend
   - Backend emits `ai-complete` or `ai-error` when done
   - Caches successful response in SQLite `ai_cache` table (see schema below)
   - Cache eviction: Delete contexts older than 7 days on app startup

5. **Frontend Integration**
   - `ProjectCard` calls `generate_context` when expanded
   - Updates `ContextPanel` state based on events (`streaming` → `complete`)
   - Handles errors by showing `ContextPanel` error state with illustrations
   - **Online mode:** ALWAYS regenerate, cache for offline fallback
   - **Offline mode:** Show cached context with "Cached (Offline)" badge
   - Retry button triggers full regeneration (NOT cached context)

## Event Emission Pattern

Backend emits events in this EXACT format (matches Story 3.3 ContextPanel expectations):

```rust
// Emit chunk during streaming
window.emit("ai-chunk", json!({ "text": chunk_string }))?;

// Emit on completion
window.emit("ai-complete", json!({
    "text": full_context,
    "attribution": { "commits": 12, "sources": ["git"] }
}))?;

// Emit on error
window.emit("ai-error", json!({ "message": "AI reconnecting..." }))?;
```

## Tasks / Subtasks

- [ ] **Implement OpenRouter Streaming** (`src-tauri/src/ai/openrouter.rs`) - *Prerequisite for Task 3*
  - [ ] Add dependencies to `src-tauri/Cargo.toml` if not already from Story 3.1:
    ```toml
    futures-util = "0.3"
    eventsource-stream = "0.2"  # SSE parsing
    tokio-stream = "0.1"        # Stream utilities
    ```
  - [ ] Implement `OpenRouterClient::chat_stream` with exact signature:
    ```rust
    pub async fn chat_stream(
        &self,
        messages: Vec<Message>,
        window: tauri::Window
    ) -> Result<(), String>
    ```
  - [ ] Returns `Result<(), String>` (emits via Tauri events, not Stream return type)
  - [ ] Takes `window` parameter for event emission (see Event Emission Pattern)
  - [ ] Implement model fallback logic from Story 3.1 Dev Notes:
    - Try "xiaomi/mimo-v2-flash:free"
    - On 404, try "z-ai/glm-4.5-air:free"
    - On 404, try "openai/gpt-oss-20b:free"
    - If all fail, emit error: "OpenRouter free models unavailable"
  - [ ] Add unit tests for streaming (using mock server or trait)

- [ ] **Implement Context Builder** (`src-tauri/src/ai/context.rs`) - *Prerequisite for Task 3*
  - [ ] **CRITICAL:** Create at `src-tauri/src/ai/context.rs` (NOT `commands/` or root)
  - [ ] Export in `src-tauri/src/ai/mod.rs`: `pub mod context;`
  - [ ] Follow module pattern from Story 3.1 commit 534a694
  - [ ] Implement `build_git_context(project_path)` by calling existing commands:
    - **CRITICAL:** Commit 83eaaa4 already implemented `get_git_full_context(path)` in `src-tauri/src/commands/git.rs` returning `GitContext { branch, status, commits }`
    - **DO NOT REIMPLEMENT** git logic - call this existing command
    - Format the `GitContext` output for AI consumption (<5KB)
  - [ ] Implement `build_system_prompt(context)` using template (see Dev Notes)
  - [ ] Validate total payload <10KB, log warning if >8KB

- [ ] **Create Tauri Command** (`src-tauri/src/commands/ai.rs`) - *Depends on Task 1+2*
  - [ ] Update `src-tauri/src/commands/ai.rs`
  - [ ] Add `generate_context` command signature:
    ```rust
    #[tauri::command]
    pub async fn generate_context(
        project_id: i64,
        window: tauri::Window,
        pool: State<'_, SqlitePool>
    ) -> Result<(), String>
    ```
  - [ ] Implement event emission logic using `window.emit()` (see Event Emission Pattern)
  - [ ] Add caching logic (SQLite `ai_cache` table, see schema below)
  - [ ] Offline detection: Catch network errors (Connection Refused, DNS failure), fallback to cache
  - [ ] Register command in `src-tauri/src/lib.rs` invoke_handler

- [ ] **Frontend Integration** (`src/components/Dashboard/ProjectCard.tsx`)
  - [ ] Update `src/components/Dashboard/ProjectCard.tsx`
  - [ ] Check existing hooks first: `src/hooks/` for `useProjects`, `useSettings` patterns
  - [ ] If no pattern exists, create `src/hooks/useAiContext.ts` following React 19.2.3 best practices
  - [ ] State management: Use Zustand if available (check Story 2.x), else React Context
  - [ ] Add hook to handle invocation and event listening:
    ```typescript
    const { generateContext, contextState, contextText, attribution } = useAiContext();
    ```
  - [ ] Call `generateContext(projectId)` when card expands
  - [ ] Listen for `ai-chunk`, `ai-complete`, `ai-error` events
  - [ ] Connect `ContextPanel` to the hook's state
  - [ ] Add "Retry" handler for error states (triggers full regeneration)

- [ ] **Cache Implementation** (`src-tauri/src/db.rs` or migration file)
  - [ ] Create `ai_cache` table with schema:
    ```sql
    CREATE TABLE IF NOT EXISTS ai_cache (
        project_id INTEGER PRIMARY KEY,
        context_text TEXT NOT NULL,
        attribution_json TEXT NOT NULL, -- JSON: {"commits": 12, "sources": ["git"]}
        generated_at INTEGER NOT NULL,  -- Unix timestamp
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    ```
  - [ ] Implement read/write cache logic in Rust
  - [ ] Cache eviction: Delete contexts older than 7 days on app startup

- [ ] **Integration Testing**
  - [ ] Integration test: Mock ProjectCard click → verify `ai-chunk` events emitted → verify ContextPanel state transitions
  - [ ] Test offline fallback with cached context
  - [ ] Test model fallback logic (mock 404 responses)

- [ ] **Regression Testing (REQUIRED - Per project-context.md)**
  - [ ] Run `npm test` - all tests must pass (Epic 1-3)
  - [ ] Verify test count increases (never decreases)
  - [ ] Run `cargo test` - all backend tests pass

## Dev Notes

### Model Selection Strategy

Default model: `"xiaomi/mimo-v2-flash:free"` (fastest free model as of Dec 2024)

Fallback order (if default returns 404 or model_not_found):
1. `"z-ai/glm-4.5-air:free"`
2. `"openai/gpt-oss-20b:free"`

If all 3 fail: "OpenRouter free models unavailable. Please check your API key or try later."

Store last successful model in settings table to avoid re-trying failed models.

### System Prompt Template

```markdown
You are Ronin, a mindful AI consultant analyzing a developer's project context.

**Philosophy Guidelines:**
- 勇 (Yu): Suggest, never command. Use "Consider...", "Suggestion:", not "You must..."
- 仁 (Jin): Empathetic tone. "You were stuck on auth.rs" NOT "You were unproductive"
- Output format: Markdown with **bold** for key terms

**Context provided:**
{git_context}

**Your response structure:**
## Context
{What they were working on - file, feature, specific location}

## Next Steps
{Actionable suggestions, 2-3 bullet points}

**Based on:** {attribution sources}
```

### Architecture References

- **OpenRouter Client:** Story 3.1 (commit 534a694) created stub with `get_available_model()` and secure key storage
- **Git Commands:** Story 3.2 (commit 83eaaa4) implemented `get_git_full_context()` - REUSE this, don't duplicate
- **ContextPanel:** Story 3.3 expects `ai-chunk`, `ai-complete`, `ai-error` events with specific payload format
- **Module Structure:** Follow `src-tauri/src/ai/` pattern from Story 3.1

### Error State Illustrations

If illustrations exist, use these paths:
- Offline: `public/assets/offline-meditation.png`
- API Error: `public/assets/api-sharpening.png`
- Rate Limit: `public/assets/ratelimit-resting.png`

If illustrations don't exist yet, use `.ronin-placeholder` divs (per project-context.md lines 246-258):
```tsx
<div className="ronin-placeholder" style={{ width: '200px', height: '200px' }}>
  [Offline Meditation Illustration]
</div>
```

### Caching Strategy

- **Online mode:** ALWAYS regenerate when user expands card, cache successful response for offline fallback
- **Offline mode:** Show cached context with "Cached (Offline)" badge
- **Never show old cache** when internet is available
- **Cache validity:** 7 days (auto-delete older contexts on app startup)
- **Performance:** Cache <100KB for 10 projects (validate during testing)

### Privacy & Performance

- **Privacy:** Do NOT send file contents yet. Only send commit messages, branch names, and file paths. This keeps the payload small and privacy-preserving.
- **Payload limit:** <10KB total (NFR29). Assert before sending, log warning if >8KB.
- **Streaming:** Ensure chunks are emitted as text fragments, not full JSON objects, to the frontend for smooth rendering.
- **First chunk performance:** Must arrive within 2 seconds (NFR1, NFR23).

### Project Structure Notes

- `src-tauri/src/ai/openrouter.rs` needs streaming implementation (stub from Story 3.1)
- `src-tauri/src/ai/context.rs` (NEW) will be the context builder
- `src-tauri/src/commands/ai.rs` will be the main entry point for `generate_context`
- `src/types/context.ts` (created in Story 3.3) should be used for frontend types
- `src/hooks/useAiContext.ts` (NEW or extend existing hook pattern)

### References

- [Architecture: AI Context Pipeline](docs/architecture.md#ai-context-pipeline-p0---core-differentiator)
- [UX Spec: Context Recovery](docs/ux-design-specification.md#journey-1-context-recovery-vs-core-flow)
- [Philosophy: 勇 (Yu) - AI Suggests](docs/PHILOSOPHY.md)
- [Story 3.1: OpenRouter API Integration](docs/sprint-artifacts/3-1-openrouter-api-integration.md)
- [Story 3.2: Git History Analysis](docs/sprint-artifacts/3-2-git-history-analysis.md)
- [Story 3.3: ContextPanel Component](docs/sprint-artifacts/3-3-contextpanel-component.md)

## Manual Test Notes (Product Lead Verification)

### Test Case 1: AI Context Generation (Happy Path)

**Steps:**
1. Open Ronin dashboard
2. Expand a project card with git history (>5 commits)
3. Observe streaming context appearing
4. Verify attribution shows commit count

**Expected Result:**
- First content appears <2s
- Full context completes <10s
- Text streams progressively (chunk-by-chunk, NOT word-by-word)
- Attribution visible: "Based on: 🔀 15 commits"
- RoninLoader meditation animation during streaming
- Markdown formatting (bold key terms, bullet lists)

**Actual Result:** [To be filled during verification]

---

### Test Case 2: Offline Mode with Cache

**Steps:**
1. Expand a project card while online (generates and caches context)
2. Disconnect internet
3. Close and reopen the same project card
4. Verify cached context shows

**Expected Result:**
- Cached context displays immediately
- "Cached (Offline)" badge visible
- No loading animation
- Retry button disabled (no internet)

**Actual Result:** [To be filled during verification]

---

### Test Case 3: Error Handling (Rate Limit)

**Steps:**
1. Trigger multiple context generations rapidly (>5 in 10 seconds)
2. Observe rate limit error (429)
3. Verify error state UI

**Expected Result:**
- Error illustration: Ronin sharpening blade
- Message: "AI resting. Try again in 30s"
- Retry button enabled after cooldown
- Local git data still visible

**Actual Result:** [To be filled during verification]

---

### Test Case 4: Model Fallback

**Steps:**
1. (Requires manual API key manipulation or mock) Cause default model to return 404
2. Trigger context generation
3. Verify fallback to alternative model

**Expected Result:**
- System automatically tries fallback models
- Context generation succeeds with alternative model
- No visible error to user (seamless fallback)
- Console logs model switch (for debugging)

**Actual Result:** [To be filled during verification]

---

### Test Case 5: Cache Eviction

**Steps:**
1. Manually set `generated_at` timestamp to 8 days ago in SQLite
2. Restart Ronin application
3. Query `ai_cache` table

**Expected Result:**
- Old cached context (>7 days) deleted on startup
- Recent caches (<7 days) preserved
- App startup <3s (eviction doesn't block UI)

**Actual Result:** [To be filled during verification]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
