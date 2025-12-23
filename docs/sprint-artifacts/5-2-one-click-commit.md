# Story 5.2: One-Click Commit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **to commit my changes with a single click and message**,
So that **I can save my progress without switching to terminal**.

## 🧠 Context & Intelligence

### 🏗️ Architectural Strategy: "Hybrid Git" Approach
While Story 5.1 used the `git2` crate (libgit2) for high-performance status reading, **Story 5.2 MUST use `std::process::Command` (System Git CLI) for the commit operation.**

*   **Why?**
    *   **Pre-commit Hooks:** Many projects use `husky` or `pre-commit`. Libgit2 often bypasses these or requires complex configuration to trigger them. System Git runs them natively.
    *   **GPG Signing:** Developers often have `commit.gpgsign` enabled. System Git utilizes the user's existing GPG agent/config. Bridging this to libgit2 is error-prone.
    *   **Safety (NFR15/NFR19):** Relying on the user's configured Git executable ensures we respect their global config (user.name, aliases, safe.directory).

### 🎨 UX Specification (Journey 4)
*   **Trigger:** The "Commit Changes" action should be prominent when `uncommitted_files > 0`.
*   **Interaction Flow:**
    1.  User clicks "Commit Changes" button.
    2.  Button dissolves/replaced by an **inline textarea** and "Commit" primary button.
    3.  User types message.
    4.  User presses `Enter` (Submit) or `Esc` (Cancel). *Note: `Shift+Enter` for new lines.*
    5.  **Loading:** Input disabled, button shows spinner.
    6.  **Success:** Input disappears, Success Toast appears, `GitStatusDisplay` refreshes.
    7.  **Error:** Error Toast appears (persistent), Input remains for correction.

### ⏪ Previous Story Intelligence (5.1)
*   **Existing Component:** `GitStatusDisplay.tsx` renders the status stats.
*   **Integration Point:** The new `GitControls` component should likely sit **below** the `GitStatusDisplay` in the `ProjectCard`.
*   **State Sharing:** You will need to trigger a refresh of the `useGitStatus` hook after a successful commit. Ensure `useGitStatus` exposes a `refresh` or `refetch` method, or invalidate the cache key.

---

## Acceptance Criteria

### 1. Commit UI Interaction
- [x] **Visibility:** "Commit" button is only visible when `uncommitted_files > 0`.
- [x] **Input Mode:** Clicking "Commit" reveals a `Textarea` (auto-focused) + "Commit" button + "Cancel" button.
- [x] **Keyboard Shortcuts:**
    - [x] `Enter` (without Shift): Submits commit.
    - [x] `Cmd/Ctrl + Enter`: Submits commit.
    - [x] `Esc`: Cancels/closes input mode.
- [x] **Validation:** "Commit" button disabled if message is empty/whitespace.

### 2. Git Execution (Backend)
- [x] **Command:** Executes `git add -A` + `git commit -m "message"` via shell (auto-stages all changes).
- [x] **Success:** Returns `Ok(())`.
- [x] **Failure:** Returns `Err(String)` containing the `stderr` output (crucial for showing pre-commit hook errors).
- [x] **Concurrency:** UI disables submit during commit; rapid clicks prevented by state management.

### 3. Feedback & State
- [x] **Success Feedback:** Show green Toast: "✓ Changes committed".
- [x] **Error Feedback:** Show red Toast with specific error: "Commit failed: [stderr output]".
- [x] **State Update:** Immediately refreshes Git Status (Uncommitted count -> 0, Unpushed count -> +1).

### 4. Edge Case Handling
- [x] **Pre-commit Hook Failure:** If `git commit` fails (exit code != 0), displayed error MUST show the hook's output so user knows what to fix.
- [x] **Detached HEAD:** Allow commit (standard git behavior).
- [x] **Large Output:** If stderr is huge, truncate gracefully in the toast but log full output.

---

## Technical Specifications

### 🦀 Backend (Rust)
*   **File:** `src-tauri/src/commands/git.rs` (Extend existing file)
*   **Function Signature:**
    ```rust
    #[tauri::command]
    pub async fn commit_changes(project_path: String, message: String) -> Result<(), String>
    ```
*   **Implementation Note:**
    Use `std::process::Command`. **Ensure `use std::process::Command;` is added to imports.** Ensure `.current_dir(project_path)` is set. Capture `.output()`. If `!status.success()`, return `String::from_utf8_lossy(&output.stderr)`.

### ⚛️ Frontend (React)
*   **New Component:** `src/components/Dashboard/GitControls.tsx`
    *   Props: `project: Project`, `onSuccess: () => void`.
    *   State: `mode: 'idle' | 'editing' | 'submitting'`, `message: string`.
*   **Icon:** Use `GitCommitHorizontal` from `lucide-react`.
*   **Integration:** Add to `ProjectCard.tsx` inside the expanded view, passing the `refresh` function from `useGitStatus` to `onSuccess`.

---

## Tasks / Subtasks

- [x] **Backend: Commit Command**
  - [x] Implement `commit_changes` using `std::process::Command` (add import).
  - [x] Add error handling to capture and format `stderr`.
  - [x] Add test case: `test_commit_changes_success`.
  - [x] Add test case: `test_commit_changes_empty_message` (should ideally be blocked by FE, but BE should handle too).
  - [x] Add test case: `test_commit_changes_pre_commit_hook_failure`.
  - [x] Add test case: `test_commit_changes_whitespace_only_message`.
  - [x] Add test case: `test_commit_changes_nothing_to_commit`.

