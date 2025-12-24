---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/ux-design-specification.md
  - docs/project_context.md
workflowType: 'epics-and-stories'
project_name: 'ronin'
user_name: 'V'
date: '2025-12-17'
---

# Ronin - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Ronin, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Project Dashboard (11 FRs)**
- FR1: User can view all tracked projects in a unified dashboard
- FR2: User can see project health status (Active/Dormant/Needs Attention) at a glance
- FR3: User can see days since last activity for each project
- FR4: User can see uncommitted changes indicator for Git projects
- FR5: System automatically sorts projects by priority (neglected-but-important surfaces to top)
- FR6: User can add new project folders to track
- FR7: User can remove projects from tracking
- FR8: User can distinguish between Git projects and generic folders
- FR55: User can archive projects (hide from main view without deleting)
- FR56: User can filter projects by status (Active/Dormant/Archived/All)
- FR62: User can search projects by name

**Context Recovery - AI Consultant (7 FRs)**
- FR9: User can ask "Where was I?" for any project
- FR10: System provides AI-generated context summary within 10 seconds
- FR11: AI Consultant analyzes last 20 commits for context
- FR12: AI Consultant analyzes last 500 lines of DEVLOG for context
- FR13: User can see the source of AI's context (commits, DEVLOG, behavior) for verification
- FR14: System shows clear message when AI is unavailable (no internet)
- FR60: User sees loading indicator during AI context generation

**Context Vault - DEVLOG (3 FRs)**
- FR15: User can create and edit DEVLOG.md for each project
- FR16: DEVLOG content syncs with file in project repository
- FR17: User can view DEVLOG history/changes

**Git Integration (10 FRs)**
- FR18: User can view current branch name
- FR19: User can view list of uncommitted files
- FR20: User can view unpushed commits count
- FR21: User can commit changes with a message (one-click)
- FR22: User can push commits to remote (one-click)
- FR23: System warns user if remote has newer changes before push
- FR24: System shows error message if push fails (suggests terminal)
- FR57: System handles projects with no remote configured gracefully
- FR58: System handles detached HEAD state gracefully
- FR61: User sees success confirmation after commit/push

**Generic Folder Mode (5 FRs)**
- FR25: User can track non-Git folders as projects
- FR26: System displays folder name as project name
- FR27: System displays file count in folder
- FR28: System displays last modified date
- FR29: System calculates dormancy based on file modification dates

**Silent Observer (7 FRs)**
- FR30: System tracks active window titles in background
- FR31: System logs activity per project based on window context
- FR32: User can enable/disable Silent Observer
- FR33: System works on X11 window manager
- FR34: System works on Wayland GNOME (via D-Bus/Shell Extension)
- FR35: All tracking data stored locally only
- FR77: Silent Observer tracks file modification events in tracked projects

**System Integration (6 FRs)**
- FR36: Application runs in system tray when minimized
- FR37: User can open application via global hotkey
- FR38: User can configure global hotkey
- FR39: System shows notification when project needs attention
- FR40: System checks for updates on startup
- FR41: System shows notification when update is available

**Settings & Configuration (6 FRs)**
- FR42: User can configure OpenRouter API key
- FR43: User can configure project folders to scan
- FR44: User can configure dormancy threshold (days)
- FR45: User can toggle Silent Observer on/off
- FR46: User can toggle startup on boot
- FR47: User can toggle desktop notifications

**Onboarding & First-Time Experience (4 FRs)**
- FR48: First-time user can complete setup wizard to configure initial settings
- FR49: User can see guided tour of key features on first launch
- FR50: System auto-detects Git repositories in common locations
- FR59: User sees helpful empty state when no projects are tracked

**Data Persistence & Error Handling (4 FRs)**
- FR51: User can see clear error messages when operations fail
- FR52: User can retry failed operations
- FR53: System persists project list and settings between sessions
- FR54: System persists activity logs from Silent Observer

**Telemetry - Local Metrics (2 FRs)**
- FR63: System logs context recovery time for success metrics
- FR64: System logs project resurrection events

**AI + Silent Observer Integration - Core Differentiator (6 FRs)**
- FR65: AI Consultant ingests Silent Observer activity logs as context source
- FR66: AI detects "stuck patterns" (same file modified 5+ times without commit)
- FR67: AI correlates browser activity with code sections via temporal proximity
- FR68: AI identifies frustration signals (rapid window switching, long pauses)
- FR69: Context recovery works WITHOUT DEVLOG - behavior inference is primary
- FR78: AI shows sources for context inference ("Based on: 15 edits to auth.rs")

**Proactive Intelligence - Post-MVP (3 FRs)**
- FR70: AI provides proactive suggestions based on detected stuck patterns
- FR71: AI learns from past project patterns
- FR72: System surfaces "stuck" projects on dashboard before user asks

**Privacy Controls (1 FR)**
- FR76: User can exclude specific apps/URLs from Silent Observer tracking

### Non-Functional Requirements

**Performance (P0 - MVP Blockers)**
- NFR1: Context recovery time < 2s first content, < 10s full response
- NFR2: Dashboard load time < 2 seconds to interactive
- NFR3: App startup time < 3s (warm), < 6s (cold)
- NFR4: Git status refresh < 1 second
- NFR5: Project search response < 100ms per keystroke
- NFR23: Perceived performance - first meaningful content within 2 seconds

**Resource Efficiency (P0-P1)**
- NFR6: GUI memory usage < 150MB baseline + < 1MB per tracked project
- NFR7: Silent Observer memory < 50MB RSS
- NFR8: Thermal impact - no fan spin-up during idle
- NFR9: CPU usage idle < 1% when no user interaction
- NFR10: Database size < 100MB for typical usage

**Security & Privacy (P0 - MVP Blockers)**
- NFR11: API key storage - encrypted locally, not plaintext
- NFR12: Activity data - all Silent Observer data stored locally only
- NFR13: Data deletion - user can delete all tracked data
- NFR14: Telemetry - no data sent without user consent (opt-in)
- NFR15: Git credentials - never stored by Ronin, use system Git

**Reliability (P0-P1)**
- NFR17: Data integrity - no data loss on unexpected shutdown (SQLite WAL)
- NFR18: Graceful degradation - app remains functional when AI unavailable
- NFR19: Git safety - git operations never cause data loss
- NFR24: Sleep/wake survival - zero crashes across laptop sleep/wake cycles
- NFR25: Database consistency - SQLite remains consistent after power loss
- NFR26: Startup integrity - automatic database integrity check on startup
- NFR27: Observer reconnect - Silent Observer reconnects after system resume
- NFR28: Scale degradation - graceful performance with 100+ projects

**Accessibility (P2 - Nice to Have)**
- NFR20: Keyboard navigation - all core actions accessible via keyboard
- NFR21: Color contrast - WCAG AA compliant (≥4.5:1 ratio)
- NFR22: Screen reader - ARIA labels on key elements

**AI Context Pipeline (P0 - Core Differentiator)**
- NFR29: Context payload to AI < 10KB summarized (not raw logs)
- NFR30: Behavioral inference accuracy - 80% on 5 golden test scenarios

### Additional Requirements

**From Architecture Document:**
- **Starter Template:** Tauri CLI Official Scaffolding (`create-tauri-app`) - React + TypeScript + Vite + Rust
- Infrastructure: Tauri v2 desktop framework with React frontend and Rust backend
- Rust dependencies: Tokio async runtime, SQLite (rusqlite with WAL mode), notify crate for file watching
- Frontend stack: shadcn/ui + Tailwind CSS, React 18+, TypeScript
- Git MVP: Shell commands (`git` CLI), migrate to git2-rs in 3-month
- Wayland GNOME: Requires Shell Extension for window title tracking (D-Bus communication)
- Three error state illustrations needed: offline-meditation, api-sharpening, ratelimit-resting
- Asset folder structure defined (public/fonts, public/icons, public/assets)
- Context Aggregator: Core intelligence component merging Git + DEVLOG + behavioral data
- Silent Observer integration via D-Bus (X11) and GNOME Shell Extension (Wayland)

