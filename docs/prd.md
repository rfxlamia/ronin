---
stepsCompleted: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11]
lastStep: 11
inputDocuments:
  - docs/analysis/product-brief-ronin-2025-12-16.md
  - docs/analysis/research/technical-ronin-architecture-feasibility-research-2025-12-16.md
  - docs/analysis/brainstorming-session-2025-12-16.md
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
lastStep: 2
project_name: 'ronin'
user_name: 'V'
date: '2025-12-16'
---

# Product Requirements Document - ronin

**Author:** V
**Date:** 2025-12-16

## Executive Summary

Ronin is a Personal Project Development Manager for Linux developers who struggle with project abandonment due to context loss. Built with Rust/Tauri for performance, it serves as the "HQ" (Markas Besar) for your coding life - combining Notion's organizational clarity with GitHub Desktop's repository management, enhanced by Cloud AI intelligence.

**The Core Problem:** Developers with active creative minds spawn multiple projects but struggle to maintain them. The friction isn't writing code - it's *remembering context*. This happens through two forces:

1. **Tool Fragmentation:** Notes in Notion, code in VS Code, tasks in Linear - context scattered everywhere
2. **Time Decay:** Like a student returning to their thesis after 3 weeks of exams - the *what* remains but the *why* evaporates. You spend hours re-reading your own work just to remember your reasoning and plan.

**The Solution:** Ronin provides instant context recovery. Open a dormant project and immediately know where you left off - the AI Consultant analyzes your commits, DEVLOG notes, and project state to reconstruct not just *what* you were doing, but *why* and *what's next*.

### What Makes This Special

- **Instant Context Recovery:** The core "aha moment" - open any project after weeks of inactivity and feel *confidence instead of dread*. In 10 seconds, you know exactly where you left off and what to do next.
- **Lifecycle Focus:** Manages the meta-game of development (Planning, Reviewing, Reviving) rather than just launching projects
- **Second Brain for Code:** Structured project notes (DEVLOG.md) live with the code and feed the AI context
- **Instant AI, No Hardware Tax:** Powerful analysis without draining your 8GB laptop - works fast on any machine

## Project Classification

**Technical Type:** Desktop Application (Rust/Tauri, Linux-native)
**Domain:** Developer Productivity
**Complexity:** Standard (no regulatory requirements)
**Project Context:** Greenfield - new project

## Success Criteria

### User Success

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Context Recovery Time** | < 10s (warm), < 15s (cold) | Timer: project card click → AI response complete |
| **Resurrection Rate** | 50% of dormant projects | Track: "opened in Ronin" → "commit within 24h" |
| **AI Accuracy (with DEVLOG)** | 90% correct "next step" | Test set: 10 projects with DEVLOG |
| **AI Accuracy (without DEVLOG)** | 80% correct "next step" | Test set: 5 golden scenarios, behavior-only inference |
| **Emotional Success** | Reduced anxiety | Self-reported monthly check-in |

### Business Success

| Timeline | Goal | Observable Metrics |
|----------|------|-------------------|
| **MVP** | Personal daily driver | V uses Ronin every morning |
| **3 Months** | Organic adoption | 5 GitHub stars (non-self), 3 active feedback users, 1 external blog/tweet |
| **12 Months** | Team tool | Small team (3-5) uses for context handoff |

### Technical Success

| Metric | Target | Clarification |
|--------|--------|---------------|
| **GUI Memory** | < 200MB RSS | Physical memory, not VSZ |
| **Daemon Memory** | < 50MB RSS | Silent Observer background |
| **Startup (Warm)** | < 3 seconds | App already in disk cache |
| **Startup (Cold)** | < 6 seconds | After fresh reboot |
| **Daemon Stability** | 7 days uptime | No restart required |
| **Thermal** | No fan spin-up idle | Laptop stays cool |

### Measurable Outcomes

- **Daily Active Usage:** Ronin opened at least once per day
- **Session Duration:** Average 5+ minutes per session
- **Project Coverage:** 80%+ of active repos tracked
- **Telemetry:** Built-in from MVP to validate all metrics

## Product Scope

### MVP - Minimum Viable Product

