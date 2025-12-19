# Validation Report

**Document:** docs/sprint-artifacts/2-9-project-auto-detection-on-first-launch.md
**Checklist:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-19

## Summary
- Overall: PARTIAL (Major technical gaps identified)
- Critical Issues: 3
- Enhancement Opportunities: 2

## Section Results

### 1. Technical Specifications
Pass Rate: FAIL
- [FAIL] **Dependency Reality Check**: Story claims `walkdir` is "already in dependencies". This appears to be a hallucination as it wasn't added in previous stories (1.3, 2.4, 2.8).
  - **Evidence:** "Use `walkdir` crate (already in dependencies)."
  - **Impact:** Build will fail if developer assumes it's there. Must explicitly add to `src-tauri/Cargo.toml`.
- [FAIL] **Tauri v2 Path API**: Ambiguous instruction "Use `dirs` crate (or `tauri::api::path` if available in v2)".
  - **Evidence:** "Use `dirs` crate (or `tauri::api::path` if available in v2)"
  - **Impact:** Confuses the LLM. `tauri::api::path` is v1/frontend. In v2 backend, use `app.path().home_dir()` or `dirs` crate.
- [FAIL] **Async Runtime Safety**: "Run it in `tauri::command`'s thread pool (async)". `walkdir` is blocking synchronous I/O.
  - **Evidence:** "Scanning is IO-bound. `walkdir` is synchronous but fast. Run it in `tauri::command`'s thread pool (async)."
  - **Impact:** Running blocking code in an async Tauri command will block the Tokio runtime thread, potentially freezing the UI or other async tasks. Must use `tauri::async_runtime::spawn_blocking`.

### 2. Philosophy & UX Alignment
Pass Rate: PARTIAL
- [PARTIAL] **Loading State**: Suggests "RoninLoader/Spinner".
  - **Evidence:** "Scanning progress state (RoninLoader/Spinner)"
  - **Impact:** Violates Philosophy Rule "Never use spinning loader". Must strict usage of RoninLoader (meditating/pulse).

### 3. Regression Prevention
Pass Rate: PARTIAL
- [PARTIAL] **Soft Delete Interaction**: Doesn't explicitly handle re-adding soft-deleted projects.
  - **Evidence:** "Call `add_project` for selected projects"
  - **Impact:** While Story 2.8 fixed `add_project` to handle restoration, explicit context here ensures the developer tests this "Resurrection" scenario (FR64).

## Failed Items
1. **Dependency Hallucination**: `walkdir` needs to be added.
2. **Path API Ambiguity**: Need specific Tauri v2 instruction.
3. **Blocking I/O Risk**: Need `spawn_blocking` instruction.

## Partial Items
1. **Spinner Suggestion**: Remove "Spinner".
2. **Soft Delete Context**: Add note about `deleted_at` restoration.

## Recommendations
1. **Must Fix**: Add `cargo add walkdir` task. Clarify Path API (prefer `dirs` for simplicity or `app.path()`). Enforce `spawn_blocking` for the scan.
2. **Should Improve**: Explicitly mention "Resurrection" of soft-deleted projects in tasks/testing.
3. **Consider**: Add a specific test case for "Re-adding a removed project via scan".