**From UX Design Document:**
- Typography: Work Sans (UI), JetBrains Mono (code), Libre Baskerville (CTAs/philosophy)
- Fonts bundled offline-first (~300KB .woff2 files)
- 1-second loading screen with font preloading
- Progressive loading: local data <500ms, AI context <10s
- RoninLoader meditation → ready stance animation (with reduced motion fallback)
- Expandable ProjectCard pattern with inline AI context
- Ronin Oath display after first onboarding (not during installation)
- Status indicators: Active (🔥), Dormant (😴), Stuck (⚠️), Needs Attention (📌)
- Custom icons for v0.3 replacing emoji
- Keyboard shortcuts: Ctrl+Alt+R (global), Ctrl+K (search), Escape, Enter, Tab navigation
- Animation timing tokens defined (100ms fast, 200ms normal, 300ms slow)
- ContextPanel 4-state machine: idle → streaming → complete → error
- Git guardrails: warn if remote ahead, never auto-pull or force-push

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1-8 | Epic 2 | Dashboard project display and management |
| FR9-14, FR60, FR78 | Epic 3 | AI Consultant context recovery (git-only) |
| FR15-17 | Epic 4 | DEVLOG editor and sync |
| FR18-24, FR57-58, FR61 | Epic 5 | Git operations (commit/push) |
| FR25-29 | Epic 2 | Generic Folder Mode |
| FR30-35, FR77 | Epic 6 | Silent Observer tracking |
| FR36-41 | Epic 7 | System tray and notifications |
| FR42-47 | Epic 7 | Settings and configuration |
| FR48-50, FR59 | Epic 2 | First-time onboarding experience |
| FR51-54 | Epic 1, Epic 7 | Data persistence and error handling |
| FR55-56, FR62 | Epic 2 | Project filtering and search |
| FR63-64 | Epic 7 | Local telemetry |
| FR65-69 | Epic 6 | AI + Silent Observer integration |
| FR70-72 | Post-MVP | Proactive Intelligence |
| FR76 | Epic 6 | Privacy controls |

---

## Epic List

### Epic 1: Project Scaffolding & Foundation

**Goal:** Bootstrap the Ronin desktop application with Tauri v2, establish the design system, and create the technical foundation for all subsequent features.

**User Outcome:** Developer has a running Tauri application with proper project structure, fonts loaded, design tokens configured, and core infrastructure ready.

**FRs covered:** FR51-54 (data persistence foundation)

**NFRs addressed:**
- NFR3: App startup < 3s warm, < 6s cold
- NFR6: GUI memory < 200MB baseline
- NFR17: SQLite WAL mode for data integrity
- NFR25-26: Database consistency and startup integrity

**Key Deliverables:**
- Tauri v2 project initialized with React + TypeScript + Vite
- shadcn/ui + Tailwind CSS configured
- Typography system (Work Sans, JetBrains Mono, Libre Baskerville)
- Color tokens (Antique Brass, Friar Gray, Cararra, Cod Gray)
- SQLite database with WAL mode
- Basic app shell with routing

---

### Epic 2: Dashboard & First Launch Experience

**Goal:** Deliver the "Map Moment" - users see all their projects organized by health status, with complete first-time onboarding experience.

**User Outcome:** User can add project folders, see project health at a glance (Active/Dormant/Stuck), filter and search projects, and experience a welcoming first launch.

**FRs covered:** FR1-8, FR25-29, FR48-50, FR55-56, FR59, FR62

**Key Deliverables:**
- First-time empty state with "Add Project" wizard
- ProjectCard component with health indicators
- Dashboard grid with responsive layout
- Generic Folder Mode (non-Git projects)
- Project filtering and search
- Ronin Oath display (post-onboarding celebration)

**Known Issues & Notes (2025-12-18):**
> [!WARNING]
> The following gaps were identified during Story 2.3 code review:

1. **Missing "Add Project" Button in Dashboard Header** - Currently "Add Project" only exists in EmptyState (Story 2.1). Need to add button in Dashboard header when projects already exist. *Consider creating Story 2.10 or amending Story 2.1.*

2. **ProjectCard Expand Animation Not Smooth** - When card in first row expands, all cards below visibly shift down causing perceived "heaviness". *Consider CSS `layout` animation or flip technique in Story 2.5 (Dashboard Grid Layout).*

3. **Settings Back Button (FIXED)** - Hotfixed in AppShell.tsx: shows Home icon when on Settings page to navigate back to Dashboard.

---

### Epic 3: Context Recovery & AI Consultant

**Goal:** Deliver the "Aha! Moment" - user can ask "Where was I?" and receive AI-generated context within 10 seconds.

**User Outcome:** User clicks a dormant project and immediately understands where they left off, what they were working on, and suggested next steps - all based on git history.

**FRs covered:** FR9-14, FR60, FR78

**NFRs addressed:**
- NFR1: Context recovery < 10s total, first content < 2s
- NFR18: Graceful degradation when AI unavailable
- NFR29: Context payload < 10KB

**Key Deliverables:**
- OpenRouter API integration
- ContextPanel component with streaming
- Git history analysis (last 20 commits)
- AI attribution display ("Based on: ...")
- Error states (offline, API error, rate limit)
- RoninLoader meditation animation

---

### Epic 4: Context Vault & DEVLOG

**Goal:** Provide a structured place for capturing and viewing project notes that enhance AI context.

**User Outcome:** User can create, edit, and view DEVLOG.md files that sync with their project repository.

**FRs covered:** FR15-17

**Key Deliverables:**
- DEVLOG editor with markdown support
- File sync with project repository
- History/changes view
- Integration with AI context (when available)

---

### Epic 5: Git Operations

**Goal:** Enable frictionless git operations without leaving Ronin.

**User Outcome:** User can view git status, commit changes with a message, and push to remote - all in one click with safety guardrails.

**FRs covered:** FR18-24, FR57-58, FR61

**NFRs addressed:**
- NFR4: Git status refresh < 1 second
- NFR19: Git operations never cause data loss

**Key Deliverables:**
- Git status display (branch, uncommitted files, unpushed commits)
- One-click commit with message input
- One-click push with remote-ahead warning
- Graceful handling of edge cases (no remote, detached HEAD)
- Success/error feedback (toasts)

---

### Epic 6: Silent Observer & AI Integration

**Goal:** Enable passive activity tracking that enhances AI context with behavioral inference.

**User Outcome:** Ronin observes developer activity in the background and uses it to provide more accurate context recovery (90% accuracy with behavioral data vs 80% git-only).

**FRs covered:** FR30-35, FR65-69, FR76-77

**NFRs addressed:**
- NFR7: Silent Observer memory < 50MB RSS
- NFR12: All data stored locally only
- NFR30: Behavioral inference accuracy 80% on golden scenarios

**Key Deliverables:**
- Window title tracking (X11 via D-Bus)
- Wayland GNOME support (Shell Extension)
- File modification events (notify crate)
- Context Aggregator (merge git + DEVLOG + behavior)
- Stuck pattern detection
- Privacy controls (exclude apps/URLs)

---

### Epic 7: System Polish & Settings

**Goal:** Complete the desktop integration and provide user configuration options.

**User Outcome:** Ronin integrates seamlessly with the Linux desktop - system tray, global hotkey, notifications, and comprehensive settings.

**FRs covered:** FR36-47, FR51-52, FR63-64

**Key Deliverables:**
- System tray icon (AppIndicator for GNOME)
- Global hotkey (Ctrl+Alt+R)
- Desktop notifications
- Settings panel (API key, dormancy threshold, Silent Observer toggle)
- Update check on startup
- Local telemetry (opt-in)

---

## Post-MVP Features (Not in Current Scope)

The following FRs are scoped for post-MVP (3-12 month vision):

- **FR70-72:** Proactive Intelligence (stuck pattern suggestions, cross-project learning)
- **Cross-platform:** Windows (.exe), macOS (.dmg)
- **Team Mode:** Shared projects, context handoff
- **Advanced Silent Observer:** Browser extension, Wayland KDE, screen OCR

---

# Stories

## Epic 1: Project Scaffolding & Foundation

### Story 1.1: Initialize Tauri Project

As a **developer**,
I want **a properly configured Tauri v2 project with React, TypeScript, and Vite**,
So that **I have a solid foundation for building the Ronin desktop application**.

**Acceptance Criteria:**

**Given** a fresh development environment with Rust and Node.js installed
**When** I run the initialization commands
**Then** a Tauri v2 project is created with:
- React 18+ frontend with TypeScript (strict mode)
- Vite as the build tool
- Rust backend with Tokio async runtime
- Project structure follows Tauri best practices (`src/` for frontend, `src-tauri/` for backend)
**And** `npm run tauri dev` successfully launches the application
**And** the app window opens without errors
**And** hot module replacement (HMR) works for frontend changes

**Technical Notes:**
- Use `npm create tauri-app@latest` as specified in Architecture
- Install `@types/node` for path resolution
- Minimum window size: 800x600px (configured in tauri.conf.json)

