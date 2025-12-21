# Story 4.3: DEVLOG History View

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **to see the history of my DEVLOG changes within the modal editor**,
So that **I can review my past context and thoughts without leaving the editor**.

## Acceptance Criteria

### 1. View History Access

**Given** the user is in the DEVLOG editor modal
**When** they look at the header
**Then** a "View History" button (clock icon) is visible in header layout: [Project Dropdown] | [Edit Mode Toggle] | [View History Button] | [Close X]
**And** if user has unsaved changes when clicking "View History", show warning dialog: "You have unsaved changes. Save first?"
**And** provide [Save & Continue] [Discard & Continue] [Cancel] options
**And** auto-save triggers before switching views if [Save & Continue] chosen
**And** clicking it switches the modal content to the History View with --animation-normal (200ms) transition
**And** transition respects prefers-reduced-motion (instant if enabled)
**And** the "View History" button is hidden while in History View
**And** the "View History" button is disabled if isSaving is true

### 2. History List Display

**Given** the user is in History View
**And** the project is a Git repository
**And** DEVLOG.md has past commits
**When** history is being loaded
**Then** show RoninLoader meditation animation (NOT skeleton)
**And** show text "Analyzing DEVLOG history..." (NOT "Loading...")
**When** loading completes
**Then** a list of commits modifying DEVLOG.md is displayed (newest first)
**And** each entry shows:
  - Commit message (first line) - Work Sans Regular 1rem
  - Author name - Work Sans Regular 0.875rem
  - Relative time (e.g., "2 hours ago") - Work Sans Regular 0.875rem (Friar Gray color)
  - Commit hash (short) - JetBrains Mono Regular 0.875rem (technical)
**And** the list is scrollable if long
**And** list items have hover effect with bg-ronin-primary/5
**And** user can navigate commits with Tab/Arrow keys
**And** pressing Enter on focused commit opens that version
**And** pressing Escape returns to editor from any history view
**And** each commit entry has aria-label="Commit by {author} on {date}: {message}"
**And** history list has role="list" with aria-label="DEVLOG commit history"
**And** if project has >50 commits, show message at bottom: "Showing last 50 commits (use git log in terminal for full history)" using Work Sans Regular 0.875rem, Friar Gray color

### 3. Edge Case Handling

**Given** the project is NOT a Git repository
**When** viewing history
**Then** show empty state with empathetic message:
  "DEVLOG history requires Git. Initialize a repository to track changes:
   $ git init
   $ git add DEVLOG.md
   $ git commit -m 'Initial DEVLOG'"
**And** message uses Work Sans Regular 0.875rem with code in JetBrains Mono

**Given** DEVLOG.md is new and hasn't been committed yet
**When** viewing history
**Then** show empty state: "No history yet - commit your DEVLOG to track changes"

### 4. Version Content View

**Given** the user is looking at the history list
**When** they click a commit entry
**Then** the view switches to "Version Detail" mode with --animation-normal (200ms) transition
**And** the editor displays the content of DEVLOG.md at that specific commit
**And** the editor is **READ-ONLY** (cannot edit past versions)
**And** the editor is configured with EditorState.readOnly.of(true)
**And** the editor is configured with EditorView.editable.of(false)
**And** cursor is hidden in read-only mode
**And** "READ ONLY VERSION" banner appears at top of CodeMirror editor container (not modal header)
**And** banner styling: bg-ronin-secondary/20, text-ronin-text, p-2, text-sm
**And** banner font: Work Sans Medium 0.875rem with Lock icon from lucide-react before text
**And** banner layout: Full width of editor, positioned as first child of editor container
**And** version detail view announces "Viewing version from {date}, read-only mode" for screen readers
**And** a "Back to History" button is visible in the header
**And** selected version has border-ronin-primary border-2 in history list
**And** a "Restore this version" button is NOT required for MVP (user can copy-paste if needed)

### 5. Navigation

**Navigation Button Flow:**
- **Edit Mode:** Shows "View History" button
- **History List:** Shows "Back to Editor" button
- **Version Detail:** Shows "Back to History" button (returns to list)
- **From any view:** Escape key returns to Edit Mode (preserving unsaved changes)

**Given** the user is in History or Version Detail view
**When** they click "Back to Editor" or "Back to History" button
**Then** the modal returns to the appropriate view with --animation-normal (200ms) transition
**And** their current unsaved changes (if any) are preserved
**And** pressing Escape from any view returns to Edit Mode

