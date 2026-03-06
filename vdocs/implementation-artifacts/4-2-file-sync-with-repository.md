# Story 4.2: File Sync with Repository

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **DEVLOG content to sync with a file in my project with conflict detection**,
So that **my notes travel with my code and external edits are handled safely**.

## Acceptance Criteria (BDD)

### 1. File Read/Write Operations

**Given** the user edits DEVLOG content in Ronin's modal editor
**When** the content is saved (auto-save or manual close)
**Then** the file `DEVLOG.md` is written to the project root directory
**And** file is created if it doesn't exist
**And** existing DEVLOG.md content is loaded when modal opens

### 2. External Change Detection

**Given** DEVLOG.md file exists in project repository
**When** file changes are made outside Ronin (via terminal, other editor, git pull, etc.)
**Then** file changes are detected via polling mtime every 5 seconds
**And** if file changed externally while modal is open, conflict dialog shows immediately
**And** auto-save pauses when conflict is detected until user resolves
**And** user sees visual indicator that auto-save is paused

### 3. Conflict Resolution

**Given** file was modified externally while modal is open
**When** user attempts to save (auto-save or manual close)
**Then** conflict detection compares file mtime before save vs mtime at modal open
**And** if mtime changed, shows conflict dialog with options:
  - **[Reload] (R)** - Discard modal changes, load external version into editor
  - **[Keep Mine] (K)** - Overwrite external changes with modal content
  - **[Merge] (M)** - Show both versions for manual merge (v0.3 feature - display "Not implemented yet" message)
**And** conflict dialog shows preview of external file size (line count)
**And** conflict dialog blocks all save operations until resolved
**And** keyboard shortcuts work: R=Reload, K=Keep Mine, Escape=Cancel
**And** after resolution, normal auto-save resumes with fresh timer
**And** if resolution fails (file read/write error), user's modal content is preserved

### 4. File Location Logic (Multi-Location Strategy)

**Given** the system needs to locate DEVLOG.md for a project
**When** determining file path
**Then** the system follows the same multi-location logic from Story 3.7:
  1. Check project root: `{project_path}/DEVLOG.md` (Priority 1)
  2. Check docs folder: `{project_path}/docs/DEVLOG.md` (Priority 2)
  3. Check .devlog folder: `{project_path}/.devlog/DEVLOG.md` (Priority 3)
**And** if file doesn't exist, create at project root (preferred location)
**And** if file exists in multiple locations, use the first one found (root → docs → .devlog)

### 5. Mode-Specific Save Behavior

**Given** user is in append mode (default)
**When** saving new content
**Then** system appends timestamp header + content to existing file
**And** modal editor content is NOT cleared after save (allows continued writing)

**Given** user is in edit mode (full control)
**When** saving content
**Then** system overwrites entire file with editor content
**And** no timestamp header is added automatically

## Tasks / Subtasks

- [x] **Backend Breaking Changes (CRITICAL: Function signature changes)**
  - [x] CREATE new command `get_devlog_with_mtime(project_path: String) -> Result<DevlogData, String>` where `DevlogData` struct contains `{ content: String, mtime: u64 }`
  - [x] MODIFY `append_devlog(project_path: String, content: String, expected_mtime: u64) -> Result<(), String>` - add `expected_mtime` parameter
  - [x] MODIFY `write_devlog(project_path: String, content: String, expected_mtime: u64) -> Result<(), String>` - add `expected_mtime` parameter
  - [x] ADD mtime comparison logic before write in both append/write commands
  - [x] RETURN special `Err("CONFLICT")` when mtime mismatch detected
  - [x] IMPLEMENT `get_devlog_mtime(project_path: String) -> Result<u64, String>` for polling
  - [x] IMPLEMENT `resolve_conflict_reload(project_path: String) -> Result<DevlogWithMtime, String>` with error recovery
  - [x] VERIFY all commands reuse `find_devlog_path()` from `src-tauri/src/context/devlog.rs`