**Core Features:**
1. **Dashboard** - Project cards with health indicators
2. **Context Vault** - DEVLOG.md editor, Git status view
3. **AI Consultant** - "Where was I?" via OpenRouter API
4. **Silent Observer:**
   - X11: Window title tracking ✅
   - Wayland (GNOME): Window title via Shell Extension ✅
   - Wayland (other): Process name fallback ⚠️

**Platform:** Linux (.deb) - X11 + Wayland GNOME
**Memory:** < 200MB GUI, < 50MB daemon

### Growth Features (3 Months)

1. **Cross-Platform** - Windows (.exe), macOS (.dmg)
2. **Smart Silent Observer** - Browser extension, Accessibility API
3. **Wayland KDE** - Full window title support
4. **Stability Polish** - Zero-crash demos
5. **Onboarding Flow** - First-time wizard

### Vision (12 Months)

1. **Team Mode** - Shared projects, context handoff
2. **Integration Layer** - Jira/Linear/Notion sync
3. **Advanced AI** - Local SLM option
4. **Screen OCR** - Opt-in deep capture

## User Journeys

### Journey 1: V - The Polymath Developer Finding Direction

V is a student and developer with 15+ folders in `/home/v/project`. Each folder tells a different story: `chippy/` stuck on an auth bug 3 weeks ago, `ronin/` actively being worked on, `old-game-idea/` abandoned since semester 3, `freelance-client/` published but needs maintenance. Every morning, V opens the file manager and feels overwhelmed - "Which one should I work on today?"

Monday morning, V opens Ronin. Instead of a list of folders, a **map** greets him. The dashboard shows: 3 projects "🔥 Active" (commits this week), 5 projects "😴 Dormant" (untouched >14 days), 2 projects "⚠️ Needs Attention" (forgotten uncommitted changes). `chippy/` appears at the top with a yellow badge: "21 days inactive - branch `feature/login` has 3 uncommitted files."

V clicks `chippy/`. Within 8 seconds, the AI Consultant appears: *"Last time you were debugging token refresh in `auth.rs:142`. The error: 'lifetime mismatch'. You tried 2 approaches that failed (see DEVLOG). Suggestion: try a third approach with Arc<Mutex<>>."*

V smiles. Without re-reading 500 lines of code, without scrolling through git log, V knows exactly where to start. No longer "what should I work on?" but "okay, let's fix this." Within 30 minutes, the bug that was stuck for 3 weeks is finally solved.

### Journey 2: Yosi - The Busy Student Organizer