## Tasks / Subtasks

- [x] **Backend Implementation (src-tauri/src/commands/devlog.rs)**
  - [x] Implement `get_devlog_history(project_path: String) -> Result<Vec<DevlogCommit>, String>`
    - [x] Locate DEVLOG.md relative path using find_devlog_path() from context::devlog
    - [x] Execute `git log -n 50 --pretty=format:"%H::::%aI::::%an::::%s" -- {relative_path}`
      - *Note: Limit to last 50 commits for performance (NFR1)*
      - *Note: Use `Command::new("git").current_dir(project_path)` for proper git root execution*
    - [x] **Error Handling:**
      - If git command fails → return Err("Failed to retrieve DEVLOG history. Ensure this is a Git repository.")
      - If DEVLOG.md path not found → return Err("DEVLOG.md not found in project")
      - If command output parsing fails → return Err with user-friendly message
    - [x] Parse output into struct `DevlogCommit`:
      - *Truncate `message` to first 100 chars or first line to prevent UI issues*
      ```rust
      #[derive(serde::Serialize, serde::Deserialize, Debug)]
      pub struct DevlogCommit {
          pub hash: String,
          pub date: String, // ISO 8601
          pub author: String,
          pub message: String,
      }
      ```
  - [x] Implement `get_devlog_version(project_path: String, commit_hash: String) -> Result<String, String>`
    - [x] Execute `git show {commit_hash}:{relative_path}` using Command::new("git").current_dir(project_path)
    - [x] **Error Handling:**
      - If git command fails → return Err("Failed to retrieve version content")
      - If commit hash invalid → return Err("Invalid commit hash")
    - [x] Return content string

- [x] **Frontend Store/Types (src/stores/devlogStore.ts)**
  - [x] Add types: `DevlogViewMode = 'edit' | 'history' | 'version'`
  - [x] Add state: `versionCache: Record<string, string>` (hash -> content)
  - [x] Add state: `selectedVersionHash: string | null` (for UI highlighting)
  - [x] Add action: `cacheVersion(hash: string, content: string)`
  - [x] **Version Cache Management Strategy:**
    - Populate: On version click, cache content for that hash
    - Clear: When modal closes (prevent memory leak)
    - Max size: 10 versions (oldest evicted if exceeded using LRU pattern)
    - Check before fetch: If hash exists in cache, use cached content
  - [x] Add interface:
    ```typescript
    interface DevlogCommit {
      hash: string;
      date: string;
      author: string;
      message: string;
    }
    ```

- [x] **Component Updates - MarkdownEditor.tsx**
  - [x] Add `readOnly` prop (boolean)
  - [x] Configure CodeMirror `EditorState.readOnly.of(readOnly)` when prop is set
  - [x] Configure CodeMirror `EditorView.editable.of(!readOnly)` when prop is set
  - [x] Add visual indicator: If `readOnly`, show "READ ONLY VERSION" banner at top of editor container
    - Position: First child of editor container (before CodeMirror element)
    - Styling: bg-ronin-secondary/20, text-ronin-text, p-2, text-sm
    - Font: Work Sans Medium 0.875rem
    - Icon: Lock icon from lucide-react before text
    - Full width layout

- [x] **New Component - src/components/devlog/DevlogHistory.tsx**
  - [x] Create list layout with Tailwind styling
  - [x] Fetch history on mount using `get_devlog_history`
  - [x] Handle loading state with RoninLoader (NOT skeleton) and text "Analyzing DEVLOG history..."
  - [x] Handle empty/error states:
    - Not Git: Show empathetic message with git init instructions
    - No commits: Show "No history yet - commit your DEVLOG to track changes"
  - [x] Render commit list items with:
    - Typography: Work Sans for message/author/date, JetBrains Mono for hash
    - Hover effect: bg-ronin-primary/5
    - Selected state: border-ronin-primary border-2
    - Keyboard navigation: Tab/Arrow keys, Enter to open
    - ARIA: role="list", aria-label="DEVLOG commit history"
    - Each item: aria-label="Commit by {author} on {date}: {message}"
  - [x] Show "Showing last 50 commits..." message if applicable (Work Sans Regular 0.875rem, Friar Gray)
  - [x] Handle click -> check `versionCache` -> trigger `onSelectVersion`