- [x] **Frontend Store Enhancement**
  - [x] ADD `lastKnownMtime: number | null` to devlogStore
  - [x] ADD `conflictDetected: boolean` to devlogStore
  - [x] ADD `conflictDialogOpen: boolean` to devlogStore
  - [x] ADD `lastSavedTimestamp: number | null` for "last saved" indicator
  - [x] IMPLEMENT `setMtime(mtime: number)` action
  - [x] IMPLEMENT `detectConflict()` action (sets conflictDetected=true, pauses auto-save)
  - [x] IMPLEMENT `resolveConflict(action: 'reload' | 'keep-mine')` with error recovery
  - [ ] ADD local telemetry tracking: log conflict resolution choices (deferred to v0.3)

- [x] **Component Updates - DevlogModal.tsx**
  - [x] MODIFY modal open handler to call `get_devlog_with_mtime()` instead of `get_devlog_content()`
  - [x] STORE both content and mtime when modal opens
  - [x] ADD mtime polling every 5 seconds using `setInterval`
  - [x] ADD debounce logic: skip poll if user typed within last 10 seconds
  - [x] DETECT conflict when polled mtime !== lastKnownMtime
  - [x] PASS expected_mtime to all save operations (append_devlog, write_devlog)
  - [x] HANDLE CONFLICT error from backend → show ConflictDialog
  - [x] ADD "last saved" timestamp indicator in modal footer
  - [x] SHOW visual badge when auto-save is paused due to conflict

- [x] **Component Updates - ConflictDialog.tsx (Verification)**
  - [x] VERIFY component exists (created in Story 4.1)
  - [x] VERIFY props match: `{ isOpen: boolean, onReload: () => void, onKeepMine: () => void, onCancel: () => void, externalFileInfo?: { lineCount: number } }`
  - [x] VERIFY buttons: [Reload] [Keep Mine] [Merge (disabled)]
  - [x] IMPLEMENT keyboard shortcuts: R key → Reload, K key → Keep Mine, Escape → Cancel
  - [x] ADD external file preview: "External file has X lines (yours has Y lines)"
  - [x] VERIFY aria-labels for accessibility
  - [x] VERIFY matches spec: `docs/sprint-artifacts/devlog-conflict-ui-spec-2025-12-21.md`

- [x] **Component Updates - MarkdownEditor.tsx**
  - [x] MODIFY auto-save effect to check `conflictDetected` flag
  - [x] PAUSE auto-save when `conflictDetected === true` (clear timer)
  - [x] RESUME auto-save after conflict resolved (restart 30s timer)
  - [x] UPDATE all frontend call sites to pass `expectedMtime` parameter to append/write commands

- [x] **Testing**
  - [x] Test: Open modal → edit externally → polling detects conflict within 5s → dialog shows
  - [x] Test: Conflict detected → [Reload] → editor updates with external content
  - [x] Test: Conflict detected → [Keep Mine] → file overwritten with modal content
  - [x] Test: Conflict → Reload fails (file deleted) → modal content preserved, error shown
  - [x] Test: Auto-save pauses when conflict detected, resumes after resolution
  - [x] Test: Auto-save timer resets after resolution
  - [x] Test: Keyboard shortcuts (R/K/Escape) work in ConflictDialog
  - [x] Test: "Auto-save paused" badge shows during conflict
  - [x] Test: "Last saved" timestamp updates after successful save
  - [x] Test: Multi-location strategy (root, docs/, .devlog/) all work
  - [x] Test: File creation when doesn't exist
  - [x] Test: Debounce polling when user actively typing

## Technical Requirements

### Backend Architecture (src-tauri/src/commands/devlog.rs)

**CRITICAL CONTEXT:** Story 4.1 created basic Tauri commands. This story MODIFIES their signatures (breaking changes) and ADDS conflict detection logic.

#### DEVLOG Multi-Location Strategy (Reuse from Story 3.7)

