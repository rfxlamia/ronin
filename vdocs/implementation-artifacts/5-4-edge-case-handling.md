# Story 5.4: Edge Case Handling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **Git operations to handle edge cases gracefully**,
So that **I don't encounter confusing errors**.

## 🧠 Context & Intelligence

### 🏗️ Architectural Strategy: "State-Aware Git"
Building on the "Hybrid Git" approach (Story 5.3), this story enhances the `GitStatus` struct to be the single source of truth for repository state. Instead of the frontend guessing "is this detached?" based on branch name patterns, the backend will explicitly derive these states using `git2`'s robust introspection capabilities.

*   **Why Backend?**
    *   **Reliability:** `git2` knows exactly if a repo is in `RepositoryState::Merge` or if HEAD is detached.
    *   **Simplicity:** Frontend logic becomes `if status.is_detached` instead of regex guessing.
    *   **Performance:** One status call provides all flags, preventing multiple shell round-trips.

### 🛡️ Edge Case Specifications
1.  **Detached HEAD:**
    *   **Detection:** `repo.head_detached()` returns true.
    *   **UX:** Show "Detached HEAD" badge (Amber). Disable Push (usually). Allow Commit (warn it's headless).
2.  **No Remote:**
    *   **Detection:** `status.has_remote` is false.
    *   **UX:** Hide "Push" button. Show "Local Only" badge.
3.  **Merge Conflict:**
    *   **Detection:** `repo.index()?.has_conflicts()` is true.
    *   **UX:** Show "Conflicts Detected" badge (Red). Disable Commit (until resolved). Warning text: "Resolve conflicts in terminal".
4.  **Empty Repository:**
    *   **Detection:** `repo.head()` returns `UnbornBranch` error or `is_empty` flag.
    *   **UX:** Show "No commits yet" state. Hide "Push".

### 🎨 UX Specification (Journey 5)
*   **Location:** ProjectCard (Expanded View).
*   **Visual Language (Ren - Compassionate):**
    *   **Badge:** Used for state indicators (e.g., "HEAD detached").
    *   **Colors:**
        *   Amber (⚠️): Warning/Caution (Detached, No Remote).
        *   Red (🛑): Blocker (Conflicts).
        *   Gray (ℹ️): Info (Empty).
*   **Interaction:**
    *   **Conflict:** "Commit" button disabled. Tooltip: "Resolve conflicts first".
    *   **Detached:** "Push" button disabled/hidden.

---

## Acceptance Criteria

### 1. Enhanced GitStatus (Backend)
- [x] **Struct Update:** `GitStatus` struct includes:
    *   `is_detached: bool`
    *   `has_conflicts: bool`
    *   `is_empty: bool`
- [x] **Implementation:** `get_git_status` populates these fields accurately using `git2` methods.
- [x] **Detached Check:** Uses `repo.head_detached()`.
- [x] **Conflict Check:** Uses `repo.index()?.has_conflicts()`.
- [x] **Empty Check:** Detects `UnbornBranch` or no commits.

### 2. Dashboard UI (Frontend)
- [x] **Detached State:**
    *   If `is_detached` is true, display "Detached HEAD" badge (Amber) near branch name.
    *   Display branch name as the short SHA (first 7 chars).
- [x] **No Remote State:**
    *   If `!has_remote`, display "No Remote" badge (Gray/Amber) in git section.
    *   "Push" button is hidden.
- [x] **Conflict State:**
    *   If `has_conflicts` is true, display "Conflicts" badge (Red).
    *   "Commit" button is disabled.
    *   Commit placeholder changes to "Resolve conflicts in terminal".
- [x] **Empty State:**
    *   If `is_empty` is true, display "No commits yet" instead of branch info.
    *   Hide "Push" button.

### 3. Safety & Integration
- [x] **Conflict Guardrail:** Commit command prevents execution if conflicts exist (double check in backend).
- [x] **Visual Hierarchy:** Error/Warning badges take precedence over standard status info.

---

## Tasks / Subtasks

- [x] **Backend: Enhance GitStatus**
    - [x] Update `GitStatus` struct in `src-tauri/src/commands/git.rs` with new bool fields.
    - [x] Update `get_git_status` logic to populate `is_detached` (via `head_detached()`).
    - [x] Update `get_git_status` logic to populate `has_conflicts` (via `index()?.has_conflicts()`).
    - [x] Update `get_git_status` logic to populate `is_empty` (handle `UnbornBranch` explicitly).
    - [x] **Tests:**
        - [x] Add tests in `src-tauri/src/commands/git.rs` (inside `#[cfg(test)]` module).
        - [x] `test_git_status_detached`: Verify `is_detached` = true.
        - [x] `test_git_status_conflicts`: Create conflict state, verify `has_conflicts` = true.
        - [x] `test_git_status_empty`: Verify `is_empty` = true.

- [x] **Frontend: Handle States**
    - [x] Update `GitDisplayStatus` interface in `src/types/git.ts` to include:
        - `isDetached: boolean`
        - `hasConflicts: boolean`
        - `isEmpty: boolean`
    - [x] Verify `useGitStatus` hook correctly propagates these new fields.
    - [x] Update `GitControls.tsx` (or `GitStatusDisplay.tsx`) to render badges.
    - [x] Implement conditional logic for button states (disable commit on conflict, hide push on no remote/empty).
    - [x] Add tooltips/help text for edge cases (optional but nice).

- [x] **Verification**
    - [x] Verify clean repo (all flags false).
    - [x] Verify detached head state.
    - [x] Verify merge conflict state.
    - [x] Verify empty repo state.

## Dev Notes

- **Git2 Index:** Accessing the index (`repo.index()`) might require a lock. Ensure we don't hold it long. `has_conflicts()` is a fast read-only check.
- **Commit Guard:** While the frontend disables the button, the backend `commit_changes` command should probably *also* check for conflicts and return an error if found, to be safe.
- **Empty Repo:** Note that `git status` on an empty repo works, but `HEAD` is effectively pointing to "master" (or default) which is unborn. `git2` handles this via `ErrorCode::UnbornBranch`.
- **Type Safety:** Ensure the Rust struct fields `is_detached`, `has_conflicts`, `is_empty` map correctly to the TypeScript interface properties (use `camelCase` rename in Rust serde attributes if needed, though default might be snake_case without it).

## Dev Agent Record

### Agent Model Used
gemini-2.0-flash-exp

### Debug Log References
N/A - All tests passed on first run

### Completion Notes List
- Backend implementation completed with all new edge case detection fields
- Added 4 comprehensive unit tests (detached HEAD, conflicts, empty repo, commit guard)
- All 39 backend tests passing
- Frontend build successful with no TypeScript errors
- Conflict guardrail implemented in both backend (safety) and frontend (UX)
- Badge component created inline following Ren's compassionate design language
- Push button properly hidden for detached HEAD, empty repos, and no remote scenarios

### File List
- `src-tauri/src/commands/git.rs` - Enhanced GitStatus struct, get_git_status function, commit_changes guard, unit tests
- `src-tauri/src/ai/context.rs` - Updated test fixtures to include new GitStatus fields
- `src/types/git.ts` - Added isDetached, hasConflicts, isEmpty to GitDisplayStatus interface
- `src/hooks/useGitStatus.ts` - Hook correctly propagates new edge case fields
- `src/components/Dashboard/GitStatusDisplay.tsx` - Added Badge component and edge case displays
- `src/components/Dashboard/GitControls.tsx` - Conditional button logic and conflict handling