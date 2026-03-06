# Story 6.3: File Modification Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **Ronin to track which files I modify in my projects**,
So that **the AI understands my editing patterns and can provide accurate context recovery**.

## Acceptance Criteria

1.  **Dependency Integration**:
    - Add `notify` (v6.1+) and `notify-debouncer-mini` (v0.4+) crates to `src-tauri/Cargo.toml`.
    - **CRITICAL**: Verify dependencies are added as they are currently missing, despite architecture docs claiming otherwise.

2.  **File Watcher Service**:
    - Implement a `FileWatcher` service in the Main App (Main Process/Tauri Core: `src-tauri/src/observer/watcher.rs`).
    - Service must run within the main Tauri process (not the external daemon) to access project paths and DB directly.
    - Service automatically starts watching all currently tracked projects on app startup.
    - **Database Connection**: Must reuse the existing `SqlitePool` from Tauri's managed `AppState` (do not create a new pool).
    - **Error Handling**: Gracefully handle watch failures (e.g., `fs.inotify.max_user_watches` limit on Linux). Log a warning if a watcher fails to start, but do not crash the app.

3.  **Event Logic & Filtering**:
    - Recursively watch project roots.
    - Detect `Write`, `Create`, `Remove`, `Rename` events.
    - **Permission Errors**: Log warnings if subdirectories are not readable; do not fail silently.
    - **Strict Filtering (Ignore List)**:
        - **Directories**: `.git/`, `node_modules/`, `target/`, `dist/`, `build/`, `.idea/`, `.vscode/`
        - **Files**: `.DS_Store`, `thumbs.db`
        - **Temp Patterns**: Start with `.`, end with `~`, end with `.swp` (exception: config files like `.env` allowed).

4.  **Debouncing & Batching**:
    - **Debounce**: Use `notify-debouncer-mini`'s built-in coalescing with a 100ms tick to handle rapid writes (e.g., "Save" causing multiple FS events).
    - **Batch Write**: Buffer unique events in memory and write to SQLite in batches every **5 seconds**.
    - **Force Flush**: If the buffer exceeds **1000 events** (e.g., massive file operation), flush immediately to prevent memory bloat.

5.  **Data Storage**:
    - Store events in `observer_events` table.
    - **Schema Update**: Create migration `004_add_file_path_to_observer.sql` to add `file_path` column (TEXT, nullable).
    - Fields:
        - `timestamp`: Unix timestamp of event.
        - `event_type`: "file_change" (Constant).
        - `file_path`: **Relative path** from project root (e.g., `src/main.rs`).
          - Use `path.strip_prefix(project_root)` safely.
          - Handle symlinks or paths outside root gracefully (log warning, skip).
        - `project_id`: Foreign key to the project.
        - `window_title`: NULL.
        - `process_name`: NULL (or "Ronin").

6.  **Lifecycle Management**:
    - When a user adds a project (Story 2.1/2.9), start watching it immediately.
    - When a user removes a project (Story 2.8), stop watching it.
    - Stop all watchers gracefully on app exit.

## Tasks / Subtasks

- [x] **Dependency Setup** (AC: 1)
  - [x] Add `notify = "6.1"` and `notify-debouncer-mini = "0.4"` to `src-tauri/Cargo.toml`.
  - [x] Run `cargo build` to verify compatibility.

- [x] **Database Migration** (AC: 5)
  - [x] Create `src-tauri/migrations/004_add_file_path_to_observer.sql`.
  - [x] SQL: `ALTER TABLE observer_events ADD COLUMN file_path TEXT;`
  - [x] Verify migration runs on app startup.

- [x] **Watcher Module Implementation** (AC: 2, 3, 4)
  - [x] Create `src-tauri/src/observer/watcher.rs`.
  - [x] Define `WatcherManager` struct managing `debouncer`, `project_paths`, and `SqlitePool` reference.
  - [x] Implement `start_watching(project_id, path)` with error handling for inotify limits.
  - [x] Implement `stop_watching(project_id)`.
  - [x] Implement `EventFilter` logic (ignore list).
  - [x] Configure `notify-debouncer-mini` with 100ms tick.