---

### Story 1.2: Configure Design System

As a **developer**,
I want **shadcn/ui components, Tailwind CSS, and the Ronin typography/color system configured**,
So that **all subsequent UI development uses consistent, philosophy-aligned styling**.

**Acceptance Criteria:**

**Given** an initialized Tauri project from Story 1.1
**When** I configure the design system
**Then** the following are installed and working:
- Tailwind CSS with `@tailwindcss/vite` plugin
- shadcn/ui initialized with components available via `npx shadcn@latest add`
**And** CSS variables are defined for Ronin brand colors:
- `--ronin-primary: #CC785C` (Antique Brass)
- `--ronin-secondary: #828179` (Friar Gray)
- `--ronin-background: #F0EFEA` (Cararra)
- `--ronin-surface: #FFFFFF`
- `--ronin-text: #141413` (Cod Gray)
**And** font files are bundled in `public/fonts/`:
- Work Sans (Regular, Medium, SemiBold, Bold) .woff2
- JetBrains Mono (Regular, Medium) .woff2
- Libre Baskerville (Regular, Italic, Bold) .woff2
**And** fonts preload during a 1-second loading screen
**And** animation timing tokens are defined:
- `--animation-fast: 100ms`
- `--animation-normal: 200ms`
- `--animation-slow: 300ms`
**And** `prefers-reduced-motion` media query is respected

**Technical Notes:**
- Fonts total ~300KB, acceptable for desktop app
- Follow project_context.md typography rules exactly
- Use Libre Baskerville for CTAs and headings, Work Sans for body, JetBrains Mono for code

---

### Story 1.3: Set Up SQLite Database

As a **developer**,
I want **SQLite database with WAL mode initialized and basic schema ready**,
So that **the application can persist project data and settings reliably**.

**Acceptance Criteria:**

**Given** a Tauri project with Rust backend
**When** I initialize the database layer
**Then** SQLite database is created using `rusqlite` crate
**And** WAL (Write-Ahead Logging) mode is enabled for concurrent access
**And** database file is stored in app data directory (`~/.local/share/ronin/`)
**And** basic schema tables are created:
- `projects` (id, path, name, type, created_at, updated_at)
- `settings` (key, value)
**And** the database survives unexpected shutdown without data loss (NFR17)
**And** database integrity check runs on startup (NFR26)

**Technical Notes:**
- Use `rusqlite` with `bundled` feature for portability
- Implement migration system for future schema changes
- Memory budget: database operations should not exceed 50MB overhead

---

### Story 1.4: Create App Shell

As a **developer**,
I want **a basic app shell with routing and main window structure**,
So that **subsequent epics have a container to build features into**.

**Acceptance Criteria:**

**Given** a configured Tauri project with design system and database
**When** I create the app shell
**Then** the application has:
- Main window with minimum size 800x600px
- Basic routing structure (react-router or similar)
- Routes defined for: `/` (dashboard), `/settings` (placeholder)
- Empty dashboard placeholder with "Loading..." state
**And** the app starts in under 3 seconds (warm) / 6 seconds (cold) (NFR3)
**And** GUI memory stays under 200MB baseline (NFR6)
**And** the 1-second loading screen displays with ronin silhouette
**And** fonts are fully loaded before main UI renders (no FOIT)

**Technical Notes:**
- Use skeleton/shimmer effect for loading states
- Implement RoninLoader component (simple pulse for MVP, full animation in v0.3)
- Follow project_context.md for code style (imports, file naming)

---

## Epic 2: Dashboard & First Launch Experience

### Story 2.1: Empty State & Add Project Wizard

As a **first-time user**,
I want **a welcoming empty state and simple wizard to add my first project folder**,
So that **I can start using Ronin without any configuration friction**.

**Acceptance Criteria:**

**Given** the user launches Ronin for the first time with no projects
**When** the dashboard loads
**Then** a welcoming empty state is displayed with:
- Ronin illustration (Science SARU-inspired, "Your journey begins")
- Clear "Add Project" button (Libre Baskerville font, Antique Brass)
- No overwhelming configuration or setup steps
**And** clicking "Add Project" opens a native file browser dialog
**And** selecting a folder immediately adds it to the project list
**And** the dashboard refreshes to show the new project card
**And** total time from click to seeing project card is < 30 seconds

**Technical Notes:**
- Use Tauri's `dialog` API for native file picker
- Auto-detect if folder is Git project (check for `.git/` directory)
- Store project in SQLite database immediately

---

### Story 2.2: ProjectCard Component

As a **user**,
I want **to see each project as an expandable card showing key information**,
So that **I can quickly understand each project's status at a glance**.

**Acceptance Criteria:**

**Given** the user has projects tracked in Ronin
**When** the dashboard displays project cards
**Then** each ProjectCard shows:
- Project name (Libre Baskerville font)
- Health indicator badge (Active/Dormant/Stuck/Needs Attention)
- Days since last activity
- Project type indicator (Git icon or folder icon)
**And** collapsed cards show summary information
**And** clicking a card expands it with animation (200ms, ease-out)
**And** expanded card shows additional details (branch, uncommitted files for Git)
**And** cards are keyboard accessible (Tab to navigate, Enter to expand)
**And** focus indicator is visible (Antique Brass ring, ≥3px)

**Technical Notes:**
- Use shadcn/ui Collapsible component (via Radix)
- Follow ContextPanel state machine from UX spec (idle state for now)
- ARIA labels required for accessibility

---

### Story 2.3: Health Indicators & Status

As a **user**,
I want **visual indicators showing project health status**,
So that **I can immediately see which projects need attention**.

**Acceptance Criteria:**

**Given** a project is tracked in Ronin
**When** calculating health status
**Then** the system determines status based on:
- **Active (🔥):** Activity within last 7 days
- **Dormant (😴):** No activity for > 14 days
- **Needs Attention (📌):** Has uncommitted changes (Git projects only)
- **Stuck (⚠️):** Detected stuck pattern (reserved for Epic 6)
**And** status uses icon + color + text (NOT color-only for accessibility)
**And** status badge has WCAG AA color contrast (≥4.5:1)
**And** dormancy threshold is configurable (default: 14 days)

**Technical Notes:**
- Calculate from Git last commit date or file mtime for generic folders
- FR5: Sort projects by priority (stuck/attention first, then dormant, then active)
- Store dormancy threshold in settings table

---

### Story 2.4: Generic Folder Mode

As a **non-developer user (like Yosi)**,
I want **to track regular folders without Git**,
So that **I can manage my documents and projects without any technical knowledge**.

**Acceptance Criteria:**

**Given** a user adds a folder that is NOT a Git repository
**When** the folder is tracked
**Then** the project card displays:
- Folder name as project name
- File count in folder
- Last modified date of any file in folder
- Folder icon (not Git icon)
**And** health status is calculated from file modification dates
**And** no Git-specific features are shown (no branch, no commit button)
**And** the experience is indistinguishable from Git projects for basic viewing

**Technical Notes:**
- Use Rust's `std::fs` to scan folder metadata
- Cache file counts and mtimes to avoid repeated scans
- Update on file system events (notify crate from Epic 1)

---

### Story 2.5: Dashboard Grid Layout

As a **user**,
I want **a responsive dashboard grid that shows all my projects**,
So that **I can see my entire project landscape at once ("Map Moment")**.

**Acceptance Criteria:**

**Given** the user has multiple projects tracked
**When** viewing the dashboard
**Then** projects display in a responsive grid:
- 1 column on narrow windows (< 800px)
- 2 columns on medium windows (800-1200px)
- 3 columns on wide windows (> 1200px)
**And** cards have consistent sizing and spacing (16px gap)
**And** dashboard loads in < 500ms from SQLite (NFR2)
**And** lazy loading is implemented for 100+ projects (NFR28)
**And** whitespace is generous (Claude-inspired, not cramped)

**Technical Notes:**
- Use CSS Grid with Tailwind responsive classes
- Virtualize card rendering for large project lists
- Show skeleton loaders while data loads

---

### Story 2.6: Project Search & Filter

As a **user with many projects**,
I want **to search and filter my project list**,
So that **I can quickly find the project I'm looking for**.

**Acceptance Criteria:**

**Given** the user has multiple projects
**When** using search and filter features
**Then** a search bar is visible at the top of the dashboard
**And** typing in search bar filters projects by name in real-time (< 100ms per keystroke, NFR5)
**And** filter buttons allow filtering by status (All/Active/Dormant/Archived)
**And** `Ctrl+K` focuses the search bar (keyboard shortcut)
**And** `Escape` clears the search and resets filter to "All"
**And** empty search results show helpful message