Yosi is a 6th-semester student active in student government, working on a research journal due in 2 months, plus piling coursework. Her folder `D:\Kuliah\` contains dozens of subfolders: `Jurnal-Ekonomi-Digital/`, `Proposal-BEM-2024/`, `Skripsi-Draft/`, `Tugas-Statistik/`. Each folder contains lengthy .docx and .pdf files. Yosi often forgets: "Which chapter was I on? Which revision from my professor haven't I addressed?"

One day, V (a classmate) demos Ronin in the cafeteria. "This can help you track all your projects, not just coding." Yosi is skeptical but intrigued. That night, she downloads Ronin from the website - a standard .exe installer, just Next → Next → Finish like installing Chrome. No terminal, no config files.

**First 5 Minutes:** On first launch, Ronin asks: "Which folder do you want to track?" Yosi browses to `D:\Kuliah\` and clicks Add. A friendly progress bar appears: "Scanning 23 folders..." Within 30 seconds, the dashboard appears - clean and simple:

- 📁 **Jurnal-Ekonomi-Digital** - 12 files (last modified: 5 days ago)
- 📁 **Proposal-BEM-2024** - 8 files (last modified: 2 weeks ago) ⚠️
- 📁 **Skripsi-Draft** - 3 files (last modified: 1 month ago) 😴

Yosi immediately sees: Proposal BEM hasn't been touched for 2 weeks, but the deadline is next week! Without Ronin, she might have forgotten until D-2. Now, every morning Yosi opens Ronin before opening Word - to see the "map" of what needs work today.

### Journey 3: Fajar - The IoT Maintainer Juggling Multiple Worlds *(3-Month Target)*

Fajar is an IoT maintainer at a company, but his life isn't that simple. Besides maintaining office servers and devices, he also freelances at night. Every day brings new tickets, devices needing firmware updates, freelance clients requesting revisions. Fajar doesn't need "where was I?" - he needs "what needs to be done TODAY?"

Monday morning, 08:15. Fajar arrives at the office, turns on his laptop, opens Ronin. The dashboard immediately shows:

**🏢 Office - IoT Maintenance**
- 🆕 `firmware-update-spec.pdf` added 2 hours ago → Needs review
- ⏳ `sensor-calibration/` - 2/5 tasks done
- ✅ `server-migration/` - Completed yesterday

**💼 Freelance - Client A**
- ⚠️ `revisi-dashboard.docx` modified yesterday → New changes detected
- ✅ `invoice-november.pdf` - Sent

Fajar doesn't need to open email, scroll through Slack, or try to remember. Ronin has detected new files and changes, displaying them as items needing attention. When Fajar finishes reviewing the spec, he clicks ✓. When he deploys firmware, Ronin detects folder changes and automatically updates progress.

Before leaving, Fajar checks Ronin again. Today's progress: 7/10 tasks done. Remaining items auto-carry to tomorrow with context recorded.

### Journey Requirements Summary

| Journey | User Type | Scope | Key Capabilities |
|---------|-----------|-------|------------------|
| **V** | Developer | MVP | Git integration, AI context recovery, DEVLOG sync |
| **Yosi** | Non-developer | MVP (Generic Mode) | Simple installer, folder tracking, last-modified dates |
| **Fajar** | Professional | 3-Month | Multi-workspace, task management, file change detection |

**MVP Capabilities (from journeys):**
- Dashboard with project health indicators (Active/Dormant/Needs Attention)
- Git status integration (for developer projects)
- Generic Folder Mode: folder name + file count + last modified (no content parsing)
- AI Consultant for context recovery (developer projects only)
- Simple onboarding: "Add folder" wizard

**3-Month Capabilities (from journeys):**
- Cross-platform installers (Windows .exe, macOS .dmg)
- Multi-workspace support (Kantor/Freelance separation)
- Task management with checkboxes
- File change detection with auto-progress tracking
- AI-powered task extraction from documents

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Behavioral Context Inference (Core Differentiator)**
The TRUE innovation: AI recovers context from your *behavior*, not just your notes. Silent Observer feeds into AI Consultant via Context Aggregator, enabling:
- "You edited auth.rs 15 times without commit → you're stuck"
- "Browser showed 'Rust lifetime' searches → lifetime issue"
- "Rapid window switching detected → frustration signal"

This works **WITHOUT requiring DEVLOG**. DEVLOG enhances accuracy, but isn't required.

**2. Passive Intelligence (Silent Observer → AI Pipeline)**
Unlike traditional productivity tools that require manual logging, Ronin observes passively AND uses that data intelligently:
- Window titles + file modifications → behavioral context
- Temporal correlation → search patterns linked to code sections
- Stuck detection → proactive surfacing of blocked projects

**3. Notion + GitHub Desktop Fusion**
Ronin bridges two worlds that have never been combined:
- **Notion's strength:** Project organization, notes, dashboards
- **GitHub Desktop's strength:** Repository management, Git operations
- **Ronin's fusion:** Both in one lightweight app, with AI connecting them

**Product Identity:** Ronin is your **Project HQ** - see all your projects, know what needs attention, get back to work fast. Notes, Git, AI are features that support this core identity.

**4. Frictionless Git Operations**
One-click commit and push eliminates terminal friction:
- Quick commit button with message input
- Guardrails: warn if remote is ahead, never auto-resolve conflicts
- If push fails → show error, suggest terminal
- MVP implementation: shell out to `git` CLI (simple, works everywhere)
- 3-Month: migrate to `git2-rs` for branch switching support

### What Makes Ronin a TRUE Solution (Not Just a Dashboard)

| Dashboard Characteristic | Solution Characteristic | Ronin |
|--------------------------|------------------------|-------|
| Shows data you already know | Discovers patterns you didn't notice | ✅ Stuck detection |
| Requires manual input | Infers context from behavior | ✅ Silent Observer → AI |
| Reactive (you ask, it shows) | Proactive (suggests before you ask) | ✅ Surfaces stuck projects |
| Echoes your notes back | Works without notes | ✅ Behavior-first inference |

### Validation Approach

| Innovation | How to Validate | Baseline |
|------------|-----------------|----------|
| Behavioral inference | 5 golden scenarios WITHOUT DEVLOG - 80% accuracy | N/A (new capability) |
| Context recovery (with DEVLOG) | 10 projects with DEVLOG - 90% accuracy | Self-report before Ronin |
| Stuck detection | AI correctly identifies stuck pattern in 4/5 test cases | Manual detection time |
| Proactive surfacing | Dashboard shows stuck projects before user asks | User discovers stuck projects manually |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI gives wrong inference | Show sources (FR78): "Based on: 15 edits, 3 searches" |
| Silent Observer feels creepy | Privacy controls (FR76), local-only data, easy disable |
| Behavioral data too noisy | Context Aggregator summarizes to <10KB (NFR29) |
| Git operations cause data loss | Read-only by default, confirm before push |
| Product identity crisis | Lead with "Project HQ" framing |
| Inference accuracy too low | Golden test scenarios validate 80% threshold (NFR30) |

## Desktop Application Requirements

### Platform Support

| Platform | Scope | Timeline |
|----------|-------|----------|
| **Linux (.deb)** | X11 + Wayland GNOME | MVP |
| **Windows (.exe)** | - | Post-stable (3-month+) |
| **macOS (.dmg)** | - | Post-stable (3-month+) |

**Strategy:** Linux-first until stable. Cross-platform only after core experience is solid.

### Update Strategy

- **Mechanism:** In-app notification with download link
- **Flow:**
  1. Ronin checks for updates on startup (non-blocking)
  2. If new version available → show notification badge
  3. User clicks → opens download page or changelog
  4. User downloads and installs manually
- **No auto-update in MVP** - keeps implementation simple, user stays in control

### System Integration

| Feature | Priority | Description |
|---------|----------|-------------|
| **System Tray Icon** | MVP Must-Have | Silent Observer runs in background, tray shows status |
| **Global Hotkey** | MVP Nice-to-Have | `Ctrl+Alt+R` (configurable) to open/focus Ronin |
| **Desktop Notifications** | MVP Nice-to-Have | "Project X needs attention", "Update available" |
| **Startup on Boot** | Post-MVP | Optional setting, disabled by default |

**Hotkey Implementation:**
- Default: `Ctrl+Alt+R` (avoids `Super` conflicts with GNOME/KDE)
- Configurable from settings
- Handle conflicts gracefully: show "Hotkey conflict detected" if registration fails

**GNOME Wayland Note:** System tray requires AppIndicator extension. Show setup guide on first launch if tray unavailable.

### Offline Capabilities

| Feature | Offline | Online |
|---------|---------|--------|
| Dashboard & project list | ✅ Works | ✅ Works |
| Git status view | ✅ Works | ✅ Works |
| DEVLOG editor | ✅ Works | ✅ Works |
| One-click commit/push | ⚠️ Commit works, push fails | ✅ Works |
| AI Consultant | ❌ "No internet" message | ✅ Works |
| Silent Observer | ✅ Works (local logging) | ✅ Works |

**Offline AI Handling:** Show clear message "AI Consultant unavailable - no internet connection" with option to retry.

### Technical Architecture (Tauri v2)

```
┌─────────────────────────────────────────┐
│           Ronin Desktop App             │
├─────────────────────────────────────────┤
│  Frontend (React/TypeScript)            │
│  - Dashboard UI                         │
│  - Project cards                        │
│  - DEVLOG editor                        │
│  - AI chat interface                    │
├─────────────────────────────────────────┤
│  Tauri Core (Rust)                      │
│  - Git operations (shell commands)      │
│  - File system watching (notify crate)  │
│  - System tray management               │
│  - Global hotkey registration           │
│  - OpenRouter API client                │
├─────────────────────────────────────────┤
│  Context Aggregator (Rust) ← CORE       │
│  - Merges: Git + DEVLOG + Behavior      │
│  - Summarizes logs to <10KB payload     │
│  - Detects stuck patterns               │
│  - Temporal correlation engine          │
├─────────────────────────────────────────┤
│  Silent Observer (Integrated)           │
│  - Window title tracking (D-Bus/X11)    │
│  - File modification events (notify)    │
│  - Activity logging (SQLite)            │
│  - Feeds into Context Aggregator        │
└─────────────────────────────────────────┘
```

**Data Flow (True Solution):**
```
Silent Observer ──┐
                  ├──▶ Context Aggregator ──▶ AI Consultant
