# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ronin is a Project HQ for Linux developers - a Tauri v2 desktop application that provides AI-powered context recovery for dormant projects. Tech stack: React 19 + TypeScript frontend, Rust backend, SQLite database.

## Common Commands

```bash
# Development
npm install                    # Install frontend dependencies
npm run tauri dev             # Start development server (port 1420)

# Building
npm run build                 # Build frontend only
npm run tauri build           # Build full Tauri app for release

# Testing
npm test                      # Run all Vitest tests
npm run test:watch            # Run tests in watch mode
vitest run src/stores/projectStore.test.ts  # Run single test file

# Type Checking
npm run lint                  # Run TypeScript type check (tsc --noEmit)
```

## Architecture

### Tauri v2 Structure

```
src/                          # React frontend
src-tauri/src/                # Rust backend
  lib.rs                      # App entry point, invoke handlers
  main.rs                     # Binary entry
  commands/                   # Tauri command handlers (exposed to frontend)
    projects.rs               # CRUD, scanning, health logic
    git.rs                    # Git operations (uses git2 crate + CLI)
    ai.rs                     # AI context generation via OpenRouter
    settings.rs               # Encrypted API key storage
    devlog.rs                 # DEVLOG.md file operations
    observer.rs               # Silent Observer (activity tracking)
    aggregator.rs             # Context aggregation from multiple sources
  observer/                   # Activity tracking system
    mod.rs                    # ObserverManager (daemon lifecycle)
    watcher.rs                # File modification tracking (notify crate)
    settings.rs               # Privacy controls
    backends/                 # X11 and Wayland implementations
  ai/                         # AI provider abstractions
    providers/openrouter.rs   # Streaming API implementation
    providers/demo.rs         # Demo mode (free, rate-limited)
  db.rs                       # SQLite connection pool (r2d2)
  security.rs                 # AES-256 encryption for API keys
```

### Frontend Structure

```
src/
  pages/                      # Route-level components
  components/                 # React components (co-located tests)
    Dashboard/                # Project grid and cards
    devlog/                   # DEVLOG editor components
  stores/                     # Zustand state management
    projectStore.ts
    settingsStore.ts
    aiStore.ts
    devlogStore.ts
  hooks/                      # Custom React hooks (co-located tests)
    useGitStatus.ts
    useAiContext.ts
    useObserverSettings.ts
  lib/
    logic/projectHealth.ts    # Health calculation logic
    ai/registry.ts            # AI model registry
  types/                      # TypeScript type definitions
```

### Key Design Patterns

**Tauri Commands**: All backend functions exposed to frontend are in `commands/` modules and registered in `lib.rs` via `generate_handler![]`. Commands use `#[tauri::command]` attribute.

**State Management**:
- Frontend: Zustand stores (not React Context)
- Backend: Tauri `.manage()` state - `Arc<tokio::sync::Mutex<T>>` pattern for shared state

**Database**: SQLite with r2d2 connection pool. Migrations defined in `db.rs`. All DB operations use `spawn_blocking` since rusqlite types are not `Send`.

**AI Streaming**: OpenRouter API uses SSE streaming. Frontend receives chunks via `fetchEventSource` pattern. Context payload limited to <10KB.

## Critical Implementation Details

### Path Aliases
- Frontend: `@/` maps to `./src` (configured in vite.config.ts and vitest.config.ts)
- Imports should follow order: 1) React/external, 2) Internal components, 3) Utils/types

### Typography Requirements (MUST USE)
- **Libre Baskerville** (serif): Logo, headings, project names, CTAs
- **Work Sans** (sans): Body text, UI elements
- **JetBrains Mono** (mono): Code, paths, git info, AI context

### Color Tokens
```css
--ronin-primary: #CC785C;      /* Antique Brass */
--ronin-secondary: #828179;    /* Friar Gray */
--ronin-background: #F0EFEA;   /* Cararra */
--ronin-text: #141413;         /* Cod Gray */
```

### Observer (Silent Observer) Architecture
- Separate binary: `ronin-observer` (src-tauri/src/bin/observer.rs)
- Auto-started as daemon if enabled in settings
- X11: Uses x11rb crate for window title tracking via _NET_ACTIVE_WINDOW
- Wayland: Uses zbus to connect to GNOME Shell's WindowFocusWatcher (no direct Wayland protocol support)
- Privacy: Raw data never leaves device; only summarized context sent to AI

### Git Operations
- MVP uses git2 crate + shell commands hybrid
- Commit and Push are SEPARATE user actions (never auto-push)
- Warns if remote is ahead before push

### Security
- API keys encrypted with AES-256-GCM
- Encryption key derived from machine-uid + static pepper
- Stored in SQLite, never in plain text

## Testing

- **Framework**: Vitest with jsdom, React Testing Library
- **Pattern**: Co-located tests (Component.test.tsx beside Component.tsx)
- **Requirements**: Keyboard accessibility, `prefers-reduced-motion` support
- **Mocking**: Tauri API calls must be mocked via `vi.mock('@tauri-apps/api')`

## Environment Requirements

- **Node**: 20+
- **Rust**: 1.75+
- **OS**: Linux (Ubuntu 22.04+), X11 or Wayland (GNOME)
- **System deps**: libwebkit2gtk-4.1-dev, libxdo-dev, libayatana-appindicator3-dev

## Development Notes

- The `autobins = false` in Cargo.toml prevents observer binaries from being auto-discovered
- Window decorations are disabled (custom title bar in React)
- Global hotkey (Ctrl+Alt+R) configured at system level, not in-app
- Demo mode available without API key (rate-limited via AWS Lambda proxy)