**Technical Notes:**
- Prepare search bar for future command palette (v0.3)
- FR55: Archive feature (hide from main view, show in "Archived" filter)
- Store filter preference in session (not persisted)

---

### Story 2.7: Ronin Oath Celebration

As a **new user who just completed onboarding**,
I want **to see the Ronin Oath as a celebration of my first project**,
So that **I feel welcomed into the Ronin philosophy and community**.

**Acceptance Criteria:**

**Given** the user has just added their first project (first-time experience)
**When** the project card appears on the dashboard
**Then** after a brief pause (500ms), a modal displays:
- Ronin Oath text with typography treatment (special phrases in Libre Baskerville)
- Ink brush style ronin illustration
- "Continue" button to dismiss
**And** the oath is NOT shown during installation (no friction)
**And** the oath is permanently accessible via Settings → Philosophy/About
**And** modal respects `prefers-reduced-motion` (no animations if disabled)

**Technical Notes:**
- Store "oath_shown" flag in settings to prevent repeat display
- Use shadcn/ui Dialog component
- Illustration from Imagen via Asset Pipeline (PNG, not SVG)

---

### Story 2.8: Remove/Untrack Project

As a **user**,
I want **to remove a project from Ronin's tracking**,
So that **I can keep my dashboard clean and focused on active projects**.

**Acceptance Criteria:**

**Given** the user has a project tracked in Ronin
**When** the user selects "Remove" from the project card menu
**Then** a confirmation dialog appears: "Remove [Project Name] from Ronin?"
**And** confirmation explains: "Your files won't be deleted. Only tracking stops."
**And** clicking "Remove" removes the project from SQLite and dashboard
**And** clicking "Cancel" returns to dashboard without changes
**And** no project files or DEVLOG content is deleted (data safety)

**Technical Notes:**
- FR7: Remove projects from tracking
- Soft delete - data stays in DB for potential "undo" (v0.3)
- Silent Observer data for this project is also removed

---

### Story 2.9: Project Auto-Detection on First Launch

As a **first-time user**,
I want **Ronin to automatically discover my existing Git projects**,
So that **I don't have to manually add each project one by one**.

**Acceptance Criteria:**

**Given** the user launches Ronin for the first time
**When** the onboarding wizard runs
**Then** the system:
- Scans common project locations: `~/Projects`, `~/code`, `~/dev`, `~/repos`, `~/.local/share`
- Identifies folders containing `.git/` directories
- Displays list of discovered projects with checkboxes
- User can select which projects to track
**And** scanning completes in < 5 seconds
**And** user can skip and add projects manually later
**And** progress indicator shows during scan

**Technical Notes:**
- FR50: Auto-detect Git repositories
- Depth limit: 3 levels deep to avoid scanning entire filesystem
- Cache discovered paths for quick re-scan

---

## Epic 3: Context Recovery & AI Consultant

### Story 3.1: OpenRouter API Integration

As a **developer**,
I want **a Rust client for OpenRouter API with streaming support**,
So that **the AI Consultant can send context and receive responses efficiently**.

**Acceptance Criteria:**

**Given** the application has an OpenRouter API key configured
**When** sending a context request to the API
**Then** the client:
- Connects to OpenRouter API endpoint
- Sends requests with proper authentication headers
- Supports streaming responses (Server-Sent Events)
- Handles rate limiting gracefully (429 responses)
- Times out after 30 seconds with retry option
**And** API key is stored encrypted in SQLite (NFR11)
**And** no requests are sent if API key is not configured
**And** network errors are caught and reported clearly

**Technical Notes:**
- Reference: `docs/openrouterdocs` for API details
- Use `reqwest` crate with streaming support
- Context payload must be < 10KB (NFR29)
- Model selection: configurable, default to cost-effective option

---

### Story 3.2: Git History Analysis

As a **developer**,
I want **the system to analyze my Git history for context**,
So that **the AI has meaningful data to work with even without DEVLOG**.

**Acceptance Criteria:**

**Given** a Git project is tracked in Ronin
**When** preparing context for AI
**Then** the system extracts:
- Last 20 commit messages with dates
- File paths modified in those commits
- Current branch name
- List of uncommitted changes
- Time since last commit
**And** data is formatted as structured context (< 5KB for git portion)
**And** extraction completes in < 1 second (NFR4)
**And** handles edge cases: empty repo, no commits, detached HEAD

**Technical Notes:**
- Use `std::process::Command` with `git log`, `git status`, `git branch`
- Parse output into structured data
- This is git-only context (80% accuracy target per FR69)

---

### Story 3.3: ContextPanel Component

As a **user**,
I want **to see AI context appearing progressively in my project card**,
So that **I feel the system is working and get early information**.

**Acceptance Criteria:**

**Given** the user expands a project card
**When** AI context is being generated
**Then** the ContextPanel displays:
- RoninLoader meditation animation during loading
- "Analyzing your activity..." pulse text
- Local data appears immediately (< 500ms): branch, uncommitted files, last modified
- AI chunks stream progressively (NOT word-by-word, chunk-by-chunk)
- Ronin shifts to "ready stance" when complete
**And** the component follows 4-state machine: idle → streaming → complete → error
**And** respects `prefers-reduced-motion` (static fallback)
**And** screen reader announces content as it streams (ARIA live region)

**Technical Notes:**
- Use JetBrains Mono font for AI context output
- Animation timing: 2s meditation loop, 200ms transitions
- NFR1: First content < 2s, complete < 10s

---

### Story 3.4: AI Context Generation

As a **user**,
I want **to ask "Where was I?" and receive a helpful context summary**,
So that **I can resume work on dormant projects with confidence**.

**Acceptance Criteria:**

**Given** the user expands a project card (implicit "Where was I?")
**When** AI context is requested
**Then** the AI returns a context summary including:
- What the user was working on (file, feature, task)
- Where they left off (specific location/state)
- Why they might have stopped (stuck, completed phase, interrupted)
- Suggested next steps (actionable recommendation)
**And** response uses empathetic language (仁 Jin principle)
**And** suggestions are phrased as recommendations, not commands (勇 Yu principle)
**And** total response time < 10 seconds (NFR1)
**And** response is cached locally for offline access

**Technical Notes:**
- Prompt engineering: include philosophy guidelines in system prompt
- FR69: Works without DEVLOG (git-only at 80% accuracy)
- Cache last successful context in SQLite per project

---

### Story 3.5: AI Attribution Display

As a **user**,
I want **to see what data the AI based its context on**,
So that **I can trust and verify the AI's reasoning**.

**Acceptance Criteria:**

**Given** AI context generation is complete
**When** viewing the context summary
**Then** attribution is ALWAYS visible (not collapsed):
- Icons hint at data sources (🔀 commits, 📝 DEVLOG, 🔍 searches)
- Format: "Based on: 🔀 15 commits · 📝 DEVLOG"
- Clicking attribution expands to show full source details:
  - List of commits analyzed
  - DEVLOG excerpts used (if any)
  - Search patterns detected (reserved for Epic 6)
**And** attribution builds trust through transparency (FR13, FR78)
**And** sources are displayed in JetBrains Mono font

**Technical Notes:**
- Attribution is a KEY differentiator per UX spec
- Always visible, expandable for details
- This is what makes Ronin different from other tools

---

### Story 3.6: Error States & Offline Mode

As a **user**,
I want **clear feedback when AI is unavailable**,
So that **I understand what's happening and can still use Ronin productively**.

**Acceptance Criteria:**

**Given** AI context generation fails or is unavailable
**When** an error occurs
**Then** the appropriate error state is displayed:
- **No Internet:** Ronin meditating illustration + "Offline mode. Local tools ready."
- **API Error:** Ronin sharpening blade + "AI reconnecting... Your dashboard is ready."
- **Rate Limit:** Ronin resting + "AI resting. Try again in [X] seconds." + countdown
**And** local data (git status, branch, last modified) is always shown (fallback)
**And** "Retry" button is available for transient errors
**And** cached context from last successful request is displayed if available
**And** dashboard and other features continue working (NFR18 graceful degradation)

**Technical Notes:**
- Three distinct illustrations (not one generic error image)
- Store last successful context per project for offline access
- FR14: Clear messaging when AI unavailable

---

### Story 3.7: DEVLOG Analysis for AI Context

As a **developer who uses DEVLOG**,
I want **the AI to analyze my DEVLOG alongside git history**,
So that **my personal notes enhance the context recovery accuracy**.

