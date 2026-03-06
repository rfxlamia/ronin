# Story 3.2: Git History Analysis

**Status:** done
**Epic:** 3 - Context Recovery & AI Consultant
**Story:** 3.2

As a **developer**,
I want **the system to analyze my Git history for context**,
So that **the AI has meaningful data to work with even without DEVLOG.**

## Acceptance Criteria

1.  **Context Extraction:** System extracts the following from the local repository:
    *   **Commits:** Last 20 commit messages, dates, authors, and *list of modified files* per commit.
    *   **Branch:** Current active branch name (or "HEAD detached").
    *   **Status:** List of uncommitted files (staged, modified, untracked).
    *   **Time:** Time elapsed since the last commit.
2.  **Performance (NFR4):** Extraction completes in < 1 second.
3.  **Payload Size (NFR29):** Data is structured to be concise (< 5KB typical text size).
4.  **Edge Cases:** Gracefully handles:
    *   Empty repository (no commits).
    *   Detached HEAD state.
    *   No remote configured.
    *   Not a git repository (error handling).
5.  **Implementation:** Uses `git2` crate (consistent with existing codebase, overriding initial Architecture decision for CLI).

## Tasks / Subtasks

- [x] **Expand `GitCommit` Struct**
    -   **MODIFY existing `GitCommit` struct** at `src-tauri/src/commands/git.rs:7-13` by adding `pub files: Vec<String>` field.
    -   Update `get_git_history` to populate `files` by diffing commit tree with parent tree using `repo.diff_tree_to_tree()` (see Dev Notes for implementation example).
- [x] **Implement `get_git_branch`**
    -   Create command to return current branch name (`repo.head()?.shorthand()`).
    -   Handle detached HEAD (return "DETACHED-HEAD" or commit hash).
- [x] **Implement `get_git_status`**
    -   Create command to return `GitStatus` struct:
        -   `is_clean: bool`
        -   `modified_files: Vec<String>` (paths)
    -   Use `repo.statuses()` with appropriate flags (include untracked).
- [x] **Implement `get_git_context` (Aggregator)**
    -   Create a unified command `get_git_context(path: String) -> GitContext` that calls branch/status/history logic internally in Rust.
    -   Returns a single `GitContext` struct containing history, branch, and status.
    -   **IPC Optimization:** Single command avoids 3 separate IPC calls from frontend, improving performance.
- [x] **Unit Tests**
    -   Test `get_git_history` returns files changed.
    -   Test `get_git_branch` returns correct branch.
    -   Test `get_git_status` detects uncommitted changes.
    -   **Edge Case Tests (AC4):**
        -   Empty repository (no commits) → `get_git_history` returns empty Vec
        -   Detached HEAD → `get_git_branch` returns "DETACHED-HEAD" or commit hash
        -   No remote configured → `get_git_status` succeeds without ahead_behind data
        -   Not a git repository → Commands return "Not a git repository" error
    -   Test against a dummy repo created in `/tmp`.

## Dev Notes

### Architecture & Library Context
*   **git2 Usage:** Continue using `git2` crate (approved deviation from CLI approach in ADR-7, introduced in Story 3.1). Provides type safety, structured error handling, and better performance than parsing string output.
*   **Dependency:** `git2 = "0.18"` already in `Cargo.toml` (Story 3.1).
*   **Cross-Story Dependencies:**
    -   **Story 3.3 (ContextPanel) depends on this output format.** Ensure `GitContext` struct remains stable or coordinate breaking changes.
    -   Builds upon Story 3.1 which established `git2` usage and command registration patterns.