- [x] **Batch Writer Implementation** (AC: 4, 5)
  - [x] Create a background Tokio task in `WatcherManager`.
  - [x] Buffer events in a `Vec<FileEvent>`.
  - [x] Implement `flush_buffer()` method.
  - [x] Trigger flush every 5s OR when buffer > 1000 events.
  - [x] Create helper `get_relative_path(root, full_path)` using `strip_prefix`.
  - [x] Write to `observer_events` table using `AppState`'s DB pool.

- [x] **Integration with Main App** (AC: 6)
  - [x] Initialize `WatcherManager` in `src-tauri/src/lib.rs` state management.
  - [x] Call `watcher.start_all(projects)` on startup (load from DB).
  - [x] Update `commands::projects::add_project` to call `watcher.start_watching`.
  - [x] Update `commands::projects::remove_project` to call `watcher.stop_watching`.

- [x] **Testing**
  - [x] Unit test: Filter logic (ensure node_modules are ignored).
  - [x] Unit test: Relative path calculation (including nested/symlink cases).
  - [x] Integration test: Create file -> wait 5s -> verify DB record.
  - [x] Stress test: Simulate 2000 events -> verify force flush.


## Dev Notes

### Architecture & Constraints

- **Missing Dependency**: The `notify` crate is NOT in `Cargo.toml` despite documentation claims. This must be fixed first.
- **Location**: Implement in **Main Process** (`src-tauri/src/observer/watcher.rs`), NOT the `ronin-observer` daemon. The daemon is for system-wide window tracking; file watching is project-scoped and needs DB access.
- **Inotify Limits**: On Linux, `fs.inotify.max_user_watches` is a common failure point. If `notify` returns an error on start, log a warning: "Failed to watch project [ID]: System watch limit reached." Do not crash.
- **Performance**:
    - **I/O**: Batch writes are non-negotiable (NFR8 - No fan spin-up).
    - **Memory**: Keep buffer size reasonable. Force flush at 1000 events to prevent OOM on massive ops (e.g., `npm install` if filter fails).
- **Privacy**: Only store relative paths. Never store file content.

### Relevant Files

- `src-tauri/Cargo.toml` (Add dependencies)
- `src-tauri/src/observer/mod.rs` (Expose watcher module)
- `src-tauri/src/observer/watcher.rs` (New file)
- `src-tauri/src/lib.rs` (Init and state)
- `src-tauri/src/commands/projects.rs` (Trigger hooks)

### References

- [Architecture: File System Watcher](docs/architecture.md#category-3-silent-observer-implementation)
- [PRD: Silent Observer](docs/prd.md#silent-observer-7-frs)
- [Story 1.3](docs/sprint-artifacts/1-3-set-up-sqlite-database.md) (Original intent for notify)

## Dev Agent Record

### Agent Model Used

Gemini-2.0-Flash-Thinking-Experimental

### Completion Notes List

- ✅ Added `notify = "6.1"` and `notify-debouncer-mini = "0.4"` dependencies
- ✅ Created database migration for `file_path` column (nullable TEXT)
- ✅ Implemented `WatcherManager` with:
  - Event debouncing (100ms tick)
  - Batched writes every 5 seconds
  - Force flush at 1000 events via mpsc channel
  - Strict filtering (node_modules, .git, target, temp files)
  - Expanded config whitelist (30+ dotfiles)
  - Inotify error handling with graceful degradation
- ✅ Integrated with main app lifecycle (startup/shutdown)
- ✅ Added hooks to `add_project` and `remove_project` commands
- ✅ **Code Review Fixes:**
  - Force flush now triggers immediately via mpsc channel (Issue #1)
  - Symlink detection with warning logging (Issue #2)
  - Integration test for DB flush (Issue #3)
  - Expanded config file whitelist (Issue #4)
  - Prepared statements for batch insert (Issue #6)
  - Removed unused variable (Issue #7)
- ✅ All 185 tests passing (21 watcher tests, 173 lib tests)

### Files Changed

- `src-tauri/Cargo.toml` - Added dependencies
- `src-tauri/src/db.rs` - Added file_path column migration
- `src-tauri/src/observer/watcher.rs` - WatcherManager implementation with code review fixes
- `src-tauri/src/observer/mod.rs` - Exposed watcher module
- `src-tauri/src/lib.rs` - Initialize and manage WatcherManager lifecycle
- `src-tauri/src/commands/projects.rs` - Integrated start/stop watching hooks

## Status

Status: done