**Acceptance Criteria:**

**Given** a project has a DEVLOG.md file
**When** AI context is being prepared
**Then** the system:
- Reads last 500 lines of DEVLOG.md (FR12)
- Extracts key information (todos, blockers, recent notes)
- Includes DEVLOG summary in AI payload
- Weights recent entries higher than older ones
**And** DEVLOG analysis adds to attribution: "📝 DEVLOG"
**And** AI accuracy improves from 80% (git-only) to 90% (git+DEVLOG)
**And** if no DEVLOG exists, git-only context is used (graceful fallback)

**Technical Notes:**
- FR12: Analyze last 500 lines of DEVLOG
- Parse markdown structure to extract meaningful sections
- DEVLOG is OPTIONAL - system works without it per philosophy

---

## Epic 4: Context Vault & DEVLOG

### UX Design Decisions (from Epic 3 Retrospective - 2025-12-21)

**Global DEVLOG Editor Approach:**
- **Floating Action Button**: Bottom-right corner, always visible across all views
- **Modal Editor**: Fixed size, centered, opens on button click or `Ctrl+Shift+D`
- **Project Selection**: Dropdown at top of modal to select which project's DEVLOG to edit
- **Editor Component**: CodeMirror 6 with markdown extensions
- **Keyboard Shortcuts**: Ctrl+B (bold), Ctrl+I (italic), standard markdown shortcuts
- **Append-Only Default**: New entries append to end of DEVLOG.md with auto-timestamp headers (e.g., `## 2025-12-21 12:30`)
- **Edit Mode Toggle**: Optional full-edit mode for modifying existing content
- **Auto-Save**: On modal close + every 30 seconds while typing
- **File Conflict Resolution**: Prompt user with [Reload] [Keep Mine] [Merge] if external changes detected
- **History View**: Separate "View History" button in modal header showing git log for DEVLOG.md

**Rationale:**
- Global accessibility enables quick thought capture without navigation
- Append-only prevents accidental content destruction
- Always-visible button reduces friction for context documentation
- CodeMirror provides professional editing experience with markdown support

---

### Story 4.1: DEVLOG Editor Component

**Dependencies:** None (first story in epic)  
**Integration Checkpoint:** After completion, validate modal opens/closes correctly and project dropdown populates before starting Story 4.2

As a **developer**,
I want **a global markdown editor accessible from anywhere in Ronin**,
So that **I can capture my thoughts and context instantly without navigation**.

**Acceptance Criteria:**

**Given** the user is anywhere in the Ronin application
**When** clicking the floating DEVLOG button (bottom-right) or pressing `Ctrl+Shift+D`
**Then** a modal editor opens with:
- Project selection dropdown at top
- CodeMirror 6 editor with markdown syntax highlighting
- Markdown keyboard shortcuts (Ctrl+B for bold, Ctrl+I for italic, etc.)
- JetBrains Mono font for code blocks
- Auto-timestamp header inserted at cursor position (e.g., `## 2025-12-21 12:30`)
**And** content appends to existing DEVLOG.md by default (append-only mode)
**And** "Edit Mode" toggle allows full DEVLOG editing when needed
**And** auto-save triggers on modal close + every 30 seconds while typing
**And** modal is keyboard accessible (Escape to close, Tab navigation)
**And** floating button remains visible across all views with proper z-index

**Technical Notes:**
- Use CodeMirror 6 with `@codemirror/lang-markdown` extension
- Floating button: `position: fixed; bottom: 24px; right: 24px; z-index: 50`
- Modal: Fixed size (e.g., 800x600px), centered with backdrop
- Store content in DEVLOG.md file in project root
- Append mode: Read existing file, add newline + timestamp + content

---

### Story 4.2: File Sync with Repository

**Dependencies:** Story 4.1 (requires modal editor and project selection working)  
**Integration Checkpoint:** After completion, validate file writes to correct project path and external changes are detected before starting Story 4.3

As a **developer**,
I want **DEVLOG content to sync with a file in my project with conflict detection**,
So that **my notes travel with my code and external edits are handled safely**.

**Acceptance Criteria:**

**Given** the user edits DEVLOG content in Ronin's modal editor
**When** the content is saved (auto-save or manual close)
**Then** the file `DEVLOG.md` is written to the project root directory
**And** file is created if it doesn't exist
**And** existing DEVLOG.md content is loaded when modal opens
**And** file changes made outside Ronin are detected via notify crate
**And** if file changed externally while modal open, prompt user with dialog:
  - "DEVLOG.md changed externally"
  - [Reload] - discard modal changes, load external version
  - [Keep Mine] - overwrite external changes with modal content
  - [Merge] - show both versions for manual merge (v0.3 feature)
**And** auto-save pauses when conflict detected until user resolves

**Technical Notes:**
- Use Rust's `std::fs` for file operations
- Watch for file changes using notify crate (already configured in Epic 1)
- Conflict detection: Compare file mtime before save vs after last load
- DEVLOG enhances AI context to 90% accuracy (vs 80% git-only)

---

### Story 4.3: DEVLOG History View

**Dependencies:** Story 4.2 (requires file sync working to have DEVLOG.md in git)  
**Integration Checkpoint:** After completion, validate full Epic 4 workflow: open modal → write content → save → view history → external edit → conflict resolution

As a **developer**,
I want **to see the history of my DEVLOG changes within the modal editor**,
So that **I can review my past context and thoughts without leaving the editor**.

**Acceptance Criteria:**

**Given** a project with DEVLOG.md tracked in Git
**When** clicking "View History" button in modal header
**Then** the editor switches to history view showing:
- List of commits that modified DEVLOG.md (newest first)
- Each entry shows: commit date, commit message, author
- Click a commit to view that version's content (read-only)
- "Back to Editor" button returns to editing mode
**And** history view is read-only (no editing of past versions)
**And** if not in Git, show message: "History available for Git projects only"
**And** if DEVLOG.md never committed, show: "No history yet - commit your DEVLOG to track changes"

**Technical Notes:**
- Use `git log -- DEVLOG.md` to get history
- Use `git show <commit>:DEVLOG.md` to get content at commit
- MVP: simple list view with read-only content display
- Diff view deferred to v0.3

---

## Epic 4.25: Multi-Provider API Support + AWS Lambda Demo Mode

**Goal:** Enable Ronin to work with multiple AI providers (OpenAI, Anthropic, Groq) and offer a demo mode for users without API keys.

**User Outcome:** Users can use their existing API keys from any major provider, or try Ronin without any setup via demo mode.

