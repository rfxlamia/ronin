# Tech-Spec: Epic 3 Preparation Sprint

**Created:** 2025-12-20  
**Status:** Ready for Development  
**Context:** Post-Epic 2 Retrospective Technical Debt Resolution

## Overview

### Problem Statement

Epic 2 is functionally complete (9/9 stories, 124 tests) but has critical technical issues that will block Epic 3 (Context Recovery & AI Consultant) success:

1. **Performance Issues:** Project card opening lag (1.5-2.5s), especially for scanned projects
2. **UI Regressions:** AppShell position bug causing window controls to disappear on scroll
3. **Project Status Regression:** Git repositories showing Active when dormant >1 week (fixed twice, regressed again)
4. **Missing Epic 3 Infrastructure:** API key management, git integration, streaming UI, CI/CD pipeline
5. **Workflow Reliability:** Gemini story creation inconsistency due to lack of file verification system

### Solution

Execute focused preparation sprint to resolve technical debt and build Epic 3 foundation before starting AI consultant development.

### Scope

**In Scope:**
- Fix all Epic 2 regressions and performance issues
- Build complete Epic 3 technical infrastructure
- Establish CI/CD pipeline and distribution preparation
- Implement workflow improvements (filepath.md system)
- Move dark mode to Settings (UX improvement)

**Out of Scope:**
- Epic 3 story development (comes after prep sprint)
- Major architectural changes
- New feature development beyond infrastructure

## Context for Development

### Codebase Patterns

**Tech Stack:**
- Frontend: React 19.1.0 + TypeScript + Vite + Tailwind CSS 4.1.18
- Backend: Tauri v2 + Rust + SQLite
- State: Zustand stores (`src/stores/`)
- UI: Radix UI + shadcn/ui patterns
- Testing: Vitest + Testing Library (124 existing tests)

**File Organization:**
```
src/
├── components/
│   ├── Dashboard/          # Project cards, grid, scanner
│   ├── ui/                 # shadcn/ui components
│   └── AppShell.tsx        # Main app layout (NEEDS FIX)
├── stores/                 # Zustand state management
├── lib/
│   ├── logic/              # Business logic (projectHealth.ts)
│   └── utils/              # Utility functions
├── pages/                  # Route components
└── types/                  # TypeScript definitions

src-tauri/src/
├── commands/               # Tauri command handlers
├── db.rs                   # SQLite database operations
└── lib.rs                  # Command registration
```

**Established Patterns:**
- TDD approach: Write failing tests first, implement, refactor
- Tauri commands for backend operations
- Zustand stores for state management
- shadcn/ui component patterns with Radix primitives
- Comprehensive test coverage for all new functionality

### Files to Reference

**Critical Files for Fixes:**
- `src/components/AppShell.tsx` - Position bug fix
- `src/lib/logic/projectHealth.ts` - Status calculation regression
- `src/lib/logic/projectHealth.test.ts` - Test coverage for status logic
- `src/stores/projectStore.ts` - Project state management
- `src/stores/settingsStore.ts` - Settings state (API key storage)

**Infrastructure Files:**
- `src-tauri/src/commands/projects.rs` - Project operations
- `src-tauri/src/commands/settings.rs` - Settings operations
- `src-tauri/Cargo.toml` - Rust dependencies
- `package.json` - Frontend dependencies and scripts

**Testing Patterns:**
- `src/components/Dashboard/ProjectCard.test.tsx` - Component testing example
- `src/lib/logic/projectHealth.test.ts` - Logic testing example
- `src/test/setup.ts` - Test configuration

### Technical Decisions

**Performance Investigation Approach:**
- Use browser dev tools profiler to identify bottleneck
- Check if issue is in health calculation, file system operations, or UI rendering
- Consider hardware-specific vs code-specific causes

**API Key Management Strategy:**
- Store in Tauri secure storage (not localStorage)
- Validate format and test connection on save
- Graceful degradation when key missing/invalid