**Source:** `src-tauri/src/context/devlog.rs` contains `DEVLOG_LOCATIONS` constant.

**Location priority order:**
1. `{project_path}/DEVLOG.md` (root - preferred)
2. `{project_path}/docs/DEVLOG.md` (docs folder)
3. `{project_path}/.devlog/DEVLOG.md` (hidden folder)

**Logic:**
- Search in order above, return FIRST match found
- If none exist, create at root (`{project_path}/DEVLOG.md`)
- All commands MUST use `find_devlog_path()` from context::devlog module

#### Breaking Changes to Existing Commands

**1. Replace `get_devlog_content()` with `get_devlog_with_mtime()`**

```rust
// Story 4.1 had:
// get_devlog_content(project_path: String) -> Result<String, String>

// Story 4.2 creates NEW command:
#[derive(serde::Serialize)]
struct DevlogData {
    content: String,
    mtime: u64,
}

#[tauri::command]
async fn get_devlog_with_mtime(project_path: String) -> Result<DevlogData, String> {
    let devlog_path = find_devlog_path(&project_path)?;
    let content = fs::read_to_string(&devlog_path).unwrap_or_default();
    let mtime = get_file_mtime(&devlog_path)?;
    Ok(DevlogData { content, mtime })
}
```

**2. MODIFY `append_devlog` signature - add `expected_mtime` parameter**

```rust
// Story 4.1 had: append_devlog(project_path, content)
// Story 4.2 changes to:

#[tauri::command]
async fn append_devlog(
    project_path: String,
    content: String,
    expected_mtime: u64  // NEW: Frontend passes last known mtime
) -> Result<(), String> {
    let devlog_path = find_devlog_path(&project_path)?;

    // CONFLICT DETECTION: Check mtime before write
    if devlog_path.exists() {
        let current_mtime = get_file_mtime(&devlog_path)?;
        if current_mtime != expected_mtime {
            return Err("CONFLICT".to_string()); // Special error code
        }
    }

    // Proceed with append (existing logic from 4.1)
    let timestamp = Local::now().format("%Y-%m-%d %H:%M").to_string();
    let header = format!("\n\n## {}\n", timestamp);
    let new_content = format!("{}{}", header, content);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&devlog_path)
        .map_err(|e| format!("Write failed: {}", e))?;

    file.write_all(new_content.as_bytes())
        .map_err(|e| format!("Write failed: {}", e))?;

    Ok(())
}
```

**3. MODIFY `write_devlog` signature - add `expected_mtime` parameter**

Same pattern as `append_devlog` - add mtime check before overwrite.

#### New Commands to Implement

**4. `get_devlog_mtime()` - For polling external changes**

```rust
#[tauri::command]
async fn get_devlog_mtime(project_path: String) -> Result<u64, String> {
    let devlog_path = find_devlog_path(&project_path)?;
    if !devlog_path.exists() {
        return Ok(0); // File doesn't exist
    }
    get_file_mtime(&devlog_path)
}

// Helper function
fn get_file_mtime(path: &Path) -> Result<u64, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let mtime = metadata.modified()
        .map_err(|e| format!("Failed to get mtime: {}", e))?
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    Ok(mtime)
}
```

**5. `resolve_conflict_reload()` - Reload external file with error recovery**

```rust
#[tauri::command]
async fn resolve_conflict_reload(project_path: String) -> Result<DevlogData, String> {
    // Re-read file and return latest content + mtime
    // Same as get_devlog_with_mtime, but name makes intent clear
    get_devlog_with_mtime(project_path).await
}
```

#### Conflict Detection Strategy

**Two-layer approach:**

1. **Proactive polling (frontend):**
   - Poll `get_devlog_mtime()` every 5 seconds when modal open
   - Compare with `lastKnownMtime` in store
   - If different → set `conflictDetected = true` → show dialog immediately
   - Debounce: skip poll if user typed within last 10 seconds

