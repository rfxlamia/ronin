# Story 4.1: DEVLOG Editor Component

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a global markdown editor accessible from anywhere in Ronin**,
So that **I can capture my thoughts and context instantly without navigation**.

## Acceptance Criteria (BDD)

### 1. Global Access
*   **Given** the user is on any screen in Ronin,
*   **When** they press `Ctrl+Shift+D` OR click the floating "Book" button in the bottom-right,
*   **Then** the DEVLOG modal opens centered on screen.
*   **And** the floating button is always visible (Z-index 50) but unobtrusive.

### 2. Project Selection
*   **Given** the modal is open,
*   **When** the user looks at the header,
*   **Then** a dropdown allows selecting the target project.
*   **And** it defaults to the currently active project (if one is selected in dashboard) or the last edited project.

### 3. Quick Capture Mode (Append-Only)
*   **Given** the modal opens in default state,
*   **Then** the editor is empty (ready for new entry).
*   **When** the user types content and saves (Auto-save or Close),
*   **Then** the system appends a timestamp header (`## YYYY-MM-DD HH:mm`) + the new content to the end of `DEVLOG.md`.
*   **And** the previous file content is NOT loaded into the editor (faster, focus on new thought).

### 4. Edit Mode (Full Control)
*   **Given** the modal is open,
*   **When** the user toggles "Edit Mode" switch,
*   **Then** the full content of `DEVLOG.md` is loaded into the editor.
*   **And** the user can modify any part of the file.
*   **When** saved in this mode,
*   **Then** the file is overwritten with the editor content.

### 5. Markdown Editing Experience
*   **Given** the user is typing,
*   **Then** syntax highlighting works for Markdown.
*   **And** `Ctrl+B` bolds text, `Ctrl+I` italicizes text.
*   **And** the font is JetBrains Mono.
*   **And** changes auto-save every 30 seconds (debounce) or on modal close.

### 6. File Conflict Detection (from Epic 4 UX)
*   **Given** DEVLOG.md is modified externally while modal is open,
*   **When** user attempts to save (auto-save or manual close),
*   **Then** system detects file mtime change,
*   **And** shows conflict dialog with options:
    - **[Reload]** - Discard modal changes, load external version
    - **[Keep Mine]** - Overwrite external changes with modal content
    - **[Merge]** - Show diff view for manual resolution (v0.3 feature - warn "Not implemented yet")
*   **And** auto-save pauses until user resolves conflict.
*   **Technical Notes:**
    - Store file `mtime` (modification timestamp) when modal opens
    - Compare `mtime` before each save operation
    - Use `notify` crate file watch (already set up in Story 3.7) to detect external changes

## Technical Requirements

### Backend (`src-tauri/src/commands/devlog.rs`)

**Contract:**
```rust
#[tauri::command]
async fn get_devlog_content(project_path: String) -> Result<String, String>;

#[tauri::command]
async fn append_devlog(project_path: String, content: String) -> Result<(), String>;
// Logic: Read file, append "\n\n## YYYY-MM-DD HH:mm\n" + content, write back.
// Timestamp Format: Use chrono with local time:
//   use chrono::Local;
//   let timestamp = Local::now().format("%Y-%m-%d %H:%M").to_string();
//   let header = format!("## {}", timestamp);
// Result example: "## 2025-12-21 14:30"

#[tauri::command]
async fn write_devlog(project_path: String, content: String) -> Result<(), String>;
// Logic: Overwrite entire file (Edit Mode).
```

*   **Implementation:** Refactor `src-tauri/src/context/devlog.rs` (from Story 3.7) to expose shared logic.
    *   **Reuse from Story 3.7:**
        - Import `context::devlog::read_devlog()` for loading existing content in Edit Mode
        - Use same multi-location logic (root → docs/ → .devlog/) - DO NOT duplicate
        - Refactor if needed to expose `read_file_content()` as public function
    *   **New Backend Code (Story 4.1):**
        - `append_devlog()` - NEW function for append mode (timestamp + append)
        - `write_devlog()` - NEW function for overwrite (edit mode)
        - `get_devlog_content()` - Thin wrapper around existing `read_devlog()`, return content as String
*   **Registration:** Register these commands in `src-tauri/src/lib.rs` (main module).

### Frontend (`src/`)