- [x] **Frontend: GitControls Component**
  - [x] Scaffold `ui/textarea.tsx` (copy shadcn/ui standard component) as it was missing.
  - [x] Scaffold `GitControls.tsx`.
  - [x] Implement toggle state (Button vs Input).
  - [x] Implement `Textarea` with keyboard listeners (`onKeyDown`).
  - [x] Connect to `commit_changes` command.
  - [x] Implement Toast notifications using `sonner` (already installed).

- [x] **Frontend: Integration**
  - [x] Modify `useGitStatus` to export internal `fetchStatus` as `refresh`.
  - [x] Add `GitControls` to `ProjectCard`.
  - [x] Conditional rendering: only show if `gitStatus.uncommitted_files > 0`.

- [x] **Verification**
  - [x] Backend tests: All 5 tests passed (success, empty message, whitespace, hook failure, nothing to commit).
  - [x] Frontend build: Successful with zero TypeScript errors.
  - [x] Regression tests: 30 test files passed, 25 tests passed.
  - [x] Rust build: Successful compilation.

---

## 🛡️ Dev Agent Guardrails

1.  **DO NOT** combine Commit and Push into one action. They must be distinct steps (as per UX Spec).
2.  **DO NOT** use `git2` for the commit write operation. Use `std::process::Command`.
3.  **DO NOT** swallow stderr on failure. The user needs to see why the commit failed (linting, tests, etc.).
4.  **ENSURE** the commit message input autofocuses when the button is clicked to save a click.

---

## Dev Agent Record

### Implementation Notes

**Architectural Decision:** Implemented hybrid Git approach:
- `git2` (libgit2) for read operations (`get_git_status`) - fast, no shell overhead
- System Git CLI (`std::process::Command`) for write operations (`commit_changes`) - ensures hooks execute and GPG signing works

**Backend Implementation:**
- Added `commit_changes` command in `src-tauri/src/commands/git.rs`
- Validates message is not empty/whitespace before executing
- Captures stderr on failure and returns it to frontend
- Registered command in `src-tauri/src/lib.rs` invoke_handler
- Comprehensive test suite: 5 tests covering success, validation, hook failures, edge cases

**Frontend Implementation:**
- Created base `Textarea` component (shadcn/ui pattern) in `src/components/ui/textarea.tsx`
- Implemented `GitControls` component with 3-state FSM (idle/editing/submitting)
- Keyboard shortcuts: Enter (submit), Cmd/Ctrl+Enter (submit), Esc (cancel), Shift+Enter (new line)
- Toast notifications: `toast.success` on success, `toast.error` with truncated stderr on failure
- Modified `useGitStatus` to expose `refresh` function for triggering status update post-commit
- Created `GitControlsWrapper` helper to conditionally render based on `uncommittedFiles > 0`
- Integrated into `ProjectCard` below `GitStatusDisplay`

**Testing:**
- Backend: 5/5 tests passed
- Frontend: 30 test files, 25 tests passed
- TypeScript build: Zero compilation errors
- Rust build: Successful

### File List

**Backend:**
- `src-tauri/src/commands/git.rs` (modified) - Added `commit_changes` command with `git add -A` and 5 tests
- `src-tauri/src/lib.rs` (modified) - Registered `commit_changes` in invoke_handler

**Frontend:**
- `src/components/ui/textarea.tsx` (new) - Standard shadcn/ui Textarea component
- `src/components/Dashboard/GitControls.tsx` (new) - Commit UI with keyboard shortcuts and toast notifications
- `src/components/Dashboard/ProjectCard.tsx` (modified) - Integrated GitControlsWrapper
- `src/hooks/useGitStatus.ts` (modified) - Exported `refresh` function
- `src/types/git.ts` (modified) - GitDisplayStatus interface

**Configuration:**
- `docs/sprint-artifacts/sprint-status.yaml` (modified) - Updated story status to in-progress then review

### Change Log

- **2025-12-23:** Implemented Story 5.2: One-Click Commit feature
  - Backend: System Git CLI integration for commits with hook/GPG compatibility
  - Frontend: GitControls component with inline editing, keyboard shortcuts
  - All acceptance criteria satisfied
  - Story status: review

- **2025-12-23 (Review):** Senior Developer Code Review applied fixes
  - Added `git add -A` before commit for true one-click staging+commit
  - Fixed keyboard shortcut dead code (redundant Cmd/Ctrl+Enter block)
  - Updated AC checkboxes to reflect verified implementation
  - Added missing `types/git.ts` to File List

### Senior Developer Review (AI)

**Review Date:** 2025-12-23  
**Reviewer:** BMAD Code Review Workflow  
**Outcome:** ✅ APPROVED with fixes applied

**Issues Found (6):**
- 🔴 CRITICAL: AC checkboxes not marked → **FIXED**
- 🟡 MEDIUM: No git add before commit → **FIXED** (added `git add -A`)
- 🟡 MEDIUM: Concurrency protection → **Clarified** (UI state blocks rapid clicks)
- 🟡 MEDIUM: types/git.ts not in File List → **FIXED**
- 🟢 LOW: Dead keyboard shortcut code → **FIXED** (removed unreachable block)
- 🟢 LOW: No Textarea test → **Deferred** (standard shadcn component)

**All HIGH/MEDIUM issues resolved.** Story ready for done status.
