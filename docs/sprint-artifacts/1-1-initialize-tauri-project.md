# Story 1.1: Initialize Tauri Project

Status: ready-for-dev

## Story

As a **developer**,
I want **a properly configured Tauri v2 project with React, TypeScript, and Vite**,
So that **I have a solid foundation for building the Ronin desktop application**.

## Acceptance Criteria

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

## Tasks / Subtasks

- [ ] Initialize Tauri project using official scaffolding (AC: 1-7)
  - [ ] Run `npm create tauri-app@latest` with interactive prompts
  - [ ] Select: Project name = `ronin`, Framework = React, TypeScript = Yes
  - [ ] Verify project structure created correctly
- [ ] Configure TypeScript strict mode (AC: 1)
  - [ ] Edit `tsconfig.json` to enable strict mode
  - [ ] Add `@types/node` for path resolution
- [ ] Set minimum window size in Tauri config (AC: Technical Notes)
  - [ ] Edit `src-tauri/tauri.conf.json` → windows → minWidth: 800, minHeight: 600
- [ ] Verify development server launches (AC: 4-7)
  - [ ] Run `npm run tauri dev`
  - [ ] Confirm app window opens without console errors
  - [ ] Test HMR by editing a React component
  - [ ] Verify changes appear without full reload

## Dev Notes

### Technical Requirements from Architecture

**Starter Template:** Tauri CLI Official Scaffolding (`create-tauri-app`)
- **Version:** Tauri v2 (stable, released 2024)
- **Official docs:** https://v2.tauri.app/start/create-project/
- **Initialization command:**
  ```bash
  npm create tauri-app@latest

  # Interactive prompts:
  # - Project name: ronin
  # - Framework: React
  # - Add TypeScript: Yes
  # - Package manager: npm (or pnpm/yarn if preferred)
  # - UI flavor: Vite
  ```

**Why this template:**
- ✅ Official Tauri v2 support (maintained by Tauri team)
- ✅ Vite's fast HMR and optimized builds
- ✅ React 18+ with TypeScript out of the box
- ✅ Proper project structure for desktop apps
- ✅ Production-ready build configuration