### Technical Implementation Details
*   **File:** `src-tauri/src/commands/git.rs` (existing file from Story 3.1, see lines 7-63)
*   **Command Registration:** Follow pattern in `src-tauri/src/lib.rs` (lines 30-35 from Story 3.1)
*   **Struct Definitions:**
    ```rust
    // Modify existing GitCommit struct at git.rs:7-13
    #[derive(Serialize)]
    pub struct GitCommit {
        pub sha: String,
        pub author: String,
        pub date: String,
        pub message: String,
        pub files: Vec<String>, // NEW FIELD - Add this line
    }

    // New structs to add
    #[derive(Serialize)]
    pub struct GitContext {
        branch: String,
        status: GitStatus,
        commits: Vec<GitCommit>, // Limit 20
    }

    #[derive(Serialize)]
    pub struct GitStatus {
        is_clean: bool,
        modified_files: Vec<String>,
    }
    ```
*   **Backward Compatibility:** The `files` field is non-optional for simplicity. Verify Story 3.1 doesn't expose `GitCommit` to frontend yet (it only uses it internally in `get_git_history`).
*   **File Stats Logic - Complete Implementation:**

    To get files changed in a commit using `git2`:
    ```rust
    // Inside get_git_history loop (after creating GitCommit base fields)
    let tree = commit.tree()?;

    // Handle initial commit (no parent)
    let files = if commit.parent_count() == 0 {
        Vec::new() // or extract all files from tree if desired
    } else {
        let parent_tree = commit.parent(0)?.tree()?;
        let diff = repo.diff_tree_to_tree(Some(&parent_tree), Some(&tree), None)?;

        let mut files = Vec::new();
        diff.foreach(
            &mut |delta, _| {
                if let Some(path) = delta.new_file().path() {
                    files.push(path.to_string_lossy().to_string());
                }
                true // continue iteration
            },
            None, None, None,
        )?;
        files
    };

    // Add to GitCommit construction
    GitCommit {
        sha: oid.to_string(),
        author: author.name().unwrap_or("Unknown").to_string(),
        date: datetime.to_rfc3339(),
        message: commit.message().unwrap_or("").trim().to_string(),
        files, // Include files list
    }
    ```

    **git2 API Reference:** https://docs.rs/git2/0.18/git2/ (Key types: `Repository`, `RevWalk`, `Diff`, `Tree`, `DiffDelta`)

### Library/Framework Requirements
*   **Crate:** `git2 = "0.18"` (Already installed in Story 3.1).
*   **Async:** Tauri commands are async, but `git2` is synchronous. For MVP, blocking on Tauri's default threadpool is acceptable (git ops on local repos are fast).
*   **Error Handling:** Continue using `Result<T, String>` pattern from Story 3.1 (see git.rs:17). Error format: `"Failed to {action}: {reason}"` (e.g., `"Failed to get branch: detached HEAD"`, `"Failed to diff commit: parent not found"`).

### File Structure Requirements
*   **Modify:** `src-tauri/src/commands/git.rs` (existing file from Story 3.1)
*   **Modify:** `src-tauri/src/lib.rs` (register new commands: `get_git_branch`, `get_git_status`, `get_git_context`)
*   **No new modules needed.**

### Frontend Integration Contract

**Commands exposed to frontend (for Story 3.3 - ContextPanel):**

```typescript
// TypeScript usage in ContextPanel component
import { invoke } from '@tauri-apps/api';

// Primary command - use this for unified git context
const context = await invoke<GitContext>('get_git_context', {
  path: projectPath // absolute path to git repository
});

// TypeScript interfaces (Story 3.3 will define these)
interface GitContext {
  branch: string;
  status: GitStatus;
  commits: GitCommit[]; // limited to 20
}

interface GitStatus {
  is_clean: boolean;
  modified_files: string[]; // file paths relative to repo root
}

interface GitCommit {
  sha: string;
  author: string;
  date: string; // ISO 8601 format (RFC3339)
  message: string;
  files: string[]; // paths of files changed in this commit
}
```

**Error handling:**

```typescript
try {
  const context = await invoke('get_git_context', { path });
} catch (error: string) {
  // Error format: "Failed to {action}: {reason}"
  // Examples:
  //   "Not a git repository or failed to open: <path>"
  //   "Failed to get branch: detached HEAD"
  //   "Failed to get status: <reason>"
  console.error('Git context error:', error);
  // Show user-friendly message in UI
}
```