Git + DEVLOG ─────┘         │
                            ▼
                    Summarized context (<10KB)
                    + Stuck pattern signals
                    + Temporal correlations
```

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP - Deliver the core "aha moment" (context recovery) with clean, polished UI. Users should feel the magic even if features are limited.

**UI Philosophy:** Good enough UI that works > perfect UI that ships late. But "good enough" means clean and professional, not ugly.

### Phased MVP Approach

**MVP v0.1 - Foundation (4 weeks):**
- Dashboard + project cards (clean UI, no custom illustrations yet)
- Git status view (read-only)
- Generic Folder Mode for non-dev users
- Basic project health indicators
- Silent Observer: window title + file modification tracking

**MVP v0.2 - Intelligence Core (4 weeks):**
- AI Consultant with behavior integration (FR65, FR69) ← **Core differentiator**
- Context Aggregator: merges git + DEVLOG + Silent Observer data
- AI shows inference sources (FR78) for transparency
- One-click commit + push (with guardrails)
- DEVLOG.md editor
- Context recovery works WITHOUT DEVLOG

**MVP v0.3 - Smart Inference (4 weeks):**
- Stuck pattern detection (FR66-68)
- Temporal correlation (browser search → file edit)
- System tray icon
- 3 status icons + 1 empty state illustration
- Desktop notifications (nice-to-have)

### UI/UX Approach

**Tech Stack:**
- **Components:** shadcn/ui + Tailwind CSS
- **Style:** Corporate Memphis (clean, friendly, approachable)
- **Illustrations:** Pre-generated via Imagen, not runtime

**Asset Generation Pipeline:**
```
.agent/workflows/imagine/generateimage.md     → PNG (Imagen 2048px+)
.agent/workflows/png-to-svg-vectorizer/       → SVG (Vector)
.agent/workflows/svg-to-tsx/                  → TSX Component (with props: color, size)
```

**Brand Colors (from ronin-brand-colors.md):**

| Name | Hex | Usage |
|------|-----|-------|
| **Antique Brass** | #CC785C | Primary accent, CTAs, active states |
| **Friar Gray** | #828179 | Secondary text, borders, muted elements |
| **Cararra** | #F0EFEA | Background, cards, light surfaces |
| **White** | #FFFFFF | Clean backgrounds, contrast |
| **Cod Gray** | #141413 | Primary text, dark mode base |

**MVP UI Priorities:**
1. Project cards - the heart of the dashboard
2. Status indicators - 3 icons (Active/Dormant/Needs Attention)
3. 1 empty state illustration (test full pipeline early)
4. AI chat interface (simple)

**3-Month UI Additions:**
- Full illustration set (3-4 empty state variations)
- Ronin mascot character
- Onboarding wizard UI
- Error state illustrations
- Enhanced dashboard layout

### Post-MVP Features (Phase 2 - 3 Months)

- Cross-platform (Windows .exe, macOS .dmg)
- Multi-workspace support (Fajar's journey)
- Task management with checkboxes
- File change detection
- Browser extension for Silent Observer
- Wayland KDE support

### Future Vision (Phase 3 - 12 Months)

- Team mode & context handoff
- Jira/Linear/Notion integration
- Local SLM option
- AI task extraction from documents
- Screen OCR (opt-in)

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Technical:** Wayland GNOME Shell Extension | Start with X11, GNOME extension parallel track |
| **Technical:** AI accuracy <80% | Show source (commits, DEVLOG) for verification |
| **Technical:** Asset pipeline issues | Test full PNG→SVG→TSX pipeline early with one illustration |
| **Market:** Users don't adopt | Focus on V's daily use first, organic growth follows |
| **Resource:** Solo developer bandwidth | Phased MVP (v0.1→v0.2→v0.3), ship early iterate fast |
| **UI:** Illustration delays MVP | Limit to 1 illustration in v0.3, expand post-MVP |

## Functional Requirements

### Project Dashboard

- **FR1:** User can view all tracked projects in a unified dashboard
- **FR2:** User can see project health status (Active/Dormant/Needs Attention) at a glance
- **FR3:** User can see days since last activity for each project
- **FR4:** User can see uncommitted changes indicator for Git projects
- **FR5:** System automatically sorts projects by priority (neglected-but-important surfaces to top)
- **FR6:** User can add new project folders to track
- **FR7:** User can remove projects from tracking
- **FR8:** User can distinguish between Git projects and generic folders
- **FR55:** User can archive projects (hide from main view without deleting)
- **FR56:** User can filter projects by status (Active/Dormant/Archived/All)
- **FR62:** User can search projects by name

### Context Recovery (AI Consultant)

- **FR9:** User can ask "Where was I?" for any project
- **FR10:** System provides AI-generated context summary within 10 seconds
- **FR11:** AI Consultant analyzes last 20 commits for context
- **FR12:** AI Consultant analyzes last 500 lines of DEVLOG for context
- **FR13:** User can see the source of AI's context (commits, DEVLOG, behavior) for verification
- **FR14:** System shows clear message when AI is unavailable (no internet)
- **FR60:** User sees loading indicator during AI context generation

### Context Vault (DEVLOG)

- **FR15:** User can create and edit DEVLOG.md for each project
- **FR16:** DEVLOG content syncs with file in project repository
- **FR17:** User can view DEVLOG history/changes

### Git Integration

- **FR18:** User can view current branch name
- **FR19:** User can view list of uncommitted files
- **FR20:** User can view unpushed commits count
- **FR21:** User can commit changes with a message (one-click)
- **FR22:** User can push commits to remote (one-click)
- **FR23:** System warns user if remote has newer changes before push
- **FR24:** System shows error message if push fails (suggests terminal)
- **FR57:** System handles projects with no remote configured gracefully
- **FR58:** System handles detached HEAD state gracefully
- **FR61:** User sees success confirmation after commit/push

### Generic Folder Mode (Non-Developer)

- **FR25:** User can track non-Git folders as projects
- **FR26:** System displays folder name as project name
- **FR27:** System displays file count in folder
- **FR28:** System displays last modified date
- **FR29:** System calculates dormancy based on file modification dates

### Silent Observer

- **FR30:** System tracks active window titles in background
- **FR31:** System logs activity per project based on window context
- **FR32:** User can enable/disable Silent Observer
- **FR33:** System works on X11 window manager
- **FR34:** System works on Wayland GNOME (via D-Bus/Shell Extension)
- **FR35:** All tracking data stored locally only
- **FR77:** Silent Observer tracks file modification events in tracked projects (via filesystem watcher)

### System Integration

- **FR36:** Application runs in system tray when minimized
- **FR37:** User can open application via global hotkey
- **FR38:** User can configure global hotkey
- **FR39:** System shows notification when project needs attention
- **FR40:** System checks for updates on startup
- **FR41:** System shows notification when update is available

### Settings & Configuration

- **FR42:** User can configure OpenRouter API key
- **FR43:** User can configure project folders to scan
- **FR44:** User can configure dormancy threshold (days)
- **FR45:** User can toggle Silent Observer on/off
- **FR46:** User can toggle startup on boot
- **FR47:** User can toggle desktop notifications

### Onboarding & First-Time Experience

- **FR48:** First-time user can complete setup wizard to configure initial settings
- **FR49:** User can see guided tour of key features on first launch
- **FR50:** System auto-detects Git repositories in common locations (~/projects, ~/code, ~/dev)
- **FR59:** User sees helpful empty state when no projects are tracked

### Data Persistence & Error Handling

- **FR51:** User can see clear error messages when operations fail
- **FR52:** User can retry failed operations
- **FR53:** System persists project list and settings between sessions
- **FR54:** System persists activity logs from Silent Observer

### Telemetry (Local Metrics)

- **FR63:** System logs context recovery time for success metrics
- **FR64:** System logs project resurrection events (opened → commit within 24h)

### AI + Silent Observer Integration (Core Differentiator)

- **FR65:** AI Consultant ingests Silent Observer activity logs as context source
- **FR66:** AI detects "stuck patterns" (same file modified 5+ times without commit)
- **FR67:** AI correlates browser activity with code sections via temporal proximity (search → file edit within 5 min)
- **FR68:** AI identifies frustration signals (rapid window switching, long pauses between edits)
- **FR69:** Context recovery works WITHOUT DEVLOG - behavior inference is primary, DEVLOG is enhancement
- **FR78:** AI shows sources for context inference ("Based on: 15 edits to auth.rs, 3 StackOverflow searches about 'Rust lifetime'")

### Proactive Intelligence (Post-MVP)

- **FR70:** AI provides proactive suggestions based on detected stuck patterns
- **FR71:** AI learns from past project patterns ("Project X had similar issue, solved with Y")
- **FR72:** System surfaces "stuck" projects on dashboard before user asks

### Privacy Controls

- **FR76:** User can exclude specific apps/URLs from Silent Observer tracking

## Non-Functional Requirements

### Performance

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| **NFR1** | Context recovery time | <2s first content, <10s full response | P0 |
| **NFR2** | Dashboard load time | <2 seconds to interactive | P1 |
| **NFR3** | App startup time | <3s (warm), <6s (cold) | P1 |
| **NFR4** | Git status refresh | <1 second | P1 |
| **NFR5** | Project search response | <100ms per keystroke | P1 |
| **NFR23** | Perceived performance | First meaningful content within 2 seconds | P1 |

### Resource Efficiency

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| **NFR6** | GUI memory usage | <150MB baseline + <1MB per tracked project | P0 |
| **NFR7** | Silent Observer memory | <50MB RSS | P1 |
| **NFR8** | Thermal impact | No fan spin-up during idle | P1 |
| **NFR9** | CPU usage idle | <1% when no user interaction | P1 |
| **NFR10** | Database size | <100MB for typical usage | P1 |

### Security & Privacy

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| **NFR11** | API key storage | Encrypted locally, not plaintext | P0 |
| **NFR12** | Activity data | All Silent Observer data stored locally only | P0 |
| **NFR13** | Data deletion | User can delete all tracked data | P0 |
| **NFR14** | Telemetry | No data sent without user consent (opt-in) | P0 |
| **NFR15** | Git credentials | Never stored by Ronin, use system Git | P0 |

### Reliability

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| **NFR17** | Data integrity | No data loss on unexpected shutdown (SQLite WAL) | P0 |
| **NFR18** | Graceful degradation | App remains functional when AI unavailable | P0 |
| **NFR19** | Git safety | Git operations never cause data loss | P0 |
| **NFR24** | Sleep/wake survival | Zero crashes across laptop sleep/wake cycles | P0 |
| **NFR25** | Database consistency | SQLite remains consistent after power loss | P1 |
| **NFR26** | Startup integrity | Automatic database integrity check on startup | P1 |
| **NFR27** | Observer reconnect | Silent Observer reconnects after system resume | P1 |
| **NFR28** | Scale degradation | Graceful performance with 100+ projects (slower, not crash) | P2 |

### Accessibility

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| **NFR20** | Keyboard navigation | All core actions accessible via keyboard | P2 |
| **NFR21** | Color contrast | WCAG AA compliant (≥4.5:1 ratio) | P2 |
| **NFR22** | Screen reader | ARIA labels on key elements | P2 |

### AI Context Pipeline

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| **NFR29** | Context payload to AI | <10KB summarized (not raw logs) | P0 |
| **NFR30** | Behavioral inference accuracy | 80% on 5 golden test scenarios | P0 |

### Priority Legend

| Priority | Description | Testing |
|----------|-------------|---------|
| **P0 (Must)** | Core experience + security - MVP blockers | Test before every release |
| **P1 (Should)** | Polish + reliability - Important for quality | Test weekly |
| **P2 (Could)** | Accessibility + edge cases - Nice to have | Test monthly |
```