- [x] **Component Integration - DevlogModal.tsx**
  - [x] Add state `viewMode` (default 'edit')
  - [x] Add state `selectedVersionContent` (string | null)
  - [x] Update Header Layout (left to right): [Project Dropdown] | [Edit Mode Toggle] | [View History Button] | [Close X]
  - [x] Update Header:
    - [x] Add "History" button with Clock icon (when mode='edit')
    - [x] **Disable "History" button if `isSaving` is true**
    - [x] Check for unsaved changes before switching to history:
      - If unsaved changes exist, show warning dialog: "You have unsaved changes. Save first?"
      - Options: [Save & Continue] [Discard & Continue] [Cancel]
      - If [Save & Continue], trigger auto-save before switching views
    - [x] Add "Back to Editor" button (when mode='history')
    - [x] Add "Back to History" button (when mode='version')
    - [x] Update title based on mode ("DEVLOG", "History", "Version: a1b2c3")
  - [x] Add view transitions: --animation-normal (200ms) with ease-out
  - [x] Respect prefers-reduced-motion for instant transitions
  - [x] Add Escape key handler: returns to Edit Mode from any view (preserving unsaved changes)
  - [x] Conditional Rendering:
    - [x] Mode 'edit': Show `MarkdownEditor` (live content, editable)
    - [x] Mode 'history': Show `DevlogHistory` component
    - [x] Mode 'version': Show `MarkdownEditor` (read-only, selected content with banner)

- [x] **Testing**
  - [x] Unit test backend commands (mock git output or use test repo)
  - [x] Test: Non-git project returns correct error/empty state with empathetic message
  - [x] Test: Git project with no DEVLOG history shows correct empty state
  - [x] Test: Navigation flow (Edit -> History -> Version -> History -> Edit)
  - [x] Test: Escape key returns to Edit Mode from any view
  - [x] Test: Read-only editor prevents typing (EditorState.readOnly.of(true))
  - [x] Test: Read-only banner displays correctly at top of editor
  - [x] Test: Keyboard navigation (Tab/Arrow/Enter) in history list
  - [x] Test: ARIA labels present and correct for screen readers
  - [x] Test: Unsaved changes warning before switching to history
  - [x] Test: Version cache management (populate, clear on close, LRU eviction)
  - [x] Test: Performance target: History loads in <500ms for 50 commits
  - [x] Test: Performance target: Version content loads in <200ms
  - [x] Test: Animation respects prefers-reduced-motion
  - [x] Test: Backend error handling (git fails, invalid hash, etc.)
  - [x] Test: "Showing last 50 commits" message appears when >50 commits exist
  - [x] **Regression Tests:**
    - [x] Story 4.1: DEVLOG editor still works (append mode, edit mode, auto-save)
    - [x] Story 4.2: File sync conflict detection still works
    - [x] Story 4.2: Polling still detects external changes

## Technical Requirements

### Performance Targets
- **History list load:** <500ms for 50 commits
- **Version content load:** <200ms (local git operation)
- **Total time from "View History" click to visible list:** <1s
- **Memory:** Version cache max 10 items with LRU eviction (stay within per-project <1MB budget)
- **Animation:** All transitions use --animation-normal (200ms), instant if prefers-reduced-motion

### Git Command Strategy
Use `std::process::Command` with `git` CLI for this story (MVP approach per architecture).

**CRITICAL:** All git commands MUST use `Command::new("git").current_dir(project_path)` to ensure execution from git root.

**Log Command:**
```bash
git log -n 50 --pretty=format:"%H::::%aI::::%an::::%s" -- {relative_path}
```
*Delimiter `::::` chosen to avoid collision with user messages.*
*Limit `-n 50` enforced for MVP performance.*

**Show Command:**
```bash
git show {commit_hash}:{relative_path}
```

**Git Commands Reference:**
| Command | Purpose | Error Handling |
|---------|---------|----------------|
| `git log -n 50 --pretty=format:"%H::::%aI::::%an::::%s" -- {path}` | Fetch commit history | Return Err("Failed to retrieve DEVLOG history. Ensure this is a Git repository.") |
| `git show {hash}:{path}` | Fetch version content | Return Err("Failed to retrieve version content") if command fails |