2. **Reactive safety net (backend):**
   - Check mtime in `append_devlog` and `write_devlog` before write
   - Return `Err("CONFLICT")` if mismatch
   - Catches race conditions where poll missed external change

**Why both?** Proactive gives better UX (detect before save attempt). Reactive ensures data safety (catch all edge cases).

### Frontend Architecture

#### Auto-Save State Machine

**States:**

1. **NORMAL**: Timer running, saves every 30s
2. **CONFLICT_DETECTED**: Timer cleared, saves paused, dialog shown
3. **RESOLVING**: User clicked Reload/Keep Mine, processing
4. **RESOLVED**: Conflict cleared, restart 30s timer

**State transitions:**

```
NORMAL → (poll detects mtime change) → CONFLICT_DETECTED
CONFLICT_DETECTED → (user clicks Reload/Keep Mine) → RESOLVING
RESOLVING → (success) → RESOLVED → NORMAL
RESOLVING → (failure) → CONFLICT_DETECTED (stay in conflict, preserve modal content)
NORMAL → (user types) → (restart 30s timer from last keystroke)
```

**Implementation:**

```typescript
// In MarkdownEditor.tsx
useEffect(() => {
  if (conflictDetected) {
    // State: CONFLICT_DETECTED - pause auto-save
    return;
  }

  // State: NORMAL - auto-save timer running
  const timer = setTimeout(async () => {
    try {
      await invoke('append_devlog', {
        projectPath: activeProjectPath,
        content: editorContent,
        expectedMtime: lastKnownMtime
      });
      setLastSaved(Date.now()); // Update "last saved" indicator
    } catch (error) {
      if (error === 'CONFLICT') {
        devlogStore.detectConflict(); // → CONFLICT_DETECTED state
      } else {
        toast.error("Couldn't save. Try again?");
      }
    }
  }, 30000);

  return () => clearTimeout(timer);
}, [editorContent, conflictDetected, lastKnownMtime]);
```

#### Error Recovery in Conflict Resolution

**Critical requirement:** NEVER lose user's modal content.

**[Reload] error handling:**

```typescript
async resolveConflictReload() {
  try {
    const { content, mtime } = await invoke('resolve_conflict_reload', {
      projectPath: activeProjectPath
    });
    setEditorContent(content); // Update editor with external content
    setLastKnownMtime(mtime);
    setConflictDetected(false); // Clear conflict, resume auto-save
  } catch (error) {
    // File read failed (deleted, permissions, etc.)
    // CRITICAL: Keep modal content, don't discard
    toast.error("Couldn't reload file. Your changes are safe in the editor.");
    // Stay in CONFLICT_DETECTED state, offer retry
  }
}
```

**[Keep Mine] error handling:**

```typescript
async resolveConflictKeepMine() {
  try {
    await invoke('write_devlog', {
      projectPath: activeProjectPath,
      content: editorContent,
      expectedMtime: 0  // Force overwrite, ignore mtime
    });
    const newMtime = await invoke('get_devlog_mtime', { projectPath: activeProjectPath });
    setLastKnownMtime(newMtime);
    setConflictDetected(false); // Clear conflict, resume auto-save
    logTelemetry('devlog_conflict_resolved', { choice: 'keep-mine' });
  } catch (error) {
    // Write failed (permissions, disk full, etc.)
    toast.error("Couldn't save. Try again or Reload to see external changes.");
    // Stay in CONFLICT_DETECTED state, modal content preserved
  }
}
```

#### State Management (src/stores/devlogStore.ts)

**ADD to existing store:**

```typescript
interface DevlogStore {
  // ... existing fields from 4.1 ...

  // NEW: Conflict detection state
  lastKnownMtime: number | null;
  conflictDetected: boolean;
  conflictDialogOpen: boolean;
  lastSavedTimestamp: number | null;
  externalFileInfo: { lineCount: number } | null;

  // NEW: Conflict actions
  setMtime: (mtime: number) => void;
  detectConflict: () => void;
  resolveConflict: (action: 'reload' | 'keep-mine') => Promise<void>;
  setLastSaved: (timestamp: number) => void;
}
```