**Project Structure (from Architecture - Section "Starter Template"):**
```
ronin/
├── src/                 # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── src-tauri/          # Rust backend
│   ├── src/
│   │   └── main.rs     # Tauri app entry point
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Architecture Compliance

**From Architecture Document - Technology Stack:**
- **Desktop Framework:** Tauri v2 (Rust + React) ✅
- **Frontend:** React 18+, TypeScript ✅
- **Build Tool:** Vite ✅
- **Backend:** Rust (stable), Tokio async runtime ✅

**Configuration Requirements:**
1. **TypeScript Strict Mode** (from Project Context):
   - Edit `tsconfig.json` → `"strict": true`
   - Ensures type safety from the start

2. **Minimum Window Size** (from Architecture - UX Constraints):
   - Edit `src-tauri/tauri.conf.json`:
   ```json
   {
     "tauri": {
       "windows": [{
         "minWidth": 800,
         "minHeight": 600,
         "title": "Ronin"
       }]
     }
   }
   ```

3. **Tokio Async Runtime** (from Architecture):
   - Default in Tauri v2, verify in `src-tauri/Cargo.toml`:
   ```toml
   [dependencies]
   tauri = { version = "2.x", features = [...] }
   tokio = { version = "1", features = ["full"] }
   ```

### Performance Requirements

**From NFR3 (Architecture):**
- App startup < 3s (warm), < 6s (cold)
- **Implementation note:** This is measured AFTER full setup (will validate in Story 1.4: Create App Shell)
- For this story, just verify basic launch works

**From NFR6 (Architecture):**
- GUI memory < 200MB RSS baseline
- **Implementation note:** Not applicable yet (empty app will be well under budget)

### Library/Framework Requirements

**Core Dependencies (Auto-installed by create-tauri-app):**
- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `typescript` >= 5.0.0
- `vite` >= 5.0.0
- `@tauri-apps/api` (Tauri frontend bindings)
- `@tauri-apps/cli` (build tooling)

**Additional Required (install manually):**
- `@types/node` - for Node.js path resolution in TypeScript

### File Structure Requirements

**Critical files that MUST exist after initialization:**
1. `package.json` - frontend dependencies
2. `tsconfig.json` - TypeScript configuration
3. `vite.config.ts` - Vite bundler config
4. `src/main.tsx` - React entry point
5. `src/App.tsx` - root React component
6. `src-tauri/Cargo.toml` - Rust dependencies
7. `src-tauri/tauri.conf.json` - Tauri app config
8. `src-tauri/src/main.rs` - Rust backend entry

### Testing Requirements

**Validation Steps:**
1. **Project initializes without errors**
   - No warnings during `npm create tauri-app`
   - All files created successfully

2. **Development server launches**
   - `npm run tauri dev` succeeds
   - App window opens (800x600 minimum size)
   - No console errors in terminal or browser DevTools

3. **Hot Module Replacement works**
   - Edit `src/App.tsx` → change text
   - Verify text updates in app WITHOUT full page reload
   - Confirms Vite HMR is functioning

4. **TypeScript strict mode enabled**
   - Run `npm run check` or `tsc --noEmit`
   - No type errors (empty project should have none)

**No automated tests needed for this story** - manual verification sufficient for project initialization.

### Previous Story Intelligence

**First story in epic** - no previous story learnings available.

This is the foundational story that establishes the entire tech stack. Every subsequent story depends on this setup.

### Latest Technical Information

**Tauri v2 Status (2025-12-18):**
- **Current Stable:** Tauri 2.1.x (latest minor version)
- **Breaking changes from v1:** Project structure unchanged, APIs mostly backward compatible
- **Official scaffolding:** `create-tauri-app` is the recommended approach
- **Documentation:** https://v2.tauri.app/

**React 18+ (2025-12-18):**
- **Current Stable:** React 18.3.x
- **Key features:**
  - Concurrent rendering (automatic batching)
  - Suspense for data fetching (experimental)
  - Server Components (not applicable for desktop apps)
- **For Ronin:** Standard client-side rendering, no SSR/SSG needed

**Vite (2025-12-18):**
- **Current Stable:** Vite 5.x
- **Performance:** Sub-second HMR, optimized builds
- **Tauri integration:** Official `@tauri-apps/vite-plugin` for asset handling

### Project Context Reference

**From `docs/project_context.md`:**
- **Technology Stack:** Tauri v2, React 18+, TypeScript strict mode ✅
- **UX Rules:** NOT applicable yet (Story 1.2 handles design system)
- **Architecture Rules:** Memory budgets NOT enforced yet (Story 1.4 validates performance)
- **Philosophy Rules:** NOT applicable to scaffolding step
- **Code Style:** File naming conventions will apply starting Story 1.4

### Potential Pitfalls & Solutions

**Common Issue 1: Rust not installed**
- **Error:** `cargo: command not found`
- **Solution:** Install Rust via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Verify:** `rustc --version` should show 1.70+

**Common Issue 2: Node.js version mismatch**
- **Error:** `npm create tauri-app` fails with compatibility warning
- **Solution:** Use Node.js 18 LTS or higher (check with `node --version`)
- **Fix:** Install via nvm: `nvm install 18 && nvm use 18`

**Common Issue 3: tauri.conf.json syntax error**
- **Error:** App fails to launch after manual config edits
- **Solution:** Validate JSON syntax with `npm run tauri info`
- **Prevention:** Use VS Code JSON schema validation

**Common Issue 4: TypeScript strict mode errors in starter**
- **Error:** Type errors appear after enabling strict mode
- **Solution:** Tauri's official template is compatible with strict mode
- **If errors:** Check for manual edits, revert to generated code

### Completion Status

**Story Status:** ready-for-dev

**Completion Criteria:**
- ✅ Story file created with comprehensive context
- ✅ Architecture requirements extracted and documented
- ✅ Technical specifications provided (commands, config, structure)
- ✅ Testing validation steps defined
- ✅ Common pitfalls documented with solutions

**Next Steps:**
1. Dev agent runs `dev-story` to implement this story
2. Dev creates project using `npm create tauri-app@latest`
3. Dev configures TypeScript strict mode and window size
4. Dev verifies HMR and launches app successfully
5. Dev marks story as `done` via code-review workflow

## Dev Agent Record

### Context Reference

Story Context: docs/sprint-artifacts/1-1-initialize-tauri-project.md

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

_To be added by dev agent during implementation_

### Completion Notes List

_To be added by dev agent during implementation_

### File List

_Expected files to be created:_
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
