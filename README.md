# 浪人 Ronin

>  Project HQ for Linux developers who lose context switching between multiple projects

[![CI](https://github.com/rfxlamia/ronin/actions/workflows/ci.yml/badge.svg)](https://github.com/rfxlamia/ronin/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![License](https://img.shields.io/badge/license-MPL--2.0-blue)

**⚠️ Alpha Release** - Basic functionality working, expect rough edges and bugs.
---

## Overview

R
## What Problem Does This Solve?

You have 5+ side projects. You return to one after 3 weeks. You spend 2 hours re-reading your own code just to remember *why* you wrote it that way and *what* you were planning next.

**Ronin gives you instant context recovery in <10 seconds.**

Open any dormant project → AI analyzes your last 20 commits + notes → tells you exactly where you left off and what to do next.

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

---

## Quick Start

1. **Launch Ronin** (or press `Ctrl+Alt+R`)

2. **Add your first project:**
   - Click "Add Project"
   - Select any folder (Git repo or plain folder)
   - Ronin auto-detects project type

3. **Recover context from dormant project:**
   - Click on project card
   - AI analyzes commits + notes
   - Get actionable summary in seconds

4. **Set up AI (required for context recovery):**
   - Settings → API Configuration
   - Get free OpenRouter key: https://openrouter.ai
   - Paste key (encrypted locally with AES-256)
   - OR you can use demo mode (no API key required) for free usage 

---

## Current Features (v0.1-alpha)

- ✅ Dashboard with health indicators (Active/Dormant/Stuck)
- ✅ Git integration (status, one-click commit/push)
- ✅ AI context recovery from commit history
- ✅ DEVLOG markdown editor (syncs with repo)
- ✅ Generic folder support (works for non-Git projects)
- ✅ System tray + global hotkey
- ✅ Dark/light mode

---

## Known Limitations

- **Linux only** - X11 and Wayland (GNOME) supported. Windows/macOS planned.
- **Requires API key** - Free tier available at OpenRouter, but needs internet.
- **Alpha quality** - Expect bugs, performance issues, UI quirks.
- **No team features** - Single-user only for now.

---

## Development

**Tech Stack:** Rust/Tauri backend + React/TypeScript frontend

```bash
# Prerequisites: Node 20+, Rust 1.75+, Linux build tools
git clone https://github.com/rfxlamia/ronin.git
cd ronin
npm install
npm run tauri dev
```

---

## Feedback & Support

- **Bug reports:** [GitHub Issues](https://github.com/rfxlamia/ronin/issues)
- **Feature requests:** [GitHub Discussions](https://github.com/rfxlamia/ronin/discussions)
- **Documentation:** [docs/](docs/)

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

*"A ronin without a master must become their own sensei."*
