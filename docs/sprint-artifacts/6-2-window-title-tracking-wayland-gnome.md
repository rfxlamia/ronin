# Story 6.2: Window Title Tracking (Wayland GNOME)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer on Wayland GNOME**,
I want **window title tracking to work via a Shell Extension**,
So that **I get the same Silent Observer features as X11 users and the AI can understand my work context**.

## Acceptance Criteria

1. **Environment Detection**:
   - System accurately detects "Wayland" AND "GNOME" session (checking `XDG_SESSION_TYPE` and `XDG_CURRENT_DESKTOP`).
   - If not Wayland+GNOME, this module remains inactive (or falls back to X11/Process tracking).

2. **Extension Presence Check**:
   - App checks for the presence of the Ronin GNOME Shell Extension via D-Bus (e.g., checking for `org.ronin.Observer` service or interface).
   - **If missing**: Shows a specific "Setup Silent Observer" card/guide in Settings or Dashboard with:
     - "GNOME Shell Extension Required" message.
     - Link to download/install (or instructions).
     - "Skip" button to disable observer for now.

3. **Window Tracking (Happy Path)**:
   - When Extension is installed, Ronin connects to the Session Bus.
   - Listens for window focus signals (e.g., `WindowFocused(title, class, app_id)`).
   - Logs events to `observer_events` SQLite table with correct timestamp and `event_type = 'window'`.
   - Debounces rapid switching (500ms) to prevent log spam (handled by shared `debouncer` module or internally).

4. **Resilience**:
   - Reconnects automatically if the Shell/Extension restarts (D-Bus name owner changed).
   - Handles errors gracefully (logs warning, doesn't crash app).

## Tasks / Subtasks

- [ ] **Dependency Setup**
  - [ ] Add `zbus` (v4+) to `src-tauri/Cargo.toml` with `tokio` support.
  - [ ] Ensure `serde` is available for D-Bus message deserialization.

- [ ] **Environment Detection Module**
  - [ ] Implement `is_wayland_gnome()` helper using env vars (`XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP`).

- [ ] **D-Bus Client Implementation**
  - [ ] Create `src-tauri/src/observer/wayland.rs`.
  - [ ] Define the expected D-Bus Interface (e.g., `org.ronin.Observer`).
  - [ ] Implement connection to Session Bus using `zbus::Connection`.
  - [ ] Implement signal handler for `WindowFocused`.
  - [ ] Implement "Heartbeat" or "Ping" check to verify Extension is active.

- [ ] **Extension Installation Guide UI**
  - [ ] Update `Settings` or `Onboarding` to show "Extension Missing" state.
  - [ ] *Note: The actual Shell Extension code is external/separate, but we need the App side to detect its absence.*

- [ ] **Integration**
  - [ ] Integrate into `src-tauri/src/observer/mod.rs` to select `x11` or `wayland` backend at runtime.
  - [ ] Wire up signal data to `Observer::log_event()`.

## Dev Notes

### Architecture & Dependencies

- **Library**: Use `zbus` (pure Rust) over `dbus-rs` (C-bindings) for better safety and async support.
- **Bus**: Session Bus (not System Bus).
- **Interface Definition**:
  - Service: `org.ronin.Observer`
  - Path: `/org/ronin/Observer`
  - Interface: `org.ronin.Observer.WindowTracker`
  - Signal: `WindowFocused(title: String, app_id: String)`

### Project Structure

- **Backend**: `src-tauri/src/observer/wayland.rs`
- **Frontend**: Reuse existing Silent Observer settings UI, add "Extension Status" indicator.

### Fallback Strategy

- If `zbus` fails to connect or Extension is missing:
  - Log error to internal logs.
  - Set "Observer Status" to "Partially Active" (File tracking works, Window tracking inactive).
  - Do NOT fallback to X11 tracking if on Wayland (it won't work or will be insecure).

### References

- [Docs: Architecture - Silent Observer](docs/architecture.md#category-3-silent-observer-implementation)
- [Docs: Epics - Story 6.2](docs/epics.md#story-62-window-title-tracking-wayland-gnome)
- [zbus Documentation](https://docs.rs/zbus/latest/zbus/)

## Dev Agent Record

### Agent Model Used

Gemini-2.0-Flash-Thinking

### Completion Notes List

- Added `zbus` dependency requirement.
- Defined D-Bus interface expectations.
- Clarified UI requirements for missing extension.

### File List

- `src-tauri/Cargo.toml`
- `src-tauri/src/observer/mod.rs`
- `src-tauri/src/observer/wayland.rs` (New)
