# Changelog

All notable changes to Ronin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha] - 2025-12-24

### Overview

First public alpha release of Ronin - A Personal Project Development Manager for Linux developers. This release focuses on foundational Git integration, project dashboard, and AI-powered context recovery.

### Added

#### Epic 1: Foundation & App Shell
- Tauri v2 desktop application framework
- React 19 + TypeScript frontend with shadcn/ui components
- SQLite database with WAL mode for local-first storage
- Custom Libre Baskerville/Work Sans/JetBrains Mono typography
- Antique Brass (#CC785C) color scheme with light/dark mode support

#### Epic 2: Dashboard & Project Management
- Project card dashboard with health indicators (Active/Dormant/Stuck/Attention)
- Empty state wizard for adding first project
- Generic folder mode for non-Git projects
- Project search and filter functionality
- Grid layout with virtual scrolling for 100+ projects
- Auto-detection of projects on first launch
- Remove/untrack project functionality

#### Epic 3: AI Context Recovery
- OpenRouter API integration for cloud LLM access
- Git history analysis (last 20 commits)
- Context panel component with streaming AI responses
- AI attribution display ("Based on: 15 edits, 3 searches")
- Error states and offline mode with graceful degradation
- DEVLOG analysis for enhanced context recovery

#### Epic 4: DEVLOG Editor
- In-app markdown editor using CodeMirror 6
- File sync with repository (DEVLOG.md in project root)
- DEVLOG history view and version tracking
- Auto-save and conflict detection

#### Epic 4.25: Multi-Provider AI Architecture
- Unified API client using Vercel AI SDK
- AWS Lambda demo mode proxy for testing without API keys
- Provider settings UI with multi-key storage
- Secure API key encryption with AES-256-GCM

#### Epic 5: Git Operations & Release
- Git status display with staged/unstaged/untracked files
- One-click commit functionality with commit message input
- One-click push with safety guardrails (warn if remote ahead)
- Edge case handling (detached HEAD, merge conflicts, etc.)
- Visual distinction between Git repos and generic folders (icons)
- Release automation with GitHub Actions

### Features

**Core Functionality:**
- Dashboard with health-based project tracking
- Instant AI context recovery (<10 second target)
- One-click Git commit and push with guardrails
- Generic folder support for non-developers
- Silent behavioral tracking (foundation laid)

**User Experience:**
- Philosophy-aligned empathetic error messages
- Offline mode with local data fallback
- Loading animation (ronin meditation → ready stance)
- Keyboard navigation and accessibility (WCAG 2.1 AA)
- System tray integration and global hotkey (Ctrl+Alt+R)

**Performance:**
- <200MB memory footprint for GUI
- <500ms dashboard load time
- Lazy loading for large project lists
- SQLite WAL mode with ACID guarantees

### Technical Details

**Supported Platforms:**
- Linux (X11 and Wayland GNOME)
- Ubuntu 22.04+, Debian 11+, Fedora 36+, Arch Linux

**Distribution Formats:**
- `.deb` package for Debian/Ubuntu systems
- `.AppImage` for distro-agnostic portable installation

**Build System:**
- GitHub Actions CI/CD pipeline
- Automated releases on version tag push
- Linting and testing enforced before build

### Known Limitations

- Linux only (Windows/macOS planned for future releases)
- Wayland KDE window tracking not yet implemented
- Silent Observer daemon partially implemented
- Team mode and collaboration features not available
- Local SLM option not yet available

### Security

- API keys encrypted with AES-256-GCM
- No raw behavioral logs sent to cloud
- Local-first data storage
- File-level copyleft license (MPL-2.0)

### License

This release is licensed under **Mozilla Public License 2.0 (MPL-2.0)**.

### Contributors

Created by V ([@v](https://github.com/rfxlamia))

Built with support from:
- Tauri framework
- React and shadcn/ui
- OpenRouter AI API
- Anthropic Claude (development assistance)

---

## Release Notes

This is an **alpha release** intended for early testing and feedback. Expect:
- Potential bugs and edge cases
- Performance tuning needed for large project counts
- UI/UX refinements based on user feedback
- Feature additions in upcoming releases

**Feedback Welcome:**
- GitHub Issues: https://github.com/rfxlamia/ronin/issues
- Documentation: `docs/` folder in repository

**Philosophy:**
Ronin follows the Five Pillars (義勇仁礼智) - emphasizing local-first privacy, AI suggestions (never commands), empathetic messaging, ritual-based workflows, and resource efficiency.

---

**Full Changelog:** https://github.com/rfxlamia/ronin/commits/v0.1.0-alpha