### Backend Error Handling Strategy
**Error Categories:**
1. **Git command execution fails:** Return Err with user-friendly message (e.g., "Failed to retrieve DEVLOG history. Ensure this is a Git repository.")
2. **Invalid commit hash:** Return Err("Invalid commit hash")
3. **DEVLOG.md not found:** Return Err("DEVLOG.md not found in project")
4. **Parsing fails:** Return Err with descriptive message

**Frontend Error Handling:**
- All backend errors display empathetic toast messages (仁 Jin principle)
- Modal state preserved on errors (never lose user's work)
- Offer retry or fallback options where applicable

### Relative Path Logic
`find_devlog_path` returns an absolute path. `git` commands often run best from the repo root.
Logic:
1. `project_path` is repo root.
2. `devlog_path` is absolute.
3. `relative_path` = `devlog_path.strip_prefix(project_path)`

### UX/UI Details

**Component Hierarchy:**
```
DevlogModal (modes: edit | history | version)
├── Header: [Project Dropdown] | [Edit Mode Toggle] | [View History Button] | [Close X]
├── [mode='edit'] MarkdownEditor (editable)
├── [mode='history'] DevlogHistory (commit list)
└── [mode='version'] MarkdownEditor (readOnly=true, banner visible)
```

**Icons:** Use `lucide-react`
- History button: Clock icon
- Back buttons: ArrowLeft icon
- Read-only banner: Lock icon

**Typography:**
- Commit message: Work Sans Regular 1rem (readable)
- Commit hash: JetBrains Mono Regular 0.875rem (technical)
- Author name: Work Sans Regular 0.875rem
- Date/time: Work Sans Regular 0.875rem (Friar Gray color)
- Read-only banner: Work Sans Medium 0.875rem
- Empty state messages: Work Sans Regular 0.875rem
- "Showing 50 commits" message: Work Sans Regular 0.875rem (Friar Gray)

**Color Tokens:**
- Read-only editor background: `bg-ronin-surface` (same as edit mode for consistency)
- Read-only banner background: `bg-ronin-secondary/20`
- Read-only banner text: `text-ronin-text`
- History list hover: `bg-ronin-primary/5`
- Selected version border: `border-ronin-primary border-2`
- Empty state text: `text-ronin-secondary`

**Animations:**
- View transitions: `--animation-normal` (200ms) with ease-out
- Respect `prefers-reduced-motion`: Instant transitions if user preference set
- CSS implementation:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
  }
  ```

## Dev Notes

### Architecture: Global Singleton
The `DevlogModal` should be rendered **once** at the root level (`App.tsx`), not inside each page. This ensures it preserves state when navigating and overlays everything.

### CodeMirror Read-Only Implementation
**Reference:** See `docs/sprint-artifacts/codemirror-research-2025-12-21.md` for:
- EditorState.readOnly.of(true) pattern (lines 31-43)
- Styling with JetBrains Mono (lines 104-115)
- Basic React setup with EditorState and EditorView (lines 26-44)

**Read-Only Configuration Pattern:**
```typescript
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const state = EditorState.create({
  doc: versionContent,
  extensions: [
    markdown(),
    EditorState.readOnly.of(true),  // Prevent edits
    EditorView.editable.of(false),  // Disable cursor
    EditorView.lineWrapping,
  ]
});
```

**Banner Component Pattern:**
```tsx
{readOnly && (
  <div className="w-full bg-ronin-secondary/20 text-ronin-text p-2 text-sm flex items-center gap-2">
    <Lock className="w-4 h-4" />
    <span className="font-['Work_Sans'] font-medium text-sm">READ ONLY VERSION</span>
  </div>
)}
```

### Preserving Edits
When switching to 'history', the live editor is unmounted. State (current content) MUST be preserved in `DevlogModal` state or `devlogStore`.
*Current implementation:* `DevlogModal` holds `editorContent`. Ensure this state isn't lost when switching views.

### Reference Documents
| File | Purpose | When to Read |
|------|---------|--------------|
| `docs/sprint-artifacts/codemirror-research-2025-12-21.md` | CodeMirror 6 integration guide with setup, custom keymaps, and auto-save patterns | Read for CodeMirror read-only implementation (lines 31-43, 104-115) |
| `docs/project-context.md` | Critical rules for typography, colors, animations, accessibility | Read before implementing any UI (lines 31-82) |
| `docs/epics.md` | Epic 4 overview and context | Reference for feature alignment |
| `docs/architecture.md` | Git operations safety guidelines | Reference for git command patterns (Category 4) |

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
