# DEVLOG File Conflict Resolution UI Specification

**Date:** 2025-12-21  
**Designer:** Elena (Junior Dev)  
**Epic:** Epic 4 - Story 4.2 (File Sync with Repository)

---

## Conflict Scenario

**Trigger:** User has DEVLOG modal open and editing content. External process (VS Code, git pull, etc.) modifies DEVLOG.md file.

**Detection:** notify crate detects file change event → compare file mtime with last-loaded timestamp → conflict detected

---

## UI Design

### Conflict Dialog

**Appearance:**
- Modal overlay (semi-transparent backdrop, z-index above DEVLOG editor)
- Dialog box: 500px width, centered
- Warning icon (⚠️) in amber color (#F59E0B)
- Clear, non-technical language

**Content:**

```
┌─────────────────────────────────────────────┐
│  ⚠️  DEVLOG Changed Externally              │
├─────────────────────────────────────────────┤
│                                             │
│  DEVLOG.md was modified outside Ronin       │
│  while you were editing.                    │
│                                             │
│  What would you like to do?                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [Reload]                            │   │
│  │ Discard your changes and load the   │   │
│  │ external version                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [Keep Mine]                         │   │
│  │ Overwrite the external changes with │   │
│  │ your current edits                  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [Merge] (Coming in v0.3)            │   │
│  │ View both versions side-by-side     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│                    [Cancel]                 │
└─────────────────────────────────────────────┘
```

### Button Behavior

| Button | Action | Keyboard |
|--------|--------|----------|
| **Reload** | Discard modal content, load external file, close dialog | R |
| **Keep Mine** | Save modal content to file (overwrite), close dialog | K |
| **Merge** | Disabled in MVP, show "Coming in v0.3" tooltip | M |
| **Cancel** | Close dialog, pause auto-save, keep modal open | Escape |

### Auto-Save Behavior During Conflict

- **Before conflict detected:** Auto-save runs every 30 seconds
- **After conflict detected:** Auto-save pauses, dialog appears
- **After resolution:** Auto-save resumes

### Visual States

**Reload Button:**
- Default: Secondary button style (gray)
- Hover: Darker gray
- Focus: Antique Brass ring

**Keep Mine Button:**
- Default: Primary button style (Antique Brass)
- Hover: Darker Antique Brass
- Focus: Antique Brass ring
- Warning: Amber border (this overwrites external changes)

**Merge Button (Disabled):**
- Grayed out with reduced opacity
- Tooltip on hover: "Merge feature coming in v0.3"

---

## Accessibility

- **ARIA labels:** Dialog has `role="alertdialog"` and `aria-labelledby="conflict-title"`
- **Focus management:** Dialog traps focus, first button receives focus on open
- **Keyboard navigation:** Tab cycles through buttons, Escape closes dialog
- **Screen reader:** Announces "Warning: DEVLOG changed externally" on open

---

## Technical Implementation Notes

### React Component Structure
```tsx
<ConflictDialog
  isOpen={conflictDetected}
  onReload={() => loadExternalFile()}
  onKeepMine={() => saveCurrentContent()}
  onCancel={() => setConflictDetected(false)}
/>
```

### Conflict Detection Logic (Rust)
```rust
// In file watcher callback
if file_mtime > last_loaded_mtime {
    emit_event("devlog-conflict", project_id);
}
```

### Frontend Event Listener
```tsx
useEffect(() => {
  const unlisten = listen('devlog-conflict', (event) => {
    setConflictDetected(true);
    pauseAutoSave();
  });
  return () => unlisten();
}, []);
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User clicks Reload | Modal content replaced, unsaved changes lost (expected) |
| User clicks Keep Mine | External changes overwritten (expected, user confirmed) |
| User clicks Cancel | Dialog closes, modal stays open, auto-save paused |
| Multiple conflicts | Only show one dialog at a time, re-check on resolution |
| File deleted externally | Different dialog: "DEVLOG.md deleted. [Recreate] [Cancel]" |

---

## Design Assets Needed

- ⚠️ Warning icon (use Lucide React `AlertTriangle`)
- Button styles already defined in Ronin design system
- No custom illustrations needed for MVP

---

**Status:** ✅ Specification Complete  
**Ready for Implementation:** Yes - Story 4.2 can reference this spec