### Testing Requirements

**Priority 1 (Blocking):** Backend unit tests for new commands + edge cases

*   **Backend Tests:** Create unit tests in `git.rs` using `#[cfg(test)]` and `#[tokio::test]`.
*   **Test Setup:** Create temporary directory with initialized git repo in `/tmp`, make test commits.
*   **Test Coverage:**
    -   `get_git_history` returns files changed per commit
    -   `get_git_branch` returns correct branch name
    -   `get_git_status` detects uncommitted changes
    -   All edge cases from AC4 (see below)

**Edge Case Test Scenarios (AC4 - Required):**

*   **Empty repository (no commits):**
    -   Test: Call `get_git_history` on repo with no commits
    -   Expected: Returns `Ok(Vec::new())` (empty vector)
*   **Detached HEAD state:**
    -   Test: Checkout specific commit SHA, call `get_git_branch`
    -   Expected: Returns `Ok("DETACHED-HEAD")` or commit hash
*   **No remote configured:**
    -   Test: Init local repo without remote, call `get_git_status`
    -   Expected: Succeeds, `ahead_behind` field optional/None
*   **Not a git repository:**
    -   Test: Call commands on `/tmp` or non-git folder
    -   Expected: Returns `Err("Not a git repository or failed to open: ...")`

**Priority 2 (Regression - REQUIRED):** Run ALL tests from previous epics

*   **Command:** `npm test` (must pass 100%)
*   **Coverage:** Epic 1-2 tests (182 total: 42 backend + 140 frontend)
*   **Purpose:** Verify no regressions introduced by modifying `GitCommit` struct
*   **Note:** Even though this is backend-only, regression protocol requires frontend tests (per project-context.md lines 280-288)

**Priority 3 (Performance - NFR4):** Validate extraction speed

*   **Requirement:** Git context extraction completes in < 1 second (NFR4)
*   **Test Implementation:**
    ```rust
    #[tokio::test]
    async fn test_performance_nfr4() {
        let start = std::time::Instant::now();
        let context = get_git_context(repo_path, None).await.unwrap();
        let elapsed = start.elapsed();
        assert!(elapsed < std::time::Duration::from_secs(1),
                "Extraction took {:?}, exceeds 1s limit", elapsed);
    }
    ```
*   **Performance Debugging (if needed):** If extraction exceeds 1s, profile with `cargo flamegraph`. Common bottleneck: diffing large commits. Solution: Skip file diff for commits with 100+ changed files, or limit diff depth.

## Dev Agent Record

### Agent Model Used
Qwen Code (2025-12-20)

### Context Intelligence

**From Story 3.1 (OpenRouter API Integration):**
*   `src-tauri/src/commands/git.rs` exists with `GitCommit` struct (lines 7-13) and `get_git_history` command (lines 16-63)
*   Command registration pattern: `src-tauri/src/lib.rs` uses `invoke_handler!` macro (lines 30-35)
*   `git2 = "0.18"` already in `Cargo.toml`
*   Established pattern: `async fn` with `Result<T, String>` return type

**From Git History:**
*   Commit 1962886: "feat: Add Git history retrieval command" - introduced git2 usage
*   Commit 3870710: Added ContextPanel component (Story 3.3 will consume this data)

### Implementation Notes
*   Modified existing `GitCommit` struct to add `files` field (avoided creating duplicate)
*   Followed Story 3.1 patterns for consistency
*   Added `GitStatus` and `GitContext` structs as specified
*   Implemented all three new commands: `get_git_branch`, `get_git_status`, and `get_git_context`
*   Added comprehensive unit tests for all commands including edge cases

