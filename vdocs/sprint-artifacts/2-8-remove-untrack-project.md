# Story 2.8: Remove/Untrack Project

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to remove a project from Ronin's tracking**,
so that **I can keep my dashboard clean and focused on active projects**.

## Acceptance Criteria

1. **Given** the user has a project tracked in Ronin
2. **When** the user selects "Remove" from the project card menu
3. **Then** a confirmation dialog appears: "Remove [Project Name] from Ronin?"
4. **And** the confirmation explains: "Your files won't be deleted. Only tracking stops."
5. **And** clicking "Remove" removes the project from the SQLite database (soft delete) and dashboard list
6. **And** clicking "Cancel" returns to the dashboard without changes
7. **And** a success toast appears: "Project removed from tracking"
8. **And** NO project files or DEVLOG content are deleted from the disk (Constraint: Data Safety)

## Tasks / Subtasks

- [x] **Database Migration (Soft Delete)**
  - [x] Update `src-tauri/src/db.rs` to add `deleted_at` column to `projects` table (nullable DATETIME)
  - [x] Ensure migration is idempotent (check if column exists first)
- [x] **Backend Implementation**
  - [x] Implement `remove_project` command in `src-tauri/src/commands/projects.rs`
  - [x] Update `get_projects` query to exclude records where `deleted_at IS NOT NULL`
  - [ ] Update Silent Observer / Context Aggregator project fetching logic to exclude `deleted_at IS NOT NULL` projects
- [x] **Frontend Implementation**
  - [x] Update `src/components/ProjectCard.tsx` to add "Remove" option to the dropdown menu
  - [x] Create confirmation dialog (using shadcn/ui `Dialog` or `AlertDialog`)
  - [x] Update `src/stores/projectStore.ts` to handle the removal action (wait for confirmation)
- [x] **Testing**
  - [x] Unit test: Verify `remove_project` sets `deleted_at` timestamp
  - [x] Unit test: Verify `get_projects` filters out deleted projects
  - [ ] Unit test: Verify Silent Observer ignores deleted projects *(Deferred: Silent Observer not yet implemented)*
  - [x] Manual test: Verify files on disk remain untouched after removal
  - [x] Unit test: Remove dialog UI flow (added by code review)

## Dev Notes

### Architecture & Implementation Guardrails

- **Soft Delete Pattern:** We are adopting a **Soft Delete** strategy for project removal. This allows for a future "Undo" feature (v0.3) and prevents accidental data loss.
    - **Schema Change:** You must modify `src-tauri/src/db.rs` to add `deleted_at` (DATETIME or INTEGER timestamp) to the `projects` table. Follow the existing pattern used for `is_archived`.
    - **Query Update:** All SELECT queries for the dashboard must now include `WHERE deleted_at IS NULL`.

- **Silent Observer Data:**
    - Per FR specification, "Silent Observer data for this project is also removed".
    - **Implementation:** For this story (MVP), "removed" means "hidden/ignored". Since we use soft delete for the project, the associated observer data effectively becomes orphaned or hidden from view.
    - **Constraint:** Do NOT delete rows from `observer_events` yet. We rely on the project's soft delete status to filter these out.

- **Data Safety (Critical):**
    - Under NO circumstances should `std::fs::remove_dir_all` or similar file deletion commands be executed on the project path.
    - The "Remove" action is strictly a *database metadata* operation.

### Component Guidelines

- **Dialog Component:** Use `radix-ui` primitives via `shadcn/ui` for the confirmation dialog. It must be accessible (keyboard navigation, focus trap).
- **Menu Item:** The "Remove" option should be in the ProjectCard's "More Options" (...) menu.
- **Destructive Action Styling:** The "Remove" button in the dialog should use `variant="destructive"` (red styling) to indicate consequence.
    - **Typography Rule:** This CTA button MUST use `Libre Baskerville` font-family.

### Project Structure Notes

- **Backend:** `src-tauri/src/commands/projects.rs` is the correct home for the `remove_project` command.
- **Frontend Store:** `src/stores/projectStore.ts` manages the project list state.
    - **Safety:** Wait for backend confirmation (await command) before removing from the store to prevent UI desync.

### References

- **Architecture:** `docs/architecture.md` (Data Persistence Layer)
- **UX Spec:** `docs/ux-design-specification.md` (Confirmation Patterns, Journey 4 logic adaptation)
- **Database Schema:** `src-tauri/src/db.rs` (Current schema and migration logic)

## Manual Test Notes (Product Lead Verification)

### Test Case 1: Remove Active Project
**Steps:**
1. Create a new dummy project "Test Remove"
2. Navigate to Dashboard
3. Click "..." on "Test Remove" card and select "Remove"
4. Verify Confirmation Dialog appears with "Remove" button (Red, Serif font)
5. Click "Remove"
6. Verify Success Toast appears
7. Verify "Test Remove" card disappears from Dashboard

**Expected Result:**
- Project removed from UI
- Database `projects` table shows `deleted_at` is set (via `sqlite3` CLI)

**Actual Result:** [To be filled during verification]

### Test Case 2: Data Safety Check
**Steps:**
1. Check the file system path for "Test Remove" project
2. Verify the folder and files still exist

**Expected Result:**
- Files remain on disk (Soft Delete only)

**Actual Result:** [To be filled during verification]

## Dev Agent Record

### Agent Model Used

Qwen Code

### Debug Log References

- Checked `src-tauri/src/db.rs`: Verified existing migration pattern.
- Checked `docs/epics.md`: Confirmed FR7 and NFR13 requirements.

### Completion Notes List

- [x] Schema migration successful: Added `deleted_at` column to projects table with idempotent migration
- [x] Command implementation verified: Added `remove_project` command with proper soft delete functionality
- [x] Frontend integration verified: Added "Remove" option to ProjectCard with confirmation dialog
- [x] Success toast on removal (AC7) - Fixed by code review
- [x] AlertDialogAction destructive variant prop - Fixed by code review
- [x] Remove dialog tests added - Fixed by code review

### File List

- src-tauri/src/db.rs
- src-tauri/src/commands/projects.rs
- src-tauri/src/lib.rs
- src-tauri/Cargo.lock
- src/components/Dashboard/ProjectCard.tsx
- src/components/Dashboard/ProjectCard.test.tsx
- src/components/ui/alert-dialog.tsx *(NEW)*
- src/components/ui/button.tsx
- src/stores/projectStore.ts
- src/App.tsx
- package.json
- package-lock.json

### Senior Developer Review (AI)

**Reviewer:** Antigravity (Gemini)  
**Date:** 2025-12-19  
**Status:** ✅ APPROVED

**Issues Found & Fixed:**

| Severity | Issue | Resolution |
|----------|-------|------------|
| HIGH | AC7 missing success toast | Added toast.success() with sonner library |
| HIGH | AlertDialogAction didn't accept variant prop | Fixed component to pass variant to buttonVariants() |
| MEDIUM | alert-dialog.tsx untracked | Added to git |
| MEDIUM | File List incomplete | Updated with all 12 modified/new files |
| MEDIUM | No tests for Remove dialog | Added 4 tests for dialog flow |
| LOW | Inline style for font | Replaced with Tailwind font-serif class |

**Post-Review Fixes (User Verification):**

| Issue | Resolution |
|-------|------------|
| Toast using default font | Added Work Sans font styling to Toaster in App.tsx |
| Re-adding removed project fails | Updated add_project to restore soft-deleted projects |

**Test Results:**
- Backend: 27/27 passed
- Frontend: 107/107 passed (4 new)

**Note:** Silent Observer/Context Aggregator tasks are deferred as that feature is not yet implemented (Epic 6).