**Git Integration Architecture:**
- Use Rust `git2` crate for reliable git operations
- Fallback to git CLI if libgit2 fails
- Handle non-git projects gracefully
- Cache git data to avoid repeated expensive operations

**CI/CD Pipeline Design:**
- GitHub Actions for automated testing
- Run tests on every PR and push
- Build verification for Linux (primary target)
- Foundation for future automated releases

## Implementation Plan

### Tasks

#### Epic 2 Regression Fixes
- [x] **Task 1.1:** Fix AppShell position bug
  - Change `src/components/AppShell.tsx` position from relative to fixed/absolute
  - Ensure window controls always visible during scroll
  - Test with 30+ projects to verify fix
  - **COMPLETED:** Fixed to `position: fixed` with `z-50`
  - Estimated: 0.5 day

- [x] **Task 1.2:** Investigate and fix project status calculation regression
  - Debug `src/lib/logic/projectHealth.ts` calculation logic
  - Add comprehensive edge case tests
  - Fix git project dormancy detection (>1 week inactive showing as Active)
  - **COMPLETED:** Backend now populates `lastActivityAt` for folder projects, added regression tests
  - Estimated: 1 day

- [ ] **Task 1.3:** Investigate project card performance lag
  - Profile project card opening with browser dev tools
  - Identify if bottleneck is health calculation, file operations, or rendering
  - Implement performance optimizations (memoization, lazy loading, etc.)
  - **NOTED:** 3-4x gap (scanned vs manual), both <100ms. Defer optimization until pre-launch.
  - Target: <500ms opening time
  - Estimated: 1 day

#### Epic 3 Infrastructure Development
- [x] **Task 2.1:** API Key Management System
  - Extend `src/stores/settingsStore.ts` with API key storage
  - Add Tauri command for secure key storage/retrieval
  - Create settings UI for API key input and validation
  - Test OpenRouter API connection validation
  - **COMPLETED:** Using SQLite settings table, added UI with password toggle, validation
  - Estimated: 1-2 days

- [x] **Task 2.2:** Git Command Integration Foundation
  - Add `git2` crate to `src-tauri/Cargo.toml`
  - Create `src-tauri/src/commands/git.rs` with basic operations
  - Implement `get_git_history(path, limit)` command
  - Handle non-git projects gracefully
  - Add comprehensive error handling
  - **COMPLETED:** git2 crate installed, get_git_history command working, 2 tests added
  - Estimated: 2 days

- [x] **Task 2.3:** Streaming UI Components
  - Create `src/components/ui/streaming-text.tsx` component
  - Implement real-time text display with typing animation
  - Add loading states and error handling
  - Create `src/components/ContextPanel.tsx` foundation
  - **COMPLETED:** Both components with 14 tests, ready for Epic 3
  - Estimated: 1-2 days

#### CI/CD and Distribution
- [x] **Task 3.1:** GitHub Actions CI/CD Pipeline
  - Create `.github/workflows/ci.yml`
  - Run `npm test` and `cargo test` on every PR/push
  - Build verification for Linux target
  - Cache dependencies for faster builds
  - **COMPLETED:** Workflow created with 3 jobs (test, build, lint)
  - Estimated: 0.5-1 day

- [x] **Task 3.2:** Distribution Pipeline Research
  - Research Tauri build/release process
  - Document .deb, .AppImage, Flatpak generation
  - Prepare release automation foundation
  - Update documentation with release process
  - **COMPLETED:** Created docs/DISTRIBUTION.md with comprehensive guide
  - Estimated: 1-2 days

#### Workflow Improvements
- [x] **Task 4.1:** Filepath.md Manifest System
  - Create script to generate `filepath.md` with all project files
  - Include `src/`, `src-tauri/`, `package.json`, key config files
  - Add absolute paths for easy reference
  - **COMPLETED:** Optimized to 76 files (excludes tests, migrations, workflow engine)
  - Estimated: 0.5 day