### Completion Notes List
*   [x] Confirmed `git2` usage.
*   [x] Defined `GitContext` struct.
*   [x] Specified testing strategy (tmp repo).
*   [x] Added `files` field to `GitCommit` struct.
*   [x] Implemented `get_git_branch` command with detached HEAD handling.
*   [x] Implemented `get_git_status` command with proper status detection.
*   [x] Implemented `get_git_context` aggregator command.
*   [x] Added comprehensive unit tests for all functionality.
*   [x] Handled edge cases: empty repo, detached HEAD, non-git directory.
*   [x] Updated command registration in `lib.rs`.
*   [x] Added `tempfile` crate to dev-dependencies for testing.
*   [x] All tests passing (50 Rust tests, 150 Node.js tests).

## File List

- `src-tauri/src/commands/git.rs` - Modified to add files field to GitCommit, implement get_git_branch, get_git_status, get_git_context, and add comprehensive tests
- `src-tauri/src/lib.rs` - Updated to register new Tauri commands
- `src-tauri/Cargo.toml` - Added tempfile crate to dev-dependencies
- `src-tauri/Cargo.lock` - Updated with tempfile dependency
- `src/components/GitCommands.test.ts` - Frontend mock tests for git command invocation
- `src/components/GitCommandsReal.test.ts` - Frontend tests with typed mock data

## Change Log

- **2025-12-20:** Implementation complete
  - Expanded GitCommit struct with files field to track changed files per commit
  - Implemented get_git_branch command to retrieve current branch name with detached HEAD handling
  - Implemented get_git_status command to retrieve git status information
  - Implemented get_git_context command as aggregator for all git information
  - Added comprehensive unit tests covering all functionality and edge cases
  - Updated command registration in lib.rs
  - Added tempfile crate for testing purposes
  - All tests pass (50 Rust tests, 150 Node.js tests)
- **2025-12-20:** Code review fixes (AI)
  - Fixed unused BranchType import in git.rs
  - Fixed weak tautological test assertion
  - Corrected File List documentation (removed fictitious file, added actual test files)
  - Updated test counts in documentation

## Manual Test Notes (Product Lead Verification)

**Note:** This story is backend-only. Manual testing can be done via Tauri DevTools console or in Story 3.3 when ContextPanel consumes this data.

### Test Case 1: Git Context Extraction - Normal Repository

**Steps:**
1. Open Ronin DevTools console (Story 3.3 or via `npm run tauri dev`)
2. Execute: `await invoke('get_git_context', { path: '/path/to/git/repo' })`
3. Inspect returned JSON object

**Expected Result:**
- `branch` field shows current branch name (e.g., "main")
- `status.is_clean` is `true` or `false` based on uncommitted files
- `status.modified_files` lists uncommitted file paths
- `commits` array contains up to 20 commits
- Each commit has `sha`, `author`, `date`, `message`, `files` fields
- `files` array lists paths of files changed in each commit
- Extraction completes in < 1 second

**Actual Result:** [To be filled during verification]

---

### Test Case 2: Edge Cases Validation

**Steps:**
1. Test empty repository (no commits):
   - Create new git repo: `git init /tmp/test-empty && cd /tmp/test-empty && git config user.name "Test"`
   - Execute: `await invoke('get_git_context', { path: '/tmp/test-empty' })`

2. Test detached HEAD:
   - Checkout specific commit: `git checkout HEAD~1` in any repo
   - Execute: `await invoke('get_git_branch', { path: repo })`

3. Test not a git repository:
   - Execute: `await invoke('get_git_context', { path: '/tmp' })`

**Expected Result:**
- Empty repo: Returns empty commits array, branch might be "main" or error
- Detached HEAD: Returns "DETACHED-HEAD" or commit hash
- Not git repo: Returns error "Not a git repository or failed to open: ..."

**Actual Result:** [To be filled during verification]

---

### Test Case 3: Performance Validation (NFR4)

**Steps:**
1. Use a repository with 20+ commits
2. Measure extraction time using browser DevTools Performance tab or console.time()
3. Execute multiple times to get average

**Expected Result:**
- Extraction completes in < 1 second
- First content available immediately (synchronous operation)

**Actual Result:** [To be filled during verification]

