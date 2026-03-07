# 浪人 Ronin

> Project HQ for developers who lose context switching between side projects

[![CI](https://github.com/rfxlamia/ronin/actions/workflows/ci.yml/badge.svg)](https://github.com/rfxlamia/ronin/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-0.1.0--beta-orange)
![License](https://img.shields.io/badge/license-MPL--2.0-blue)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)

**🚧 Beta Release** — Core features stable. Cross-platform builds (macOS/Windows) are new in this release — expect occasional rough edges.

---

## What is Ronin?

![ronin-logo](/home/v/project/ronin/vdocs/ronin-logo.png)

You have 5+ side projects. You return to one after three weeks away. You spend the next two hours re-reading your own code just to remember *why* you wrote it that way — and *what* you were planning to do next.

**Ronin gives you instant context recovery.**

Open any dormant project → AI reads your last 20 commits + your DEVLOG notes → tells you exactly where you left off and what to do next. In under 10 seconds.

Ronin is a **local-first desktop app** built on Tauri. Your data never leaves your machine. There is no account, no subscription, and no cloud sync. Just you and your projects.

---

## Screenshots

<!-- SCREENSHOT: Dashboard overview showing project grid with health statuses -->![dashboard](/home/v/project/ronin/vdocs/image/dashboard.png)

> 📸 *Dashboard*

<!-- SCREENSHOT: AI context recovery panel open on a dormant project -->![ai-context-ss](/home/v/project/ronin/vdocs/image/ai-context-ss.png)

> 📸 *AI Context Recovery*

<!-- SCREENSHOT: DEVLOG markdown editor in-app -->![devlog](/home/v/project/ronin/vdocs/image/devlog.png)

> 📸 *DEVLOG Editor*

<!-- SCREENSHOT: Settings page with OpenRouter model selector -->![settings-page](/home/v/project/ronin/vdocs/image/settings-page.png)

> 📸 *Settings & Model Selection*

---

## Features (v0.1.0-beta)

| Feature | Description |
|---|---|
| 📊 **Project Dashboard** | Health indicators (Active / Dormant / Stuck) with auto-sorting |
| 🤖 **AI Context Recovery** | Resume any dormant project in <10 seconds with AI-powered summaries |
| ✍️ **AI Commit Messages** | Generate conventional commit messages from your git diff |
| 📝 **DEVLOG Editor** | In-app Markdown editor that syncs with `DEVLOG.md` in your repo |
| 🔀 **Git Integration** | View status, stage, commit, and push — all without leaving Ronin |
| 🧠 **Model Selection** | Choose any OpenRouter model with live search and free fallback chain |
| 📁 **Generic Folder Mode** | Track non-Git projects too (file count, last modified, dormancy) |
| 🖥️ **System Tray + Hotkey** | Minimize to tray, summon with `Ctrl+Alt+R` (or `Cmd+Alt+R` on macOS) |
| 🌗 **Dark / Light Mode** | Follows system preference |

**Supported Platforms (v0.1.0-beta):**

| Platform | Status | Format |
|---|---|---|
| Linux (Ubuntu 22.04+, Debian 11+, Arch, Fedora) | ✅ Stable | `.deb`, `.AppImage` |
| macOS (Intel + Apple Silicon) | 🆕 Beta | `.dmg` (unsigned — see note below) |
| Windows | 🆕 Beta | `.msi`, `.exe` |

---

## Installation

Download the latest release from [GitHub Releases](https://github.com/rfxlamia/ronin/releases).

### Linux

**Option 1: .deb package (Debian/Ubuntu)**

```bash
wget https://github.com/rfxlamia/ronin/releases/download/v0.1.0-beta/ronin_0.1.0-beta_amd64.deb
sudo dpkg -i ronin_0.1.0-beta_amd64.deb
sudo apt-get install -f   # fix dependencies if needed
ronin
```

Tested on Ubuntu 22.04+, Debian 11+, Linux Mint 21+, Pop!_OS 22.04+.

**Option 2: AppImage (any distro)**

```bash
wget https://github.com/rfxlamia/ronin/releases/download/v0.1.0-beta/ronin_0.1.0-beta_amd64.AppImage
chmod +x ronin_0.1.0-beta_amd64.AppImage
./ronin_0.1.0-beta_amd64.AppImage
```

No install or admin privileges needed.

### macOS

> ⚠️ **Unsigned App** — Ronin is not yet code-signed with an Apple Developer certificate. When you open the `.dmg`, macOS will warn you about an "unidentified developer". To bypass this and run the app:
>
> ```bash
> xattr -cr /Applications/Ronin.app
> ```
>
> We are working on obtaining an Apple Developer certificate to remove this warning.  
> [Help fund it via GitHub Sponsors ↓](#support--sponsorship)

Download `ronin_0.1.0-beta_universal.dmg` from Releases, open it, and drag Ronin to Applications.

### Windows

Download `ronin_0.1.0-beta_x64-setup.exe` from Releases and run the installer. Windows SmartScreen may warn about an unsigned app — click **More info → Run anyway**.

---

## Quick Start

1. **Launch Ronin** (or press `Ctrl+Alt+R` / `Cmd+Alt+R`)

2. **Add your first project:**
   - Click "Add Project"
   - Select any folder (Git repo or plain folder)
   - Ronin auto-detects the project type

3. **Recover context from a dormant project:**
   - Click any project card
   - Click "Where was I?"
   - AI reads your last 20 commits + DEVLOG and tells you what to do next

4. **Set up AI (for context recovery):**
   - Settings → API Configuration
   - Get a free key at [openrouter.ai](https://openrouter.ai)
   - Paste it in (stored encrypted with AES-256-GCM, never leaves your device)
   - **No API key?** Use Demo Mode — limited but free, no sign-up needed

---

## Philosophy: The Five Pillars (義勇仁礼智)

Ronin is built on five principles from the samurai code:

- **義 (Gi) — Righteous Code:** Local-first. No telemetry. Opt-in behavioral tracking only.
- **勇 (Yu) — Courageous Autonomy:** AI suggests, never commands. You stay in control.
- **仁 (Jin) — Compassionate Craft:** Empathetic error messages. No productivity shaming.
- **礼 (Rei) — Ritual & Discipline:** The dashboard as a morning ritual. Structured context.
- **智 (Chi) — Strategic Resourcefulness:** Lightweight footprint. Works on any 8GB laptop.

Full philosophy: [vdocs/PHILOSOPHY.md](vdocs/PHILOSOPHY.md)

---

## Roadmap

### Near Term (v0.2)
- Silent Observer — background window tracking for automatic context (Linux, then macOS)
- Wayland KDE support
- Archive / hide projects
- Task extraction from commit messages

### Mid Term (v0.3)
- Multi-workspace support
- Built-in task checklist per project
- File change detection (notify on project drift)
- Browser extension for Silent Observer context

### Future (v1.0+)
- Team mode & async context handoff
- Jira / Linear / Notion integration
- Local SLM option (no API key, fully offline)
- AI task extraction from free-form documents
- macOS and Windows Silent Observer backends

---

## Support & Sponsorship

Ronin is free, open-source, and built solo in spare time.

### Help Fund macOS Code Signing

Distributing a properly signed macOS app requires an **Apple Developer Program** membership at **$99/year**. Without it, every macOS user sees the "unidentified developer" warning and needs to run a terminal command just to open the app.

If Ronin is useful to you — or you just want to see it grow — consider sponsoring on GitHub:

**[❤️ Sponsor on GitHub](https://github.com/sponsors/rfxlamia)**

Sponsorship directly covers:
- Apple Developer Program certificate (code signing for macOS)
- Infrastructure costs for the demo mode proxy

---

## Development

**Prerequisites:** Node 20+, Rust 1.75+, system libraries (Linux: `libwebkit2gtk-4.1-dev`, `libxdo-dev`, `libayatana-appindicator3-dev`)

```bash
git clone https://github.com/rfxlamia/ronin.git
cd ronin
npm install
npm run tauri dev
```

**Other commands:**

```bash
npm test              # Run all Vitest tests
npm run lint          # TypeScript type check + ESLint
npm run tauri build   # Build release binary for current platform
```

---

## Feedback & Contributing

- **Bug reports:** [GitHub Issues](https://github.com/rfxlamia/ronin/issues)
- **Feature requests:** [GitHub Discussions](https://github.com/rfxlamia/ronin/discussions)
- **Docs:** [docs/](docs/)

Contributions welcome. See [CLAUDE.md](CLAUDE.md) for architecture and conventions.

---

## License

**Mozilla Public License 2.0 (MPL-2.0)** — See [LICENSE](LICENSE)

Free to use, modify, and distribute. Modifications to MPL-licensed files must remain MPL. Can be used in proprietary software.

---

## Acknowledgments

Built with [Tauri](https://tauri.app/), [React](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/), and [OpenRouter](https://openrouter.ai/). Philosophy inspired by Bushido (武士道) and Japanese craftsmanship principles.

---

Created by V — [@rfxlamia](https://github.com/rfxlamia)

*"A ronin without a master must become their own sensei."*