**Why This Epic:**
- **Distribution Blocker:** Ronin currently only supports OpenRouter, limiting adoption for users with existing Anthropic/OpenAI/Groq keys
- **User Friction:** Users must create OpenRouter account and add credits before using Ronin
- **Differentiation:** Demo mode (AWS Lambda with V's key) lowers barrier to entry for first-time users

**FRs covered:** FR42 (extended for multi-provider), FR14 (graceful degradation)

**NFRs addressed:**
- NFR11: API key storage - encrypted locally for multiple providers
- NFR18: Graceful degradation - works with any single provider configured

**Key Deliverables:**
- Unified API client using Vercel AI SDK Core
- Direct API clients for OpenAI, Anthropic, Groq
- Provider selection in Settings UI
- AWS Lambda serverless proxy for demo mode (rate-limited)
- Multi-key storage (encrypted, per-provider)

**Technical Research Source:** [technical-epic-4.25-multi-provider-api-research-2025-12-22.md](file:///home/v/project/ronin/docs/analysis/research/technical-epic-4.25-multi-provider-api-research-2025-12-22.md)

---

### Story 4.25.1: Unified API Client with Vercel AI SDK ✅ DRAFTED

**Dependencies:** Epic 4 complete (DEVLOG editor functional)
**Integration Checkpoint:** After completion, validate that context generation works with OpenAI and Anthropic API keys before starting Story 4.25.2
**Story File:** [4.25-1-unified-api-client-vercel-sdk.md](file:///home/v/project/ronin/docs/sprint-artifacts/4.25-1-unified-api-client-vercel-sdk.md)

As a **developer with an existing OpenAI or Anthropic API key**,
I want **to use my existing API key directly in Ronin**,
So that **I don't need to create an OpenRouter account or add credits**.

**Acceptance Criteria:**

**Given** the user has an OpenAI, Anthropic, or Groq API key
**When** configuring API settings in Ronin
**Then** the user can:
- Select provider from dropdown (OpenRouter, OpenAI, Anthropic, Groq)
- Enter their API key for the selected provider
- API key is stored encrypted per-provider (AES-256-GCM)
**And** context generation uses the Vercel AI SDK `streamText` interface
**And** all providers use consistent streaming response format
**And** existing OpenRouter integration continues to work (backward compatible)
**And** error handling differentiates between providers (rate limits, auth errors)

**Technical Notes:**
- Install: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic` packages
- Create `src/lib/ai/client.ts` with factory pattern for provider selection
- Migrate existing OpenRouter `fetch` calls to Vercel AI SDK
- Store selected provider in SQLite settings table
- Groq uses OpenAI SDK (fully compatible format)
- Vercel AI SDK standardizes error handling (retries, timeouts)

---

### Story 4.25.2: AWS Lambda Demo Mode Proxy

**Dependencies:** Story 4.25.1 (unified client must work with direct API keys first)
**Integration Checkpoint:** After completion, validate demo mode works end-to-end with rate limiting before starting Story 4.25.3

As a **first-time user without any API key**,
I want **to try Ronin's AI features without setup**,
So that **I can experience the value before committing to an API subscription**.

**Acceptance Criteria:**

**Given** the user has no API key configured
**When** using AI context features
**Then** the "Demo Mode" option is available in provider selection
**And** demo mode routes requests through AWS Lambda proxy
**And** Lambda proxy uses V's master API key (server-side, never exposed)
**And** rate limiting enforces fair usage:
  - Max 10 requests per hour per user
  - Max 4000 tokens per request
  - Clear messaging when limit reached
**And** demo mode clearly labeled in UI: "Demo Mode (limited)"
**And** prompt to upgrade: "For unlimited use, add your own API key"

**Technical Notes:**
- AWS SAM project in `serverless/demo-proxy` folder
- Lambda Function URL (not API Gateway) for simplicity and cost
- Use `awslambda.streamifyResponse()` for true streaming
- Store master API key in AWS Systems Manager Parameter Store
- Rate limiting via client fingerprint (hashed IP + user-agent)
- CORS configured for Ronin desktop app
- Cold start optimization: esbuild bundling, <1MB package

---

### Story 4.25.3: Provider Settings UI & Multi-Key Storage

**Dependencies:** Story 4.25.1 and 4.25.2 (both client and demo mode working)
**Integration Checkpoint:** After completion, validate full Epic 4.25 workflow: select provider → enter key → test connection → switch providers → demo mode fallback

As a **user managing multiple AI providers**,
I want **a clear settings interface for provider selection and key management**,
So that **I can easily switch between providers or use demo mode**.

**Acceptance Criteria:**

**Given** the user opens Settings → AI Provider
**When** viewing the provider settings
**Then** the interface shows:
- Provider dropdown: OpenRouter | OpenAI | Anthropic | Groq | Demo Mode
- API key input field (password masked, with show/hide toggle)
- "Test Connection" button for validation
- Connection status indicator (✓ Connected / ✗ Failed / ⚠ Demo Mode)
- Per-provider key storage (can have multiple keys saved)
**And** switching providers instantly applies (no restart)
**And** demo mode shows usage stats: "X/10 requests remaining this hour"
**And** "Add your own key" link navigates to provider signup pages
**And** all keys encrypted with AES-256-GCM (existing security pattern)

**Technical Notes:**
- Extend existing `settingsStore.ts` for multi-provider state
- New Rust commands: `get_api_keys`, `set_api_key`, `test_provider_connection`
- Store keys in SQLite: `api_keys` table (provider, encrypted_key, created_at)
- Provider selection stored in settings: `ai_provider` key
- Demo mode usage tracked locally (hourly reset)
- Deep links: openai.com, console.anthropic.com, console.groq.com

---

## Epic 4.5: Reasoning Infrastructure

**Goal:** Enable "Ronin-Thinking" mode - a multi-step, agentic AI that can analyze projects deeply with visible reasoning process.

**User Outcome:** Users can switch between "Ronin-Flash" (quick context, <10s) and "Ronin-Thinking" (deep analysis with visible thought process, <30s). Ronin-Thinking automatically applies Architect and Developer thinking based on context.

**Why This Epic:**
- **Deep Context Recovery:** "Project Resurrection" - help users recover mental context for dormant projects
- **Differentiation:** Visible reasoning process ("Reading package.json...", "Analyzing tests...") builds trust
- **Free by Default:** Uses free models (MiMo-V2-Flash 309B MoE) sufficiently powerful for reasoning loops
- **Simplified UX:** 2 modes (Flash/Thinking) instead of 4 personas - AI adapts thinking style automatically

**FRs covered:** FR9-13 (fully enhanced), FR65-68 (foundation - full implementation in Epic 6)

**NFRs addressed:**
- NFR1: Deep context generation <30s (multi-step reasoning)
- NFR29: Context payload optimized per reasoning step

**Key Deliverables:**
- Agent core with unified Ronin-Thinking system prompt (Architect + Developer principles merged)
- Tool implementations: `read_file`, `list_dir`, `git_status`, `git_log`
- "Project Resurrection" protocol for dormant project analysis
- Dedicated `/agent/:projectId` route with ThinkingIndicator and ProtocolViewer

**Technical Research Source:** [technical-epic-4.5-reasoning-infrastructure-research-2025-12-22.md](file:///home/v/project/ronin/docs/analysis/research/technical-epic-4.5-reasoning-infrastructure-research-2025-12-22.md)

**Design Decision:** Simplified 2-mode design per user feedback (2025-12-22). Ronin-Thinking covers Architect + Developer capabilities automatically instead of separate persona selector.

---

### Story 4.5.1: Agent Core & System Prompt

**Dependencies:** Epic 4.25 complete (Unified API Client working)
**Integration Checkpoint:** After completion, test agent logic independently via CLI/REPL before building UI

As a **developer**,
I want **the agent core with unified system prompt and tool definitions**,
So that **the reasoning infrastructure can be tested before building the UI**.

**Acceptance Criteria:**

**Given** Epic 4.25 UnifiedClient is working
**When** implementing the agent core
**Then** the following are implemented:
- `AgentMode` TypeScript type: `"ronin-flash" | "ronin-thinking"`
- `ReasoningProtocol` interface with: id, title, description, steps[]
- `ProtocolStep` interface with: id, title, instruction, requiredOutput
- **Unified Ronin-Thinking system prompt** containing:
  - Architect principles extracted from `_bmad/bmm/agents/architect.md`
  - Developer principles extracted from `_bmad/bmm/agents/dev.md`
  - Context-aware reasoning instructions (AI decides when to apply which thinking)
- `useReasoningStore` Zustand store tracking:
  - activeMode (default: "ronin-flash")
  - activeProtocol, currentStepId, stepHistory
**And** UnifiedClient extended with `maxSteps` support for reasoning loops
**And** Default model for Thinking mode: `xiaomi/mimo-v2-flash:free`
**And** Agent logic testable independently (without UI)

**Technical Notes:**
- Schemas in `src/lib/ai/schemas.ts`
- System prompt in `src/lib/ai/prompts/ronin-thinking.ts`
- Store in `src/stores/reasoningStore.ts`
- Extract principles from `_bmad` and merge into single prompt
- Test via Tauri command or temporary REPL

---

### Story 4.5.2: Tool Implementation & Protocol Execution

**Dependencies:** Story 4.5.1 (agent core must exist)
**Integration Checkpoint:** After completion, test "Project Resurrection" protocol execution via CLI before building UI

As a **developer**,
I want **tool implementations and protocol execution logic**,
So that **Ronin-Thinking can analyze projects autonomously**.

**Acceptance Criteria:**

**Given** Story 4.5.1 agent core is working
**When** implementing tools and protocol execution
**Then** the following tools are available to Ronin-Thinking:
- `read_file`: Read any file in project (returns content)
- `list_dir`: List directory contents (returns file/folder list)
- `git_status`: Get current git status (branch, uncommitted files)
- `git_log`: Get recent commits (last 20 commits with messages)
**And** "Project Resurrection" protocol is defined:
  1. Map project structure (`list_dir`)
  2. Read key files: package.json, README.md, DEVLOG.md
  3. Analyze git history (commits, uncommitted changes)
  4. Synthesize "Deep Status Report" with actionable next steps
**And** protocol execution uses Vercel AI SDK `maxSteps: 10`
**And** each tool call is logged for ThinkingIndicator integration
**And** protocol runs in <30 seconds for typical projects
**And** entire flow testable via CLI without UI

**Technical Notes:**
- Tools in `src/lib/ai/tools/` (read_file.ts, list_dir.ts, git_status.ts, git_log.ts)
- Protocol in `src/lib/ai/protocols/project-resurrection.ts`
- Leverage Tauri commands for file/git operations
- MVP: read-only tools, `write_file` restricted to `docs/`, `run_command` disabled
- Tool call logging for later UI integration

---

### Story 4.5.3: Agent Route & UI

**Dependencies:** Story 4.5.2 (tools and protocol execution must work)
**Integration Checkpoint:** After completion, validate full workflow: Dashboard → Expand card → Click "Deeper Analysis" → Agent View → Protocol execution → Report display

As a **user exploring a dormant project**,
I want **a dedicated agent view that shows the AI's thinking process**,
So that **I can see what the agent is analyzing and trust its reasoning**.

**Acceptance Criteria:**

**Given** the user expands a project card
**When** viewing the AI context from Flash mode
**Then** a "🧠 Deeper Analysis" button appears below the "Based on" attribution
**And** clicking the button navigates to `/agent/:projectId` route
**And** keyboard shortcut `Ctrl+Shift+A` also opens agent for expanded/selected project

**Given** the user is in the `/agent/:projectId` route
**When** the view loads
**Then** the interface shows:
- **ModeToggle** (2 options): [ ⚡ Flash ] [ 🧠 Thinking ]
- **Left panel:** Chat interface with message history
- **Right panel:** ProtocolViewer showing current plan/steps
- **ThinkingIndicator** showing real-time tool usage:
  - "📖 Reading package.json..."
  - "🔍 Analyzing git history..."
  - "📝 Synthesizing context..."

**Given** the user clicks "Analyze Project" in Agent View
**When** the Project Resurrection protocol executes
**Then** final report displays with:
  - "Last Active Area" (e.g., "Refactoring auth module")
  - "Current State" (e.g., "Tests failing in 3 files")
  - "Suggested Next Steps" (prioritized actions)
  - "Based on:" attribution list
**And** state persists when navigating away and back

**Technical Notes:**
- Route: `src/pages/Agent.tsx`
- Components: `ModeToggle`, `ThinkingIndicator`, `ProtocolViewer`, `AgentChat`
- Leverage tool call logs from Story 4.5.2 for ThinkingIndicator
- Use React Router for `/agent/:projectId` routing
- State preserved in reasoningStore (not lost on navigation)
- **Button placement in ProjectCard:**
  - Only visible when card is expanded (showing AI context)
  - Positioned below "Based on: ∞ X 📄 Y" attribution line
  - Full-width button with Antique Brass styling
  - Label: "🧠 Deeper Analysis" (clarifies this is deeper than Flash mode)
  - Above "Open in IDE" button if both present

---

## Epic 5: Git Operations

### Story 5.1: Git Status Display

As a **developer**,
I want **to see Git status information in my project card**,
So that **I know the current state without opening a terminal**.

**Acceptance Criteria:**

**Given** a Git project is tracked in Ronin
**When** viewing the expanded project card
**Then** Git status is displayed showing:
- Current branch name
- Number of uncommitted files (with file list on expand)
- Number of unpushed commits
- Time since last commit
**And** status refreshes in < 1 second (NFR4)
**And** icons are used alongside text (not color-only)
**And** non-Git projects show folder info instead (no Git section)

**Technical Notes:**
- Use `git status --porcelain`, `git rev-list`, `git branch`
- Cache status and refresh on focus or every 30 seconds
- FR57-58: Handle no remote and detached HEAD gracefully

---

### Story 5.2: One-Click Commit

As a **developer**,
I want **to commit my changes with a single click and message**,
So that **I can save my progress without switching to terminal**.

**Acceptance Criteria:**

**Given** a project has uncommitted changes
**When** the user clicks "Commit Changes"
**Then** an inline textarea appears for commit message
**And** placeholder suggests: "Describe your changes..."
**And** pressing Enter (or Cmd+Enter for multiline) executes commit
**And** `git commit -m "message"` is executed
**And** success toast appears: "✓ Changes committed"
**And** uncommitted files count updates to 0
**And** commit message is required (button disabled if empty)

**Technical Notes:**
- Use `std::process::Command` with `git commit`
- FR21: One-click commit flow
- Log commit action for telemetry (FR63)

---

### Story 5.3: One-Click Push with Guardrails

As a **developer**,
I want **to push my commits with safety guardrails**,
So that **I don't accidentally overwrite remote changes**.

**Acceptance Criteria:**

**Given** a project has unpushed commits
**When** the user clicks "Push"
**Then** the system:
1. Runs `git fetch origin` to check remote state
2. **If remote ahead:** Shows warning dialog with [Pull First] [Cancel] options
3. **If remote OK:** Executes `git push origin HEAD`
4. **If push fails:** Shows error toast with message and "Open terminal" suggestion
**And** success toast on push: "✓ Pushed to remote"
**And** unpushed commits count updates to 0
**And** Commit and Push are SEPARATE buttons (never combined)

**Technical Notes:**
- NFR19: Git operations never cause data loss
- Never auto-pull or force-push
- FR23-24: Warn if remote ahead, show error on failure

---

### Story 5.4: Edge Case Handling

As a **developer**,
I want **Git operations to handle edge cases gracefully**,
So that **I don't encounter confusing errors**.

**Acceptance Criteria:**

**Given** a Git project with unusual state
**When** the user views or interacts with Git features
**Then** the following edge cases are handled:
- **No remote configured:** Show "No remote" badge, hide Push button
- **Detached HEAD:** Show "Detached HEAD" warning, allow commit but warn about orphan
- **Empty repository:** Show "No commits yet" message
- **Merge conflict:** Show "Conflicts detected" warning, suggest terminal
**And** all edge cases have helpful, empathetic messages (仁 Jin)
**And** user can always fall back to terminal

**Technical Notes:**
- FR57-58: Graceful handling of no remote and detached HEAD
- Never leave user stuck - always provide path forward

---

### Story 5.5: Distinguish Git vs Folder Projects

As a **user**,
I want **to easily distinguish between Git projects and generic folders**,
So that **I know which features are available for each project type**.

**Acceptance Criteria:**

**Given** the user has both Git projects and generic folders tracked
**When** viewing the dashboard
**Then** each project card displays a clear type indicator:
- **Git Project:** Git branch icon + branch name visible
- **Generic Folder:** Folder icon + file count visible
**And** hovering shows tooltip: "Git repository" or "Folder (not Git)"
**And** Git-specific actions (Commit, Push) are only shown for Git projects
**And** both types show health indicators using same visual language

**Technical Notes:**
- FR8: Distinguish between Git projects and generic folders
- Icon + text indicator (not color-only for accessibility)
- Same card component, conditional sections based on type

---

### Story 5.6: v0.1.0-alpha Release Bundle

As a **project maintainer**,
I want **to bundle and publish Ronin for public testing**,
So that **users can download and try the v0.1.0-alpha release**.

**Acceptance Criteria:**

**Given** Epic 5 is complete and all tests pass
**When** a version tag (e.g., `v0.1.0-alpha`) is pushed to GitHub
**Then** GitHub Actions automatically:
- Builds `.deb` package for Debian/Ubuntu
- Builds `.AppImage` for universal Linux
- Creates GitHub Release with both artifacts
**And** README.md updated with installation instructions and download links
**And** CHANGELOG.md created with v0.1.0-alpha release notes
**And** LICENSE file added (MPL-2.0)
**And** pre-release checklist completed (tests pass, smoke test on Ubuntu)

**Technical Notes:**
- GitHub Actions workflow from `docs/DISTRIBUTION.md`
- CI builds on Ubuntu 22.04 for max glibc compatibility
- Tag format: `v0.1.0-alpha` (semver with pre-release identifier)
- Files to create/update: README.md, CHANGELOG.md, LICENSE, .github/workflows/release.yml

---

## Epic 6: Silent Observer & AI Integration

### Story 6.1: Window Title Tracking (X11)

As a **developer on X11**,
I want **Ronin to track which windows I'm using**,
So that **the AI can understand my work context**.

**Acceptance Criteria:**

**Given** Silent Observer is enabled and user is on X11
**When** the user switches between windows
**Then** Ronin logs:
- Window title
- Application name
- Timestamp
- Associated project (if window title matches project path)
**And** logging happens in background (no UI interruption)
**And** data is stored locally only in SQLite (NFR12)
**And** memory usage stays < 50MB RSS (NFR7)

**Technical Notes:**
- Use D-Bus to query X11 window manager
- Debounce rapid window switches (100ms)
- FR33: X11 support is MVP priority

---

### Story 6.2: Window Title Tracking (Wayland GNOME)

As a **developer on Wayland GNOME**,
I want **window title tracking to work via Shell Extension**,
So that **I get the same Silent Observer features as X11 users**.

**Acceptance Criteria:**

**Given** Silent Observer is enabled and user is on Wayland GNOME
**When** first launching Ronin
**Then** the app detects Wayland+GNOME environment
**And** if Shell Extension not installed, shows installation guide with:
- Link to extension download
- Step-by-step installation instructions
- "Skip for now" option (limited tracking mode)
**And** if Extension installed, window titles are received via D-Bus
**And** data is logged identically to X11 implementation

**Technical Notes:**
- FR34: Wayland GNOME support via Shell Extension
- Extension uses `Shell.WindowTracker` API
- Fallback: process name only if extension unavailable

---

### Story 6.3: File Modification Tracking

As a **developer**,
I want **Ronin to track which files I modify in my projects**,
So that **the AI understands my editing patterns**.

**Acceptance Criteria:**

**Given** Silent Observer is enabled
**When** files in tracked projects are modified
**Then** Ronin logs:
- File path (relative to project root)
- Modification timestamp
- Edit count per session
**And** tracking uses file system events (not polling)
**And** temporary files are ignored (.swp, ~, .tmp)
**And** batch writes to SQLite (every 5 seconds) to reduce I/O

**Technical Notes:**
- FR77: File modification events via notify crate
- Already set up in Epic 1 (Story 1.3)
- This story adds logging to SQLite for AI context

---

### Story 6.4: Context Aggregator

As a **developer**,
I want **all context sources merged intelligently for the AI**,
So that **I get accurate context recovery**.

**Acceptance Criteria:**

**Given** a project has Git history, DEVLOG, and behavioral data
**When** preparing AI context
**Then** the Context Aggregator:
- Merges Git commits, DEVLOG content, and behavioral logs
- Summarizes to < 10KB payload (NFR29)
- Detects stuck patterns: same file edited 5+ times without commit (FR66)
- Correlates temporal patterns: browser search → file edit within 5 min (FR67)
- Identifies frustration signals: rapid window switching, long pauses (FR68)
**And** behavioral data enhances accuracy from 80% to 90% (FR69)
**And** attribution shows all sources used

**Technical Notes:**
- This is the CORE intelligence component
- Requires efficient in-memory data structures
- Golden test: 5 scenarios with 80% accuracy (NFR30)

---

### Story 6.5: Privacy Controls

As a **privacy-conscious user**,
I want **to control what the Silent Observer tracks**,
So that **I feel safe using Ronin**.

**Acceptance Criteria:**

**Given** the user accesses Silent Observer settings
**When** configuring privacy
**Then** the user can:
- Enable/disable Silent Observer entirely (FR32, FR45)
- Exclude specific applications by name
- Exclude specific URLs/domains from browser tracking
- View all collected data
- Delete all Silent Observer data with one click (NFR13)
**And** settings sync immediately (no restart required)
**And** excluded items are never logged

**Technical Notes:**
- FR76: Privacy controls for excluding apps/URLs
- 義 (Gi) principle: Honor-based, opt-in, data stays local
- Make privacy the default - Observer is opt-in for new users

---

## Epic 7: System Polish & Settings

### Story 7.1: System Tray Icon

As a **desktop user**,
I want **Ronin to live in my system tray when minimized**,
So that **it stays accessible without cluttering my taskbar**.

**Acceptance Criteria:**

**Given** the user minimizes Ronin or closes the main window
**When** the app is in tray mode
**Then** a Ronin icon appears in the system tray
**And** left-click opens/focuses the main window
**And** right-click shows context menu: [Open] [Settings] [Quit]
**And** tray icon indicates status (idle, syncing, attention needed)
**And** on GNOME Wayland, if tray unavailable, show setup guide for AppIndicator extension

**Technical Notes:**
- FR36: System tray when minimized
- Use Tauri's tray plugin
- AppIndicator required for GNOME

---

### Story 7.2: Global Hotkey

As a **power user**,
I want **a global hotkey to open Ronin from anywhere**,
So that **I can access my projects without switching windows**.

**Acceptance Criteria:**

**Given** Ronin is running (foreground or background)
**When** the user presses the global hotkey
**Then** the Ronin main window opens and focuses
**And** default hotkey is `Ctrl+Alt+R`
**And** hotkey is configurable in Settings
**And** if hotkey conflicts with another app, show "Conflict detected" on registration failure
**And** hotkey works across all Linux desktop environments

**Technical Notes:**
- FR37-38: Global hotkey with configuration
- Use Tauri's global shortcut API
- Avoid `Super` key (conflicts with DE shortcuts)

---

### Story 7.3: Desktop Notifications

As a **user**,
I want **non-intrusive notifications for important events**,
So that **I stay informed without being interrupted**.

**Acceptance Criteria:**

**Given** notifications are enabled in settings
**When** a notable event occurs
**Then** a desktop notification is shown for:
- "Project X needs attention" (dormant project with uncommitted changes)
- "Update available" (new version detected)
**And** notifications use calm tone (no urgency, 仁 Jin principle)
**And** clicking notification opens Ronin to relevant view
**And** notifications can be toggled off in Settings (FR47)

**Technical Notes:**
- FR39-41: Notifications for attention and updates
- Use Tauri's notification plugin
- Limit to 1 notification per hour per project (no spam)

---

### Story 7.4: Settings Panel

As a **user**,
I want **a comprehensive settings panel**,
So that **I can configure Ronin to my preferences**.

**Acceptance Criteria:**

**Given** the user navigates to Settings
**When** viewing the settings panel
**Then** the following settings are configurable:
- **API:** OpenRouter API key (encrypted storage)
- **Projects:** Default scan locations, dormancy threshold (days)
- **Silent Observer:** Enable/disable, excluded apps/URLs
- **System:** Startup on boot, global hotkey, notifications
- **Privacy:** View/delete all data
- **About:** Version, Philosophy/Ronin Oath, check for updates
**And** settings persist across sessions (SQLite)
**And** changes apply immediately (no restart)

**Technical Notes:**
- FR42-47: Settings configuration
- NFR11: Encrypted API key storage
- Use shadcn/ui form components

---

### Story 7.5: Update Check & Notification

As a **user**,
I want **to know when a new version of Ronin is available**,
So that **I can stay up to date with improvements**.

**Acceptance Criteria:**

**Given** Ronin starts up
**When** checking for updates (non-blocking)
**Then** the system:
- Checks GitHub releases API for latest version
- Compares with current version
- If new version available: shows notification badge in UI
- Clicking badge opens changelog/download page in browser
**And** update check happens at most once per day
**And** no auto-download or auto-update (user decides)

**Technical Notes:**
- FR40-41: Update check on startup
- No forced updates - user stays in control
- Store last check time to avoid spam

---

### Story 7.6: Local Telemetry (Opt-in)

As a **developer (V)**,
I want **local-only metrics to validate success criteria**,
So that **I can measure if Ronin is achieving its goals**.

**Acceptance Criteria:**

**Given** the user opts in to telemetry (or is V testing)
**When** using Ronin
**Then** the following metrics are logged locally:
- Context recovery time (click → AI response complete)
- Resurrection events (project opened → commit within 24h)
- Session duration
- Projects tracked count
**And** data is stored in SQLite (local only, never sent anywhere)
**And** metrics are viewable in Settings → About → Usage Stats
**And** telemetry is OFF by default (NFR14)

**Technical Notes:**
- FR63-64: Local telemetry for success metrics
- This validates PRD success criteria
- No cloud analytics - philosophy 義 (Gi)

---

### Story 7.7: Startup on Boot Toggle

As a **power user**,
I want **Ronin to optionally start automatically when I log in**,
So that **my project dashboard is always ready when I need it**.

**Acceptance Criteria:**

**Given** the user accesses System Settings
**When** toggling "Start Ronin on login"
**Then** the system:
- **If enabled:** Creates autostart entry for user session
- **If disabled:** Removes autostart entry
**And** Ronin starts minimized to system tray (not fullscreen)
**And** setting persists across sessions
**And** works on GNOME, KDE, and other XDG-compliant desktop environments

**Technical Notes:**
- FR46: Toggle startup on boot
- Use XDG autostart: `~/.config/autostart/ronin.desktop`
- Start with `--minimized` flag for tray-only launch
- Respect user choice - disabled by default