#### Component Enhancements

**1. DevlogModal.tsx**

- REPLACE call to `get_devlog_content()` with `get_devlog_with_mtime()`
- STORE both content and mtime when opening
- ADD mtime polling every 5s (with 10s debounce when user typing)
- SHOW conflict dialog when conflict detected
- ADD "Auto-save paused" badge when `conflictDetected === true`
- ADD "Last saved: X minutes ago" footer indicator
- FETCH external file line count for preview when conflict detected

**2. ConflictDialog.tsx (VERIFY from Story 4.1)**

**Verification checklist:**

- [x] Props: `isOpen`, `onReload`, `onKeepMine`, `onCancel`, `externalFileInfo?`
- [x] Buttons: [Reload] [Keep Mine] [Merge (disabled with tooltip)]
- [x] Keyboard shortcuts: R → Reload, K → Keep Mine, Escape → Cancel
- [x] Preview text: "External file has X lines (yours has Y lines)"
- [x] Aria-labels: `aria-label="Reload external changes (R)"` etc.
- [x] Matches spec: `docs/sprint-artifacts/devlog-conflict-ui-spec-2025-12-21.md`

**3. MarkdownEditor.tsx**

- MODIFY auto-save logic to check `conflictDetected` flag
- PAUSE timer when conflict detected
- RESUME timer after conflict resolved
- RESET timer on every keystroke (debounce 30s)

#### Polling with Debounce

**Optimization:** Don't poll when user actively typing (reduces file system overhead).

```typescript
// In DevlogModal.tsx
const [lastKeystrokeTime, setLastKeystrokeTime] = useState(Date.now());

useEffect(() => {
  if (!isOpen) return;

  const pollInterval = setInterval(async () => {
    // DEBOUNCE: Skip poll if user typed within last 10 seconds
    if (Date.now() - lastKeystrokeTime < 10000) {
      return;
    }

    const currentMtime = await invoke('get_devlog_mtime', {
      projectPath: activeProjectPath
    });

    if (currentMtime !== lastKnownMtime && currentMtime !== 0) {
      // Fetch external file info for preview
      const externalContent = await invoke('resolve_conflict_reload', {
        projectPath: activeProjectPath
      });
      const externalLineCount = externalContent.content.split('\n').length;

      devlogStore.setExternalFileInfo({ lineCount: externalLineCount });
      devlogStore.detectConflict();
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}, [isOpen, activeProjectPath, lastKnownMtime, lastKeystrokeTime]);
```

### Optimizations (Optional but Recommended)

**1. Combine get_devlog_with_mtime into single call (instead of separate content + mtime)**

Already implemented above - `get_devlog_with_mtime()` returns both.

**2. Cache mtime in store to avoid redundant calls**

Store tracks `lastKnownMtime` - only update when modal opens or conflict resolved.

**3. Consider notify crate for v0.3 (event-driven instead of polling)**

Current polling approach is MVP (simple, reliable). Future optimization:

```rust
// Use notify crate (already set up in Story 1.3/3.7)
// Emit Tauri event when DEVLOG.md changes
window.emit("devlog-file-changed", { projectPath, newMtime });
```

**Benefits:** Real-time detection (no 5s delay), lower CPU usage.
**Tradeoff:** More complex, requires event bridge, potential race conditions.
**Decision:** Defer to v0.3 based on user feedback.

### Rust Dependencies (already in Cargo.toml)

```toml
chrono = "0.4"  # For timestamp formatting
notify = "6.0"  # File system events (from Story 1.3)
serde = { version = "1.0", features = ["derive"] }  # For DevlogData struct
```

### Reference Documents

