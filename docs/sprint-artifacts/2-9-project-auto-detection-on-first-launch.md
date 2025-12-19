# Story 2.9: Project Auto-Detection on First Launch

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **first-time user**,
I want **Ronin to automatically discover my existing Git projects**,
so that **I don't have to manually add each project one by one**.

## Acceptance Criteria

1. **Given** the user launches Ronin for the first time (or is in the empty state)
2. **When** the onboarding wizard runs (or user initiates scan)
3. **Then** the system scans common project locations:
    - Linux: `~/Projects`, `~/code`, `~/dev`, `~/repos`, `~/.local/share`
    - (Scan should not cross file system boundaries or scan hidden folders unless specified)
4. **And** identifies folders containing `.git/` directories
5. **And** displays a list of discovered projects with checkboxes (checked by default)
6. **And** the user can select which projects to track
7. **And** scanning completes in < 5 seconds (performance constraint)
8. **And** a progress indicator shows during the scan
9. **And** the user can skip the scan and add projects manually later

## Tasks / Subtasks

- [x] **Dependencies**
  - [x] Add `walkdir` crate to `src-tauri/Cargo.toml` (Dependency was NOT previously added)
- [x] **Backend Implementation**
  - [x] Update `src-tauri/src/commands/projects.rs`: Implement `scan_projects` command
  - [x] **CRITICAL:** Run `walkdir` logic inside `tauri::async_runtime::spawn_blocking` to avoid blocking Tokio thread
  - [x] Use `walkdir` crate to scan directories (depth limit: 3)
  - [x] Use `app.path().home_dir()` (Tauri v2 standard) or `dirs` crate to resolve home directory safely
  - [x] Implement logic to detect `.git` folders
  - [x] Return list of potential projects (path, name)
  - [x] Ensure proper error handling (permission denied, path not found)
- [x] **Frontend Implementation**
  - [x] Create `src/components/Dashboard/ProjectScanner.tsx` (or similar name)
  - [x] Implement scanning UI:
    - [x] "Scan for Projects" button in EmptyState (secondary action)
    - [x] Scanning progress state (Use `RoninLoader` only - NO SPINNERS per Philosophy)
    - [x] Result list with checkboxes
    - [x] "Import Selected" button
  - [x] Update `src/components/Dashboard/EmptyState.tsx` to include the scanner
- [x] **Integration**
  - [x] Connect frontend to `scan_projects` command
  - [x] Call `add_project` for selected projects (Ensure `add_project` handles "Resurrection" of soft-deleted projects as per Story 2.8)
  - [x] Handle permissions (if strictly needed, though user-level read usually fine)
- [x] **Testing**
  - [x] Unit test: `scan_projects` correctly finds git repos in mock structure
  - [x] Unit test: `scan_projects` respects depth limit
  - [x] Manual test: Verify scan speed and accuracy on actual file system
  - [x] Manual test: Verify re-adding a previously "Removed" project restores it correctly

## Dev Notes

### Architecture & Implementation Guardrails

- **Scanning Strategy:**
  - **Dependency:** Must add `walkdir` to `src-tauri/Cargo.toml`.
  - **Concurrency:** `walkdir` is synchronous/blocking. **MUST use `tauri::async_runtime::spawn_blocking`** to wrap the scanning logic. Do NOT run blocking code directly in an async Tauri command.
  - **Depth Limit:** Strictly limit to 3 levels deep to satisfy the < 5 seconds NFR.
  - **Paths:** Use `tauri::Manager` -> `app.path().home_dir()` (preferred v2 pattern) or `dirs` crate. Avoid deprecated v1 APIs.
  - **Default Paths:** Check `~/Projects`, `~/code`, `~/dev`, `~/repos`.

- **UI/UX:**
  - **Empty State:** Add a "Auto-scan for projects" button below the main "Add Project" button.
  - **Wizard:** Can be a simple Dialog (`shadcn/ui`) that opens, scans, shows results, and imports.
  - **Feedback:** While scanning, show "Scanning your system..." with `RoninLoader` (pulse/meditation). **NO SPINNERS.**

### Project Structure Notes

- **Backend:** `src-tauri/src/commands/projects.rs`
- **Frontend:** New component `src/components/Dashboard/ProjectScanner.tsx`

### References

- **Architecture:** `docs/architecture.md`
- **UX Spec:** `docs/ux-design-specification.md` (Onboarding & First-Time Experience)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Successfully implemented project auto-detection feature that scans common project locations for Git repositories
- Backend implementation includes `scan_projects` command using `walkdir` crate with proper async handling via `spawn_blocking`
- Frontend implementation includes `ProjectScanner` component with UI for scanning, selecting, and importing projects
- Feature respects depth limit of 3 for performance and includes proper error handling
- Integration with existing `add_project` command ensures soft-deleted projects are properly resurrected
- All acceptance criteria satisfied including performance constraints and UI requirements

### File List

- `src-tauri/Cargo.toml` - Added `walkdir` and `dirs` dependencies
- `src-tauri/src/commands/projects.rs` - Implemented `scan_projects` command with tests
- `src/components/Dashboard/ProjectScanner.tsx` - Created new component for project scanning UI
- `src/components/Dashboard/EmptyState.tsx` - Updated to include scanner functionality
- `src/components/ui/loader.tsx` - Created RoninLoader component
- `src/types/project.ts` - Defined Project interface
- `src/components/Dashboard/ProjectScanner.test.tsx` - Added frontend tests
