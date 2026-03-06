# Cross-Platform Migration Design

**Date:** 2026-03-07
**Status:** Approved
**Readiness Score:** 5/10 (pre-migration)

## Context

Ronin is a Tauri v2 desktop app currently developed and optimized for Linux only. The goal is to produce production-ready builds for macOS (.dmg) and Windows (.msi) while maintaining Linux compatibility.

## Decisions

- **Observer feature:** Graceful degradation. Ship macOS/Windows builds with Observer UI hidden ("Coming soon"). Observer backends for macOS (Accessibility API) and Windows (SetWinEventHook) are deferred to future releases.
- **Window controls:** Platform-conditional decorations. macOS uses native traffic lights via `titleBarStyle: overlay` + `hiddenTitle: true`. Linux/Windows keep the existing custom title bar.
- **Code signing:** Skipped for initial release. Users bypass unsigned-app warnings manually. Signing added later when certificates are purchased.

## Approach: Phased Migration

### Phase 1 -- Compilable & Runnable

Fix build blockers and runtime crashes so the app compiles and launches on all 3 platforms with core features (project management, git, AI context, devlog) functional.

**Tasks:**

| ID | Task | Key File(s) | Severity |
|----|------|-------------|----------|
| 1.1 | Fix ObserverManager Unix-only types | observer/mod.rs | CRITICAL |
| 1.2 | Fix hardcoded database path | db.rs | CRITICAL |
| 1.3 | Fix libc dependency scope mismatch | Cargo.toml, observer/mod.rs | CRITICAL |
| 1.4 | Fix platform-specific IDE opener | commands/ide.rs | CRITICAL |
| 1.5 | Add platform detection Tauri command | NEW platform.rs, lib.rs | Enabler |
| 1.6 | Platform-conditional window decorations | tauri.macos.conf.json, AppShell.tsx, WindowControls.tsx | HIGH |
| 1.7 | Hide Observer UI on non-Linux | Settings.tsx, ObserverDebugControls.tsx | HIGH |
| 1.8 | Fix CodeMirror keyboard shortcuts | MarkdownEditor.tsx | HIGH |
| 1.9 | Add platform-specific scan paths | commands/projects.rs | HIGH |
| 1.10 | Fix hardcoded socket path | observer/mod.rs, backends/ | HIGH |

**Phase 1 Gate:**
- `cargo test` passes on Linux
- `npm test` passes
- `cargo check` succeeds targeting macOS and Windows (verified via CI or cross-compilation)
- App launches and shows Dashboard on all 3 platforms

### Phase 2 -- Polished Cross-Platform UX

Platform-aware UI text, test coverage for macOS paths, minor security hardening.

| ID | Task | Key File(s) |
|----|------|-------------|
| 2.1 | Platform-aware shortcut label helper | NEW platform.ts, DevlogButton.tsx, GitControls.tsx |
| 2.2 | Test coverage for macOS metaKey | useHotkeys.test.ts |
| 2.3 | Replace window.open with Tauri opener | ExtensionMissingCard.tsx |
| 2.4 | Platform-aware watcher error messages | watcher.rs |
| 2.5 | Windows encryption key file protection | security.rs |

**Phase 2 Gate:**
- All tests pass including new metaKey tests
- No Linux-specific terminology visible on non-Linux platforms

### Phase 3 -- CI/CD Pipeline

Automated cross-platform builds via GitHub Actions.

| ID | Task | Key File(s) |
|----|------|-------------|
| 3.1 | Convert release workflow to build matrix | release.yml |
| 3.2 | Add cross-platform CI checks | ci.yml |
| 3.3 | Bundle target verification | tauri.conf.json |

**Phase 3 Gate:**
- Pushing a version tag produces GitHub Release with artifacts for all 3 platforms