| File | Purpose |
|------|---------|
| `docs/sprint-artifacts/devlog-conflict-ui-spec-2025-12-21.md` | Conflict dialog UI/UX spec |
| `docs/sprint-artifacts/4-1-devlog-editor-component.md` | Previous story (completed components) |
| `src-tauri/src/context/devlog.rs` | Multi-location DEVLOG_LOCATIONS constant |

### Known Existing Files (DO NOT create - MODIFY only)

- `src/components/devlog/ConflictDialog.tsx` (created in 4.1)
- `src/components/devlog/DevlogModal.tsx` (created in 4.1)
- `src/components/devlog/MarkdownEditor.tsx` (created in 4.1)
- `src/stores/devlogStore.ts` (created in 4.1)
- `src-tauri/src/commands/devlog.rs` (created in 4.1)

## Dev Notes

### Integration with Story 4.1

**Story 4.1 deliverables (completed):**
- ✅ DevlogButton FAB component
- ✅ DevlogModal with CodeMirror editor
- ✅ Append mode + Edit mode toggle
- ✅ Auto-save every 30 seconds
- ✅ ConflictDialog UI component
- ✅ Basic Tauri commands (get_devlog_content, append_devlog, write_devlog)

**Story 4.2 breaking changes and additions:**
- ⚠️ BREAKING: Replace `get_devlog_content()` with `get_devlog_with_mtime()`
- ⚠️ BREAKING: Add `expected_mtime` parameter to `append_devlog()` and `write_devlog()`
- ✅ NEW: Conflict detection with mtime comparison
- ✅ NEW: Auto-save state machine with pause/resume
- ✅ NEW: Error recovery in conflict resolution
- ✅ NEW: Visual indicators (paused badge, last saved timestamp)
- ✅ NEW: Keyboard shortcuts in ConflictDialog
- ✅ NEW: External file preview in conflict dialog

### Architecture Compliance

**Memory Budget (from project-context.md):**
- GUI total: <200MB RSS ✅ (polling adds ~0MB overhead)
- Per-project overhead: <1MB ✅ (mtime is 8 bytes, debounce flag is negligible)

**Performance Targets:**
- Auto-save: 30 seconds ✅ (unchanged from 4.1)
- Conflict detection: <5 seconds ✅ (polling interval, debounced when typing)
- File write: <100ms ✅ (local file I/O)
- Polling overhead: <1ms per check ✅ (single stat() syscall)

**Security (from architecture.md):**
- All data local only ✅ (DEVLOG.md in project repo)
- No cloud sync ✅ (file system only)
- User controls conflict resolution ✅ (manual choice, no auto-merge)
- No data loss ✅ (error recovery preserves modal content)

### Testing Strategy

**Unit Tests:**
- `devlogStore.test.ts`: Test state transitions (NORMAL → CONFLICT_DETECTED → RESOLVED)
- `devlog.rs`: Test mtime comparison logic, error cases

**Integration Tests:**
- Modal open → external edit → polling detects within 5s → dialog shows
- Conflict → [Reload] → editor updates, auto-save resumes
- Conflict → [Keep Mine] → file overwritten, auto-save resumes
- Conflict → Reload fails → modal content preserved, error shown
- Auto-save pauses during conflict → resumes after resolution

**Manual Test Scenarios (for Product Lead V):**

#### Test Case 1: External Edit Conflict - Reload
**Steps:**
1. Open Ronin, click DEVLOG FAB button
2. Select a project, type "Test content" in editor
3. WITHOUT closing modal, open terminal
4. Run: `echo "External edit" >> path/to/project/DEVLOG.md`
5. Wait 5 seconds (for polling to detect)
6. Observe conflict dialog appears with line count preview
7. Press R key (or click [Reload])

**Expected Result:**
- Conflict dialog shows "External file has X lines (yours has Y lines)"
- Auto-save paused badge visible in modal
- Pressing R reloads external content into editor
- Modal remains open, can continue editing
- Auto-save resumes with fresh 30s timer