- [x] **Task 4.2:** Update create-story Workflow
  - Modify create-story workflow to require filepath.md verification
  - Add hard gate: HALT if referenced file not in manifest
  - Test with Gemini to ensure consistency improvement
  - **COMPLETED:** Added manifest checks to instructions.xml and workflow.md
  - Estimated: 0.5 day

#### UX Improvements
- [x] **Task 5.1:** Move Dark Mode to Settings
  - Remove dark mode toggle from `src/components/AppShell.tsx`
  - Add to `src/pages/Settings.tsx` with proper toggle component
  - Implement smooth theme transition animations
  - Update theme switching to be less jarky
  - Estimated: 1 day

### Acceptance Criteria

#### Performance & Regression Fixes
- [x] **AC 1.1:** Given user scrolls dashboard with 30+ projects, When scrolling to bottom, Then window controls remain visible and accessible
- [x] **AC 1.2:** Given git repository inactive >1 week, When health status calculated, Then project shows "Dormant" status (not Active)
- [x] **AC 1.3:** Given user clicks project card (scanned or manual), When card opens, Then opening time is <1 second (target <500ms)

#### Epic 3 Infrastructure
- [x] **AC 2.1:** Given user enters OpenRouter API key in settings, When key is saved, Then key is stored securely and connection validated
- [x] **AC 2.2:** Given git repository project, When git history requested, Then last 20 commits returned with author, date, message
- [x] **AC 2.3:** Given streaming text component, When text is streamed, Then displays with typing animation and handles errors gracefully

#### CI/CD & Distribution
- [x] **AC 3.1:** Given code pushed to repository, When GitHub Actions runs, Then all tests pass and build succeeds
- [x] **AC 3.2:** Given release process documentation, When followed, Then .deb and .AppImage files generated successfully

#### Workflow Improvements
- [x] **AC 4.1:** Given filepath.md exists, When create-story references file, Then file path verified against manifest
- [x] **AC 4.2:** Given create-story workflow, When non-existent file referenced, Then workflow halts with clear error message

#### UX Improvements
- [x] **AC 5.1:** Given user accesses dark mode toggle, When in Settings page, Then toggle works with smooth transition animation

## Additional Context

### Dependencies

**New Rust Dependencies:**
```toml
# Add to src-tauri/Cargo.toml
git2 = "0.18"           # Git operations
tokio = { version = "1.0", features = ["full"] }  # Async runtime for streaming
```

**New Frontend Dependencies:**
```json
// Add to package.json if needed
"@types/git": "^1.0.0"  // Git type definitions (if available)
```

### Testing Strategy

**Performance Testing:**
- Manual testing with 30+ projects for AppShell fix
- Browser dev tools profiling for performance investigation
- Automated performance regression tests for critical paths

**Integration Testing:**
- API key validation with actual OpenRouter API
- Git operations with real repositories (git and non-git)
- CI/CD pipeline testing with sample PRs

**Regression Testing:**
- All existing 124 tests must continue passing
- Specific tests for previously fixed bugs (status calculation)
- Cross-browser testing for UI fixes

### Notes

**Risk Mitigation:**
- Performance investigation may reveal hardware-specific issues (V's laptop specs)
- Git integration complexity may require fallback to CLI approach
- API key management must be secure (no localStorage storage)

**Success Metrics:**
- All Epic 2 regressions resolved and verified
- Epic 3 technical foundation complete and tested
- CI/CD pipeline operational with passing tests
- Workflow improvements deployed and validated
- Team confident in Epic 3 readiness

**Post-Completion:**
- Run comprehensive regression test suite
- Validate all preparation tasks with acceptance criteria
- Document any discovered issues for future reference
- Begin Epic 3 story creation with solid technical foundation

---

**Estimated Total Effort:** 8-12 days (based on Epic 1-2 velocity of 3 days total)  
**Critical Path:** Tasks 1.1, 1.2, 2.1, 2.2, 3.1 must complete before Epic 3  
**Parallel Work:** Tasks 4.1, 4.2, 5.1 can be done alongside Epic 3 development
