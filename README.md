# 浪人 Ronin

> A Personal Project Development Manager for Linux developers who struggle with project abandonment due to context loss.

[![CI](https://github.com/rfxlamia/ronin/actions/workflows/ci.yml/badge.svg)](https://github.com/rfxlamia/ronin/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![License](https://img.shields.io/badge/license-MPL--2.0-blue)

---

## Overview

Ronin is your **Project HQ** - a desktop application that solves the core problem of context loss when managing multiple software projects. Built with Rust/Tauri for performance, it combines Notion's organizational clarity with GitHub Desktop's repository management, enhanced by Cloud AI intelligence.

**The Problem:** Developers with active creative minds spawn multiple projects but struggle to maintain them. The friction isn't writing code - it's *remembering context*. When you return to a dormant project after weeks, you spend hours re-reading your own work just to remember your reasoning and plan.

**The Solution:** Ronin provides **instant context recovery** in under 10 seconds. Open a dormant project and immediately know where you left off - the AI Consultant analyzes your commits, DEVLOG notes, and behavioral patterns to reconstruct not just *what* you were doing, but *why* and *what's next*.

### What Makes This Special

- **Instant Context Recovery:** Open any project after weeks of inactivity and feel confidence instead of dread - know exactly where you left off in 10 seconds
- **Behavioral Context Inference:** AI recovers context from your *behavior* (file edits, searches, window activity), not just your notes
- **Lifecycle Focus:** Manages the meta-game of development (Planning, Reviewing, Reviving) rather than just launching projects
- **Second Brain for Code:** Structured project notes (DEVLOG.md) live with the code and feed the AI context
- **Instant AI, No Hardware Tax:** Powerful analysis without draining your 8GB laptop - works fast on any machine
- **Local-First Privacy:** All behavioral data stored locally only, with full user control

---

## Features

### Current (MVP v0.1-v0.3)

- **Dashboard with Health Indicators:** View all tracked projects with visual health status (Active/Dormant/Stuck/Needs Attention)
- **Git Integration:** One-click commit/push with safety guardrails, status view, branch tracking
- **AI Context Recovery:** "Where was I?" - AI analyzes last 20 commits + DEVLOG + behavioral data in <10 seconds
- **Silent Observer:** Background tracking of window activity and file modifications (X11 + Wayland GNOME support)
- **Generic Folder Mode:** Track non-Git folders for non-developers (file count + last modified tracking)
- **DEVLOG Editor:** In-app markdown editor for project notes that sync with repository files
- **System Integration:** System tray, global hotkey (Ctrl+Alt+R), desktop notifications

### Planned (3-12 Months)

- **Cross-Platform:** Windows (.exe), macOS (.dmg) support
- **Wayland KDE Support:** Full window title tracking
- **Team Mode:** Shared projects, context handoff
- **Advanced Silent Observer:** Browser extension, accessibility API integration
- **Integration Layer:** Jira/Linear/Notion sync
- **Local SLM Option:** Run AI locally without cloud dependency

---

## Philosophy: The Five Pillars of Ronin (義勇仁礼智)

Ronin is built on five core principles from the samurai code:

- **義 (Gi) - Righteous Code:** Local-first architecture, no surveillance, opt-in behavioral tracking
- **勇 (Yu) - Courageous Autonomy:** AI suggests never commands, proactive stuck pattern detection
- **仁 (Jin) - Compassionate Craft:** Empathetic error messages, no productivity shaming
- **礼 (Rei) - Ritual & Discipline:** Dashboard as morning ritual, structured workflows
- **智 (Chi) - Strategic Resourcefulness:** <200MB memory footprint, works on 8GB laptops

See [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md) for full philosophy documentation.

---

## Installation

### For Users (Recommended)

Download the latest release from [GitHub Releases](https://github.com/rfxlamia/ronin/releases).

#### Option 1: Debian/Ubuntu (.deb package)

```bash
# Download the .deb file from releases
wget https://github.com/rfxlamia/ronin/releases/download/v0.1.0-alpha/ronin_0.1.0-alpha_amd64.deb

# Install
sudo dpkg -i ronin_0.1.0-alpha_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch
ronin
```

**Supported Distributions:**
- Ubuntu 22.04+ ✅
- Debian 11+ ✅
- Linux Mint 21+ ✅
- Pop!_OS 22.04+ ✅

#### Option 2: AppImage (Distro-Agnostic)

```bash
# Download the AppImage from releases
wget https://github.com/rfxlamia/ronin/releases/download/v0.1.0-alpha/ronin_0.1.0-alpha_amd64.AppImage

# Make executable
chmod +x ronin_0.1.0-alpha_amd64.AppImage

# Run
./ronin_0.1.0-alpha_amd64.AppImage
```

**Works on:**
- Any Linux distribution (Ubuntu, Fedora, Arch, etc.)
- No installation or admin privileges required
- Portable and self-contained

### For Developers

#### Prerequisites

- **Linux** (X11 or Wayland with GNOME Shell)
- **Node.js** 20+ and npm
- **Rust** 1.75+ (stable)
- **System dependencies:**

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Development Setup

```bash
# Clone repository
git clone https://github.com/rfxlamia/ronin.git
cd ronin

# Install frontend dependencies
npm install

# Install Tauri CLI
npm install -D @tauri-apps/cli

# Run development server
npm run tauri dev
```

#### Building for Production

```bash
# Build optimized binary
npm run build

# Create .deb package
npm run tauri build -- --bundles deb

# Create AppImage (distro-agnostic)
npm run tauri build -- --bundles appimage
```

---

## Usage

### Quick Start

1. **Launch Ronin:**
   ```bash
   npm run tauri dev
   # Or use global hotkey: Ctrl+Alt+R
   ```

2. **Add Your First Project:**
   - Click "Add Project" on dashboard
   - Browse to your project folder (Git repo or generic folder)
   - Ronin auto-detects project type and scans for health indicators

3. **Recover Context:**
   - Click on any project card
   - AI analyzes commits, DEVLOG notes, and behavioral data
   - Get actionable context in <10 seconds

4. **Enable Silent Observer (Optional):**
   - Settings → Silent Observer → Enable
   - Grants background window tracking for behavioral inference
   - All data stays local, easily disabled

### Example Workflows

**Morning Ritual:**
```
1. Open Ronin (Ctrl+Alt+R)
2. Dashboard shows: 3 Active, 5 Dormant, 2 Needs Attention
3. Click dormant project "chippy"
4. AI says: "Last stuck on auth.rs:142 (lifetime issue).
   Tried 2 approaches. Suggestion: try Arc<Mutex<>>"
5. Resume work with full context
```

**One-Click Commit:**
```
1. Card shows "3 uncommitted files"
2. Click "Commit Changes"
3. Type message: "Fix token refresh bug"
4. Press Enter → Success toast
5. Click "Push" → Safely pushed to remote
```

---

## Configuration

### Required Environment

Ronin stores configuration in:
- **Settings:** `~/.config/ronin/settings.json`
- **API Keys (encrypted):** `~/.config/ronin/api_keys.enc`
- **Database:** `~/.local/share/ronin/ronin.db`
- **Logs:** `~/.local/share/ronin/logs/`

### API Key Setup

1. Get OpenRouter API key: https://openrouter.ai/
2. Settings → API Configuration → Enter key
3. Keys are encrypted using AES-256-GCM with system keyring integration

### Privacy Controls

**Silent Observer Exclusions:**
```json
{
  "excluded_apps": ["brave-browser --incognito", "signal-desktop"],
  "excluded_patterns": [".*private.*", ".*bank.*"]
}
```

**Clear All Data:**
Settings → Privacy → Delete All Tracked Data

---

## Testing

```bash
# Frontend tests (Vitest + React Testing Library)
npm test
npm run test:watch

# Backend tests (Rust cargo test)
cd src-tauri
cargo test

# Run all tests with coverage
npm run test:coverage
```

**Test Files:**
- Frontend: `src/components/__tests__/*.test.tsx`
- Backend: Inline `#[cfg(test)] mod tests` in `.rs` files

---

## Development

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19.1, TypeScript | UI framework with strict typing |
| | Zustand 5.0 | Lightweight state management |
| | Tailwind CSS 4.1 | Utility-first styling |
| | shadcn/ui | Copy-paste component library |
| | @tanstack/react-virtual | Virtual scrolling for 100+ projects |
| **Backend** | Rust 1.75+ (stable) | Performance and safety |
| | Tauri 2.0 | Desktop framework (WebView) |
| | SQLite 3.45+ (WAL mode) | Local-first database |
| | Tokio 1.35+ | Async runtime |
| | reqwest 0.11+ | HTTP client (OpenRouter) |
| **System** | x11rb 0.13+ | X11 window tracking |
| | zbus 4.0+ | D-Bus (Wayland GNOME) |
| | notify 6.1+ | File system watching |

### Project Structure

```
ronin/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── stores/             # Zustand stores
│   ├── lib/                # Utilities
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri IPC commands
│   │   ├── aggregator/     # Context aggregation logic
│   │   ├── observer/       # Silent Observer daemon
│   │   ├── db/             # Database layer
│   │   └── ai/             # OpenRouter integration
│   └── Cargo.toml
├── public/                 # Static assets
└── docs/                   # Documentation
```

See [docs/architecture.md](docs/architecture.md) for complete architectural decisions.

### Architecture Patterns

**State Management:**
- Frontend: Zustand stores with selector pattern
- Backend: Tauri managed state (Arc<Mutex<T>>)
- IPC: `invoke()` for commands, `emit/listen` for events

**Naming Conventions:**
- Database: `snake_case` tables/columns
- TypeScript: `PascalCase` components, `camelCase` functions
- Rust: `snake_case` functions, `PascalCase` structs
- Tauri Commands: `snake_case` verb_noun (`get_projects`)
- Events: `kebab-case` noun-verb (`ai-chunk`, `file-changed`)

**Error Handling:**
- Rust: Typed `RoninError` enum with context
- Frontend: Component-level error states with retry
- UI: Philosophy-aligned messages ("AI resting" not "Rate limit exceeded")

### Running Linters

```bash
# TypeScript + React
npm run lint

# Rust
cd src-tauri
cargo clippy -- -D warnings
cargo fmt --check
```

---

## Performance

**Target Metrics (from NFRs):**
- Context recovery: <10s total (first content <2s)
- Dashboard load: <2s to interactive
- App startup: <3s warm, <6s cold
- GUI memory: <200MB baseline + <1MB per tracked project
- Silent Observer memory: <50MB RSS
- Thermal: No fan spin-up during idle

**Optimizations:**
- Virtual scrolling for 100+ projects
- SQLite WAL mode with integrity checks
- Event debouncing (500ms window)
- AI payload compression (<10KB)
- Lazy loading of project details

---

## Contributing

This is currently a personal project. Contributions are welcome once MVP stabilizes.

Planned process:
1. Check existing issues or create new one
2. Fork repository
3. Create feature branch (`git checkout -b feature/amazing-feature`)
4. Follow architecture patterns in `docs/architecture.md`
5. Write tests (frontend: Vitest, backend: cargo test)
6. Run linters: `npm run lint && cd src-tauri && cargo clippy`
7. Commit with descriptive message
8. Push and open pull request

---

## Roadmap

### MVP Milestones

**v0.1 - Foundation (Current):**
- ✅ Tauri project initialization
- ✅ Dashboard with project cards
- ✅ Git status integration (read-only)
- ✅ SQLite database schema
- ✅ Basic system integration (tray, hotkey)

**v0.2 - Intelligence Core (In Progress):**
- 🔄 Silent Observer daemon (X11 + Wayland GNOME)
- 🔄 Context Aggregator implementation
- 🔄 AI integration with OpenRouter
- 🔄 One-click commit/push with guardrails
- 🔄 DEVLOG markdown editor

**v0.3 - Polish:**
- ⏳ Stuck pattern detection
- ⏳ Temporal correlation (search → edit)
- ⏳ Privacy controls UI
- ⏳ Performance profiling and optimization
- ⏳ Philosophy-aligned error states

### Future Vision

**3 Months:**
- Cross-platform support (Windows, macOS)
- Wayland KDE window tracking
- Browser extension for Silent Observer
- Multi-workspace support
- Task management features

**12 Months:**
- Team mode with context handoff
- Jira/Linear/Notion integrations
- Local SLM option (no cloud dependency)
- Advanced behavioral inference
- Screen OCR (opt-in)

---

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

See [LICENSE](LICENSE) for full text.

**Summary:**
- ✅ Free to use, modify, and distribute
- ✅ Can be used in proprietary software
- ✅ File-level copyleft (modifications to MPL files must remain MPL)
- ✅ Patent grant included

---

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop application framework
- [React](https://react.dev/) - UI framework
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [OpenRouter](https://openrouter.ai/) - AI API aggregation
- Philosophy inspired by Bushido (武士道) and Japanese craftsmanship principles

---

## Contact

Created by V - [@v](https://github.com/rfxlamia)

For questions or feedback:
- Open an issue: [GitHub Issues](https://github.com/rfxlamia/ronin/issues)
- Check documentation: [docs/](docs/)
- Read the philosophy: [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md)

---

*"A ronin without a master must become their own sensei. This tool is your dojo."* - Ronin Philosophy