#### Test Case 2: External Edit Conflict - Keep Mine
**Steps:**
1. Open modal, type "My important notes"
2. External edit: `echo "Accidental edit" >> DEVLOG.md`
3. Wait for conflict dialog
4. Press K key (or click [Keep Mine])

**Expected Result:**
- File content is overwritten with "My important notes"
- Conflict dialog closes
- Auto-save resumes
- External "Accidental edit" is lost (user chose to discard)
- Telemetry logged: `devlog_conflict_resolved: keep-mine`

#### Test Case 3: Auto-Save Pauses During Conflict
**Steps:**
1. Open modal, type "First entry"
2. Wait 30 seconds (auto-save should trigger)
3. External edit: `echo "Conflict" >> DEVLOG.md`
4. Continue typing in modal: "Second entry"
5. Wait 30 seconds

**Expected Result:**
- First auto-save completes successfully
- "Last saved: moments ago" shows in footer
- After external edit (within 5s), conflict dialog appears
- "Auto-save paused" badge shows
- "Second entry" is NOT auto-saved (timer cleared)
- After resolving conflict, auto-save resumes with fresh timer

#### Test Case 4: Keyboard Shortcuts
**Steps:**
1. Trigger conflict dialog
2. Press R key → should trigger Reload
3. Trigger conflict again
4. Press K key → should trigger Keep Mine
5. Trigger conflict again
6. Press Escape → should close dialog (cancel)

**Expected Result:**
- All keyboard shortcuts work
- Aria-labels present for screen readers

#### Test Case 5: Polling Debounce
**Steps:**
1. Open modal
2. Type continuously for 15 seconds
3. Monitor network/IPC traffic (dev tools)

**Expected Result:**
- No `get_devlog_mtime` calls during active typing (10s debounce)
- Polling resumes 10s after last keystroke

#### Test Case 6: Error Recovery - Reload Fails
**Steps:**
1. Open modal, type content
2. External edit triggers conflict
3. In terminal: `rm path/to/project/DEVLOG.md` (delete file)
4. Click [Reload]

**Expected Result:**
- Error toast: "Couldn't reload file. Your changes are safe in the editor."
- Modal content preserved (NOT cleared)
- Conflict dialog remains open
- User can retry or [Keep Mine] to recreate file

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Implemented backend conflict detection using mtime comparison with millisecond precision
- Updated `DevlogModal` to poll for external changes every 5 seconds (debounced)
- Added `ConflictDialog` with options to Reload or Keep Mine (overwrite)
- Implemented auto-save pause/resume logic during conflict state
- Added visual indicators for conflict and last saved time
- Verified backend logic with Rust tests (`cargo test commands::devlog`)
- Verified frontend components with Vitest (`npm test src/components/devlog/`)
- All Acceptance Criteria met

### Manual Verification & Polish (Post-Code Review)
- **Fixed UI Crash (Z-Index War):** Increased `ConflictDialog` z-index to `[110]` to appear above `DevlogModal` (`[101]`), resolving an issue where the dialog trapped focus but was visually obscured.
- **Fixed Layout Issues:** Added `flex-shrink-0` to modal footer and `overflow-hidden` to editor container to prevent text bleeding and layout shifting in Edit Mode.
- **Theming Improvements:** Added CSS variable overrides to `index.css` to ensure prose (headers, bold text) uses theme-aware colors (`text-foreground`) instead of hardcoded defaults, fixing readability in Light Mode.
- **UI Polish:** Removed visual keyboard shortcut hints (`Ctrl+B/I`) for a cleaner footer and consolidated status indicators.

### File List
- src-tauri/src/commands/devlog.rs
- src-tauri/src/context/devlog.rs
- src-tauri/src/lib.rs
- src/stores/devlogStore.ts
- src/components/devlog/DevlogModal.tsx
- src/components/devlog/ConflictDialog.tsx
- src/components/devlog/DevlogModal.test.tsx
- src/stores/devlogStore.test.ts
- src/components/devlog/ConflictDialog.test.tsx
- package.json
- package-lock.json
