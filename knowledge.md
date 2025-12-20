# Project Knowledge

Ronin (浪人) is a Personal Project Development Manager for Linux developers who struggle with project abandonment due to context loss. Built with Tauri v2 (Rust + React), it provides instant AI-powered context recovery in under 10 seconds.

## Quickstart

```bash
# Setup - Install system dependencies (Ubuntu/Debian)
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Install frontend dependencies
npm install

# Dev - Run development server with hot reload
npm run tauri dev

# Test - Run frontend tests (Vitest)
npm test
npm run test:watch  # Watch mode

# Test - Run backend tests (Rust)
cd src-tauri && cargo test

# Build - Production build
npm run build
npm run tauri build -- --bundles deb  # .deb package
```

## Architecture

- **Frontend (`src/`)**: React 19 + TypeScript + Vite
  - `components/` - UI components (shadcn/ui based)
  - `stores/` - Zustand state management
  - `hooks/` - Custom React hooks
  - `lib/` - Utilities (cn function, etc.)
  - `types/` - TypeScript type definitions
  - `pages/` - Page components

- **Backend (`src-tauri/src/`)**: Rust + Tauri v2
  - `lib.rs` - Tauri commands and app setup
  - `db.rs` - SQLite database layer (WAL mode)
  - `security.rs` - API key encryption (AES-256-GCM)

- **Data Flow**: React → Tauri IPC (`invoke()`) → Rust commands → SQLite
- **Events**: Rust → React via `emit/listen` (for streaming AI, file changes)

## Conventions

### Naming
- **Database**: `snake_case` tables (plural) and columns
- **TypeScript**: `PascalCase` components, `camelCase` functions/variables
- **Rust**: `snake_case` functions, `PascalCase` structs
- **Tauri Commands**: `snake_case` verb_noun (e.g., `get_projects`, `commit_changes`)
- **Events**: `kebab-case` noun-verb (e.g., `ai-chunk`, `file-changed`)

### Patterns to Follow
- Use Zustand selectors, not full store access: `useStore((s) => s.field)`
- Component-level error/loading states, not global
- Co-locate tests: `components/__tests__/*.test.tsx`
- Rust tests: `#[cfg(test)] mod tests` at bottom of file
- Always clean up Tauri event listeners in useEffect
- Use `@/` path alias for imports

### Typography (Brand)
- **Work Sans**: UI text, body, labels
- **JetBrains Mono**: Code, paths, git info, AI output
- **Libre Baskerville**: Project names, CTAs, philosophy text

### Design System
- Primary: Antique Brass `#CC785C`
- Secondary: Friar Gray `#828179`
- Background: Cararra `#F0EFEA` (light), Cod Gray `#141413` (dark)
- Components: shadcn/ui with Tailwind CSS 4

## Things to Avoid
- Don't cast as `any` type
- Don't store git credentials (use system git)
- Don't send raw behavioral data to AI (summarize to <10KB)
- Don't auto-resolve git conflicts (show error, suggest terminal)
- Don't force push (never)
- Don't add cloud telemetry without opt-in consent
- Don't use global loading/error states

## Key Dependencies
- **Frontend**: React 19, Zustand 5, Tailwind 4, @tanstack/react-virtual, lucide-react
- **Backend**: Tauri 2, rusqlite, tokio, git2, reqwest, aes-gcm

## Philosophy (義勇仁礼智)
- **義 (Gi)**: Local-first, no surveillance, opt-in tracking
- **勇 (Yu)**: AI suggests, never commands
- **仁 (Jin)**: Empathetic errors ("AI resting" not "Rate limit exceeded")
- **礼 (Rei)**: Explicit actions, user controls each step
- **智 (Chi)**: <200MB memory, works on 8GB laptops

## Gotchas
- Tauri dev server runs on port 1420 (fixed)
- SQLite uses WAL mode for crash resistance
- OpenRouter API requires attribution display
- Wayland GNOME needs D-Bus for window tracking (limited on other Wayland compositors)
- Minimum window size: 800x600px
- Respect `prefers-reduced-motion` for animations