**Global Integration (`src/App.tsx`):**
*   **Mount:** Place `<DevlogButton />` and `<DevlogModal />` inside `AppShell` or directly in `App` (above `Toaster`) to ensure they are available on all routes.
*   **Toaster Position Decision:** Move `Toaster` to `position="top-right"` (change from current `bottom-right` on line 27 of App.tsx) to prevent overlap with FAB button.
    *   **Rationale:** FAB is always-visible global action (high priority), Toaster is temporary (3-5s, lower priority). Top-right is standard for notifications.
    *   **Z-Index Layering:**
        - Modal backdrop: `z-index: 100`
        - Modal content: `z-index: 101`
        - FAB button: `z-index: 50` (bottom-right at `bottom: 24px; right: 24px`)
        - Toaster: `z-index: 60` (top-right, no conflict)

**State Management (`src/stores/devlogStore.ts`):**
*   **Zustand Store:**
    *   `isOpen: boolean`
    *   `mode: 'append' | 'edit'`
    *   `activeProjectId: string | null`
    *   `actions: { open(), close(), setMode(), ... }`

**UI Components:**
*   **`src/components/devlog/DevlogButton.tsx`:**
    *   Icon: `NotebookPen` from `lucide-react`.
    *   Style: Fixed `bottom-8 right-8` (z-50), `bg-ronin-primary` (Antique Brass).
*   **`src/components/devlog/DevlogModal.tsx`:**
    *   Wrapper: `Dialog` from `shadcn/ui`.
    *   Hotkey: Implement custom `useHotkeys` hook:
        ```typescript
        // src/hooks/useHotkeys.ts
        import { useEffect } from 'react';

        export function useHotkeys(key: string, callback: () => void) {
          useEffect(() => {
            const handler = (e: KeyboardEvent) => {
              if (e.ctrlKey && e.shiftKey && e.key === key) {
                e.preventDefault();
                callback();
              }
            };
            document.addEventListener('keydown', handler);
            return () => document.removeEventListener('keydown', handler);
          }, [key, callback]);
        }
        // Usage: useHotkeys('D', () => devlogStore.open());
        ```
*   **`src/components/devlog/MarkdownEditor.tsx`:**
    *   Lib: CodeMirror 6 - Install exact versions:
        ```bash
        npm install @codemirror/state@^6.0.0 @codemirror/view@^6.0.0
        npm install @codemirror/commands@^6.0.0 @codemirror/lang-markdown@^6.0.0
        ```
    *   Config: Markdown lang support, JetBrains Mono font, custom keymap (`Ctrl-b`/`Ctrl-i`).

## Tasks / Subtasks

- [x] **Setup & Scaffold**
    - [x] Install CodeMirror 6 dependencies.
    - [x] Create `src/components/devlog/` directory.

- [x] **Backend Implementation**
    - [x] Create `src-tauri/src/commands/devlog.rs`.
    - [x] Implement `get_devlog_content` (reuse path logic from 3.7).
    - [x] Implement `append_devlog` (handle timestamping backend-side).
    - [x] Implement `write_devlog` (overwrite).
    - [x] Implement `get_devlog_mtime` for conflict detection.
    - [x] Register commands in `src-tauri/src/lib.rs`.

- [x] **Frontend State (Zustand)**
    - [x] Create `useDevlogStore` with open/close actions and project selection logic.

- [x] **UI Components**
    - [x] Implement `DevlogButton` (FAB) - Fixed position, check for Toaster overlap.
    - [x] Implement `MarkdownEditor` - CodeMirror setup with custom keymaps.
    - [x] Implement `DevlogModal` - Dialog structure, header with Project Select & Edit Mode toggle.
    - [x] Implement `ConflictDialog` - File conflict resolution UI.
    - [x] Create `useHotkeys` hook for `Ctrl+Shift+D` handling.

- [x] **Global Integration**
    - [x] Mount `<DevlogButton />` and `<DevlogModal />` in `src/App.tsx`.
    - [x] Move Toaster to `position="top-right"` in App.tsx.
    - [x] Verify Z-index layering:
        - Modal backdrop: `z-index: 100`
        - Modal content: `z-index: 101`
        - FAB button: `z-index: 50`
        - Toaster: `z-index: 60`
    - [x] Test: Open modal → FAB behind backdrop, Toaster behind modal
    - [x] Test: Close modal → FAB visible and clickable

## Dev Notes

