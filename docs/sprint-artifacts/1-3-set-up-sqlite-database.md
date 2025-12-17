# Story 1.3: Set Up SQLite Database

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **an initialized SQLite database with WAL mode and basic schema**,
so that **the application can persist project data and settings reliably and efficiently**.

## Acceptance Criteria

1.  **Dependencies Installed:**
    - `rusqlite` (v0.31+ with `bundled` feature)
    - `rusqlite_migration`
    - `r2d2` and `r2d2_sqlite`
2.  **Database Initialization:**
    - **CRITICAL:** Ensure parent directory exists using `std::fs::create_dir_all` before opening connection
    - Database file created at `[app_data_dir]/ronin.db` (e.g., `~/.local/share/ronin/ronin.db` on Linux)
    - WAL Mode enabled (`PRAGMA journal_mode=WAL;`)
    - Foreign keys enforced (`PRAGMA foreign_keys=ON;`)
    - Connection pool managed in Tauri state with max size **10** (resource efficiency)
3.  **Schema Management:**
    - Migration system implemented using `rusqlite_migration`
    - **M1 Initial Schema** applied:
        - `projects` table (id, path, name, type, created_at, updated_at)
        - `settings` table (key, value)
    - **Auto-Update Trigger:** `projects` table must have an `AFTER UPDATE` trigger to automatically set `updated_at = CURRENT_TIMESTAMP`
4.  **Application Integration:**
    - Database accessible via Tauri commands (thread-safe)
    - Graceful error handling (no crashes if DB file locked/corrupted)
    - Startup integrity check (connection test)

## Tasks / Subtasks

- [x] Add Rust dependencies (AC: 1)
  - [x] Run: `cargo add rusqlite --features bundled`
  - [x] Run: `cargo add rusqlite_migration r2d2 r2d2_sqlite`
- [x] Implement Database Module (AC: 2, 3)
  - [x] Create `src-tauri/src/db.rs`
  - [x] Implement path resolution and **directory creation**
  - [x] Define migration `M1` with tables and **update trigger**
  - [x] Configure `r2d2` pool with `max_size(10)`
- [x] Integrate with Tauri App (AC: 4)
  - [x] Update `src-tauri/src/lib.rs` to call `init_db`
  - [x] Manage `r2d2::Pool` in Tauri state using `.manage()`
- [x] Verification
  - [x] Verify `updated_at` changes when a row is updated
  - [x] Verify persistence across restarts

## Dev Notes

### Technical Specifications & Guardrails

-   **Filesystem Safety:** failing to create the directory (`~/.local/share/ronin`) is a common crash cause.
-   **Resource Limits:** `pool.max_size(10)` prevents consuming too many file descriptors/memory, aligning with the <50MB overhead goal.
-   **Trigger Syntax:**
    ```sql
    CREATE TRIGGER update_projects_modtime
    AFTER UPDATE ON projects
    FOR EACH ROW
    BEGIN
      UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
    ```
-   **Schema Details:**
    -   `projects`: `id` (INTEGER PRIMARY KEY), `path` (TEXT UNIQUE), `name` (TEXT), `type` (TEXT), `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP), `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
    -   `settings`: `key` (TEXT PRIMARY KEY), `value` (TEXT)
-   **Structure:** `src-tauri/src/db.rs` handling init, schema, and exports.

### References

-   [Architecture: Data Persistence](file:///home/v/project/ronin/docs/architecture.md#data-persistence-layer)
-   [Rusqlite Documentation](https://docs.rs/rusqlite/latest/rusqlite/)

## Dev Agent Record

### Agent Model Used
Google Gemini 2.0 Flash (Validated & Improved)

### Completion Notes List
- **Improved:** Added critical directory creation step to prevent startup crashes.
- **Improved:** Added SQLite trigger for reliable timestamp tracking.
- **Improved:** Enforced connection pool limits for resource efficiency.
- **Optimized:** Consolidated technical documentation for better parsing.
- **Implemented:** Added rusqlite v0.37 with bundled feature
- **Implemented:** Created database module with migration system using rusqlite_migration
- **Implemented:** Configured r2d2 connection pool with max_size(10) for resource efficiency
- **Implemented:** Enabled WAL mode and foreign keys via pragmas  
- **Implemented:** Created `projects` and `settings` tables with auto-update trigger
- **Implemented:** Integrated database pool into Tauri state management
- **Tested:** 8 comprehensive unit tests covering:
  - Database initialization
  - WAL mode enabled
  - Foreign keys enabled
  - Schema tables created
  - Auto-update trigger functionality
  - Connection pool max size
  - Multiple connections
  - Directory creation safety
- **Verified:** Application builds successfully in release mode
- **Verified:** All tests pass (8/8) with 100% success rate

### File List
- [NEW] `src-tauri/src/db.rs`
- [MODIFY] `src-tauri/Cargo.toml`
- [MODIFY] `src-tauri/src/lib.rs`