### Architecture: Global Singleton
The `DevlogModal` should be rendered **once** at the root level (`App.tsx`), not inside each page. This ensures it preserves state when navigating and overlays everything.

### CodeMirror 6 Implementation
**Reference:** See `docs/sprint-artifacts/codemirror-research-2025-12-21.md` (lines 26-86) for:
- Basic React setup with EditorState and EditorView
- Custom Ctrl+B / Ctrl+I keymap implementation
- Auto-save extension pattern

**Key Pattern (from research doc):**
```typescript
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

// Custom markdown shortcuts
const markdownKeymap = keymap.of([
  {
    key: 'Ctrl-b',
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `**${selectedText}**` },
        selection: { anchor: from + 2, head: to + 2 }
      });
      return true;
    }
  },
  {
    key: 'Ctrl-i',
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `*${selectedText}*` },
        selection: { anchor: from + 1, head: to + 1 }
      });
      return true;
    }
  }
]);

const state = EditorState.create({
  doc: initialContent,
  extensions: [
    markdown(),
    keymap.of(defaultKeymap),
    markdownKeymap,
    EditorView.lineWrapping,
  ]
});
```
*Tip: Don't over-engineer the editor yet. No preview pane needed (it's for developers reading markdown).*

### Append vs Edit Mode
- **Append (Default):** Editor starts empty. On save, append `\n\n## YYYY-MM-DD HH:mm\n` + content to file.
- **Edit:** Load full file into editor. On save, overwrite entire file.
- **Mode Switch:**
    - Append → Edit: Load file + append current draft to end, update editor content.
    - Edit → Append: Clear editor (warn if unsaved changes present).

### Reference
- See `docs/sprint-artifacts/codemirror-research-2025-12-21.md` for CodeMirror setup code.
- See `src-tauri/src/context/devlog.rs` for existing file reading logic.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Codebuff)

### Debug Log References

- Fixed unused imports in Rust (OpenOptions, Write)
- Fixed unused imports in TypeScript (useCallback, metaMatch)
- Installed missing @radix-ui/react-label dependency

### Completion Notes List

- Implemented complete DEVLOG editor with CodeMirror 6 for markdown editing
- Created global FAB button with Ctrl+Shift+D hotkey support
- Implemented append mode (default) with auto-timestamping and edit mode for full file editing
- Added file conflict detection using mtime comparison before saves
- Created conflict resolution dialog with Reload/Keep Mine/Merge (disabled) options
- Implemented 30-second auto-save with debouncing
- All tests pass (184 tests), Rust and TypeScript compile without warnings

### File List

**New Files:**
- `src-tauri/src/commands/devlog.rs` - Backend commands for DEVLOG operations
- `src/hooks/useHotkeys.ts` - Global keyboard shortcut hook
- `src/hooks/useHotkeys.test.ts` - Tests for useHotkeys
- `src/stores/devlogStore.ts` - Zustand store for DEVLOG editor state
- `src/stores/devlogStore.test.ts` - Tests for devlogStore
- `src/components/devlog/DevlogButton.tsx` - FAB button component
- `src/components/devlog/DevlogButton.test.tsx` - Tests for DevlogButton
- `src/components/devlog/MarkdownEditor.tsx` - CodeMirror 6 wrapper
- `src/components/devlog/MarkdownEditor.test.tsx` - Tests for MarkdownEditor
- `src/components/devlog/ConflictDialog.tsx` - File conflict resolution dialog
- `src/components/devlog/ConflictDialog.test.tsx` - Tests for ConflictDialog
- `src/components/devlog/DevlogModal.tsx` - Main modal component
- `src/components/devlog/DevlogModal.test.tsx` - Tests for DevlogModal
- `src/components/devlog/index.ts` - Barrel exports
- `src/components/ui/label.tsx` - Label component for forms
- `src/components/ui/select.tsx` - Select dropdown component (shadcn)
- `src/components/ui/switch.tsx` - Toggle switch component (shadcn)

**Modified Files:**
- `src-tauri/src/commands/mod.rs` - Added devlog module export
- `src-tauri/src/lib.rs` - Registered devlog commands
- `src-tauri/src/context/devlog.rs` - Made DEVLOG_LOCATIONS public
- `src/App.tsx` - Mounted DevlogButton/Modal, moved Toaster to top-right
- `package.json` - Added CodeMirror dependencies
- `package-lock.json` - Updated lock file with new dependencies

