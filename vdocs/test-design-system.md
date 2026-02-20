# System-Level Test Design - Ronin

**Project:** ronin  
**Type:** Desktop Application (Tauri v2 - Linux MVP)  
**Date:** 2025-12-18  
**Reviewer:** TEA (Test Automation Engineer)  
**Phase:** 2 - Solutioning (Pre-Implementation Readiness)

---

## Executive Summary

This document assesses the testability of Ronin's architecture and provides a comprehensive test levels strategy, NFR testing approach, and test environment requirements for the implementation phase. Ronin is a Personal Project Development Manager for Linux developers with a **core innovation of behavioral context inference** via Silent Observer + AI integration.

**Testability Assessment: PASS with MINOR CONCERNS**

- **Controllability:** PASS
- **Observability:** PASS  
- **Reliability:** CONCERNS (see Section 2.3)

**Recommendation for Implementation Readiness Gate:** **PASS** - Architecture is testable with clear mitigation plan for reliability concerns.

---

## 1. Testability Assessment

### 1.1 Controllability ✅ PASS

**Can we control system state for testing?**

**Strengths:**
- ✅ **SQLite Database:** WAL mode with clear schema allows easy seed data injection via SQL scripts
- ✅ **Local-First Architecture:** All data stored locally (no external dependencies for core features)
- ✅ **Dependency Injection Ready:** Rust architecture with modular components supports mocking
- ✅ **Git Operations:** Shell command-based approach (MVP) allows stubbing via test doubles
- ✅ **Configuration Layer:** Settings stored in SQLite, easily controlled in test environment

**Capabilities:**
- **Database Seeding:** Can pre-populate projects table with known test data
- **Mock External Services:** OpenRouter API can be mocked/stubbed for offline testing
- **Factory Patterns:** Can create test projects (Git + Generic) programmatically
- **State Reset:** SQLite database can be reset between tests for isolation
- **Error Injection:** Can simulate network failures (API unavailable), Git failures (detached HEAD)

**Test Approach:**
- Use fixtures to create known project states: fresh-git-repo, dormant-with-uncommitted-changes, generic-folder-with-files
- Mock OpenRouter API responses for deterministic AI context testing
- Use test database file (`ronin-test.db`) separate from production

---

### 1.2 Observability ✅ PASS

**Can we inspect system state and validate behavior?**

**Strengths:**
- ✅ **SQLite Database:** All state queryable via SQL (projects, settings, activity logs)
- ✅ **File System Artifacts:** DEVLOG.md files verifiable, Git commits inspectable
- ✅ **React DevTools:** Frontend state visible in browser inspector
- ✅ **Structured Logging:** Rust backend can emit structured logs for debugging
- ✅ **NFR Metrics:** Telemetry system tracks performance metrics (context recovery time, resurrection rate per FR63-64)

**Capabilities:**
- **State Verification:** Can query SQLite to verify project added, settings updated, activity logged
- **Performance Metrics:** Can measure and validate NFRs (startup time, memory usage, context recovery \<10s)
- **UI State:** Can inspect React component state, verify animations, validate ARIA labels
- **AI Attribution:** "Based on:" sources visible in UI for manual verification
- **Error States:** Three distinct error illustrations testable (offline, API, rate limit)

**Test Approach:**
- E2E tests query database to verify state changes (Playwright + SQL)
- Performance tests use Tauri's profiling tools + system monitoring (RSS memory, CPU%)
- NFR validation via automated telemetry checks
- Visual regression testing for error state illustrations

---

### 1.3 Reliability ⚠️ CONCERNS

**Are tests isolated, reproducible, and components loosely coupled?**

**Architecture Strengths:**
- ✅ **SQLite WAL Mode:** Prevents database lock contention (NFR17)
- ✅ **Local-First:** No cloud dependencies for core features (offline mode works)
- ✅ **Component Modularity:** Clear separation (Dashboard UI, Context Aggregator, Silent Observer, Git Operations)

**Testability Concerns:**

#### **CONCERN 1: Silent Observer Wayland GNOME Dependency** ⚠️

**Issue:** Window title tracking on Wayland GNOME requires **GNOME Shell Extension** (external dependency, not integration-testable in CI)

**Impact:**
- Cannot fully test Silent Observer → AI pipeline in headless CI
- Cross-platform tests (X11 vs Wayland) require different environments
- Wayland KDE/Sway unsupported in MVP (process name fallback only)

**Mitigation:**
1. **Mock Silent Observer Interface** in tests - stub window title feed
2. **Manual Testing Protocol** for Wayland GNOME - CI skips Shell Extension tests, manual QA performs
3. **X11 Primary Test Path** - CI uses X11 Xvfb (headless), Wayland manual only
4. **Process Name Fallback Tests** - Validate graceful degradation on unsupported compositors

**Recommendation:** Document Wayland GNOME as manual-test-only in test design. Automate everything except Shell Extension integration.

---

#### **CONCERN 2: AI Behavioral Inference Accuracy (NFR30: 80% Target)** ⚠️

**Issue:** Stuck pattern detection, temporal correlation require **golden test scenarios** but no automated validation framework yet

**Impact:**
- FR66-68 (stuck patterns, temporal correlation) hard to test deterministically
- "80% accuracy on 5 golden scenarios" is subjective without defined baseline
- Silent Observer → Context Aggregator → AI pipeline has many moving parts

**Mitigation:**
1. **Define 5 Golden Scenarios** explicitly in test design (e.g., "auth.rs edited 15 times, StackOverflow searches, no commit")
2. **Scenario Playback System** - Record real developer activity, replay in tests
3. **AI Response Validation** - Assert expected keywords in AI output ("stuck on auth.rs", "lifetime mismatch")
4. **Human-in-Loop Review** - TEA manually reviews 10 AI outputs weekly, flags false positives

**Recommendation:** Create `tests/golden-scenarios/` with 5 recorded activity logs → expected AI outputs. Automate assertion of key phrases.

---

#### **CONCERN 3: Git Operations Safety (NFR19: Never Cause Data Loss)** ⚠️

**Issue:** Shell command approach (`git commit`, `git push`) lacks transactional rollback if push fails mid-operation

**Impact:**
- Edge case: commit succeeds but push fails → user sees error, may retry commit (duplicate)
- Detached HEAD edge case (FR58) - commands may behave unexpectedly
- Race condition: User commits in Ronin, simultaneously pushes in terminal

**Mitigation:**
1. **Pre-Flight Checks** - `git fetch` before push, validate remote state first
2. **Idempotent Commands** - Always check current state before mutating (`git diff` before commit)
3. **Atomic Operations** - Commit and push are separate actions (user-controlled, no auto-combining)
4. **Error Recovery Tests** - Simulate each failure mode (no remote, remote ahead, detached HEAD)

**Recommendation:** Test suite includes "chaos scenarios" - network disconnect during push, detached HEAD commit attempt, no-remote-configured edge case.

---

### 1.4 Architecture Decision Risks

| Decision | Testability Risk | Mitigation |
|----------|------------------|------------|
| **Shell Commands for Git (MVP)** | Cannot mock git2 library, relies on system git | Use test repositories with known states, docker for reproducible git versions |
| **Tauri WebView** | E2E tests need headless browser support | Playwright with Tauri driver, Xvfb for CI |
| **GNOME Shell Extension** | Cannot automate D-Bus communication tests | Manual test protocol, mock D-Bus interface in unit tests |
| **OpenRouter API (Cloud)** | Network dependency for AI tests | Record/replay HTTP fixtures, mock API in 90% of tests |
| **SQLite Concurrent Access** | Potential lock contention under load | Load tests with 10+ parallel operations, WAL mode validation |

---

## 2. Architect

urally Significant Requirements (ASRs)

### ASR-1: Context Recovery \<10s (NFR1) 🔴 **HIGH RISK**

**Category:** PERF (Performance)  
**Probability:** 3 (Likely) - API latency variable, network unpredictable  
**Impact:** 3 (Critical) - Core UX promise, differentiator, user frustration if slow  
**Risk Score:** **9** (IMMEDIATE MITIGATION REQUIRED)

**Testability Challenges:**
- AI response time depends on OpenRouter API (external factor)
- Context Aggregation complexity (\<10KB summarization) affects processing time
- Streaming response perception (feels fast) vs actual completion time

**Testing Approach:**
- **Performance Tests:** k6 load tests with mocked API (target: 95th percentile \<8s)
- **Perceived Performance:** Measure "first content" (\<2s per NFR23) separately from full response
- **Synthetic Monitoring:** Periodic checks against live OpenRouter API in staging
- **Fallback Validation:** Offline mode shows cached context (degradation test)

**Mitigation:** Set performance budgets - Context Aggregator processing \<1s, API call \<7s, rendering \<2s. Alert if 95th percentile exceeds 10s.

---

### ASR-2: Behavioral Inference Accuracy 80% (NFR30) 🟡 **MEDIUM RISK**

**Category:** DATA (Data Integrity / AI Quality)  
**Probability:** 2 (Possible) - New capability, no historical baseline  
**Impact:** 3 (Critical) - Core differentiator, value proposition  
**Risk Score:** **6** (HIGH PRIORITY)

**Testability Challenges:**
- Stuck pattern detection heuristics (5+ edits? 10?) require tuning
- Temporal correlation (search → edit within 5 min) sensitive to timing
- Manual verification required (AI inference is qualitative)

**Testing Approach:**
- **Golden Scenarios:** 5 pre-recorded activity logs with expected AI outputs
- **Keyword Assertion:** AI response must contain specific phrases ("stuck on auth.rs")
- **Attribution Verification:** "Based on: X edits, Y searches" visible in UI
- **Weekly Manual Review:** TEA reviews 10 random AI outputs, tracks false positive rate

**Mitigation:** Start with conservative accuracy target (70% in v0.1), refine heuristics based on telemetry.

---

### ASR-3: Silent Observer \<50MB Memory (NFR7) 🟢 **LOW RISK**

**Category:** PERF (Resource Efficiency)  
**Probability:** 1 (Unlikely) - Rust's memory safety, small daemon scope  
**Impact:** 2 (Degraded) - User annoyance if daemon bloats, not critical failure  
**Risk Score:** **2** (MONITOR)

**Testability Challenges:**
- Long-running process memory leaks (observable over days, not test runs)
- Wayland GNOME Shell Extension memory separate from daemon

**Testing Approach:**
- **Burn-In Tests:** Run Silent Observer for 7 days, measure RSS hourly
- **Memory Profiling:** Valgrind/heaptrack on Rust daemon
- **Leak Detection:** Assert no growth after steady state (24h mark)

**Mitigation:** Use Rust's `Arc` carefully, avoid unbounded collections in activity logs.

---

### ASR-4: Zero Data Loss on Crash (NFR17, NFR24) 🟡 **MEDIUM RISK**

**Category:** DATA (Data Integrity)  
**Probability:** 2 (Possible) - Laptop sleep/wake, unexpected shutdowns  
**Impact:** 3 (Critical) - User trust destroyed if projects vanish  
**Risk Score:** **6** (HIGH PRIORITY)

**Testability Challenges:**
- Simulating crashes, power loss, sleep/wake cycles in CI
- Validating SQLite WAL mode correctness under extreme conditions

**Testing Approach:**
- **Chaos Tests:** `kill -9` during database write, verify recovery on next start
- **Sleep/Wake Simulation:** Systemd suspend/resume hooks, validate Observer reconnect
- **WAL Integrity:** SQLite PRAGMA integrity_check on every startup (NFR26)

**Mitigation:** WAL mode + database integrity check on startup. Add automatic backups (weekly SQLite dump).

---

### ASR-5: Graceful Degradation (NFR18) 🟢 **LOW RISK**

**Category:** OPS (Operations / Reliability)  
**Probability:** 2 (Possible) - API outages happen  
**Impact:** 2 (Degraded) - Dashboard still works, AI unavailable  
**Risk Score:** **4** (PLAN MITIGATION)

**Testability Challenges:**
- Testing offline mode requires network disconnection
- Verifying UI shows clear "AI unavailable" message

**Testing Approach:**
- **Network Disconnect Tests:** Block outbound HTTP, verify dashboard loads
- **Cached Context:** Validate last AI response shown when offline
- **Error Illustration:** Assert correct error image displayed (ronin-error-offline.png)

**Mitigation:** Offline mode heavily tested in E2E suite. Manual testing during development without API key.

---

## 3. Test Levels Strategy

Based on Ronin's architecture (Tauri desktop app with Rust backend, React frontend, external API, system integration), recommended test distribution:

### Test Split: **40% Unit / 30% Integration / 25% E2E / 5% Performance**

**Rationale:**
- **Desktop UI-heavy app:** Higher E2E % than typical backend service (25% vs usual 10%)
- **Rust business logic:** Strong unit test foundation for Context Aggregator, Git Operations  
- **System integration:** Silent Observer, System Tray, Global Hotkeys need integration tests
- **Performance-critical:** Context recovery NFR requires dedicated performance suite

---

### 3.1 Unit Tests (40% - ~150 tests)

**Scope:** Rust business logic, React components (isolated)

**Technology:** 
- Rust: `cargo test`, `#[cfg(test)]` modules
- React: Jest + React Testing Library

**Coverage:**
- **Context Aggregator:** Stuck pattern detection logic (~20 tests)
  - Input: 5 edits to same file → Output: stuck=true
  - Input: Search "Rust lifetime" + edit auth.rs within 5min → Output: temporal correlation detected
  - Input: Rapid window switches → Output: frustration signal
- **Git History Parser:** Commit message extraction, branch detection (~15 tests)
- **Health Status Calculator:** Active/Dormant/Stuck determination (~10 tests)
- **Generic Folder Scanner:** File count, mtime calculation (~8 tests)
- **React Components:** ProjectCard, ContextPanel, HealthBadge (~30 tests)
- **Utility Functions:** Date formatting, dormancy calculation (~20 tests)

**Characteristics:**
- Fast (\<100ms per test)
- No network, no filesystem, no database
- Mock all external dependencies

---

### 3.2 Integration Tests (30% - ~110 tests)

**Scope:** Component interactions, database, file system, Git commands

**Technology:**
- Rust: Integration tests in `tests/` directory
- SQLite: In-memory or test database file
- Git: Real git operations on test repositories

**Coverage:**
- **Database Layer:** CRUD operations, WAL mode validation (~20 tests)
- **Git Operations:** Shell command execution, error handling (~25 tests)
  - Detached HEAD, no remote, remote ahead scenarios
- **File System Watcher:** Notify crate integration (~15 tests)
- **OpenRouter API Client:** HTTP requests, streaming, error handling (mocked) (~20 tests)
- **Silent Observer (mocked):** D-Bus interface stubbing (~15 tests)
- **Settings Manager:** Load/save, encryption (~10 tests)
- **Tauri Commands:** Frontend-backend bridge (~15 tests)

**Characteristics:**
- Medium speed (100ms - 2s per test)
- Uses real SQLite, real git, mocked network
- Test database reset between runs

---

### 3.3 End-to-End Tests (25% - ~90 tests)

**Scope:** Full user journeys, UI interactions, system integration

**Technology:**
- **Playwright** with Tauri app harness
- Headless mode for CI (Xvfb + X11)
- Wayland tests: Manual only (documented protocol)

**Coverage:**
- **First-Time Experience:** Empty state → Add project → See card (~5 scenarios)
- **Dashboard Interactions:** Expand card, collapse, search, filter (~15 scenarios)
- **Git Operations:** Commit flow, push flow, error states (~12 scenarios)
- **AI Context Recovery:** Request context, see streaming, view attribution (~10 scenarios)
- **DEVLOG Editor:** Create, edit, sync with file (~8 scenarios)
- **Settings:** Configure API key, dormancy threshold, toggle Silent Observer (~10 scenarios)
- **Error States:** Offline, API error, rate limit (~6 scenarios)
- **Keyboard Navigation:** Tab through dashboard, Ctrl+K search, Escape close (~10 scenarios)
- **Accessibility:** Screen reader announces, focus indicators visible (~8 scenarios)

**Critical E2E Paths (P0 - Must Pass Before Release):**
1. **Add First Project** → See project card
2. **Expand Project Card** → Request AI context → See streaming response
3. **One-Click Commit** → Success toast
4. **One-Click Push** → Success toast (or remote-ahead warning)
5. **Offline Mode** → Dashboard loads, AI shows "unavailable"

**Characteristics:**
- Slow (2-10s per test)
- Uses real Tauri app, real SQLite, mocked OpenRouter API
- Visual regression: Screenshot comparison for error illustrations

---

### 3.4 Performance Tests (5% - ~20 tests)

**Scope:** NFR validation, load testing, resource monitoring

**Technology:**
- **k6** for AI API load testing (if applicable)
- **Tauri Benchmarks** for startup time
- **Custom Rust Benchmarks** (Criterion) for Context Aggregator
- **System Monitoring:** top/htop scripts for memory/CPU

**Coverage:**
- **NFR1:** Context recovery \<10s (measure 100 runs, assert 95th percentile)
- **NFR2:** Dashboard load \<2s
- **NFR3:** Startup time \<3s warm, \<6s cold
- **NFR6:** GUI memory \<200MB baseline (assert after idle 5 min)
- **NFR7:** Silent Observer memory \<50MB (7-day burn-in test)
- **NFR9:** CPU idle \<1% (measure over 1 hour)
- **NFR28:** Graceful degradation with 100+ projects (load test)

**Characteristics:**
- Very slow (minutes to days for burn-in tests)
- Automated in nightly CI builds
- Manual validation for 7-day stability tests

---

## 4. NFR Testing Approach

### 4.1 Security Testing

**Target NFRs:** NFR11-15 (API key encryption, local-only data, no telemetry without consent)

**Approach:**
- **Static Analysis:** `cargo audit` for Rust dependency vulnerabilities
- **Secret Scanning:** Verify API keys never logged, never in plaintext files
- **Database Inspection:** Assert `settings.api_key` is encrypted (AES-256 or OS keyring)
- **Network Monitoring:** Wireshark/tcpdump to verify no Silent Observer data leaves machine
- **Permission Tests:** Verify SQLite database has restrictive file permissions (600)

**Tools:**
- `cargo audit` (Rust security)
- `sqlcipher` for encrypted SQLite (if using)
- OS keyring integration (libsecret on Linux)

**Manual Review:**
- Code review: All API key usage, ensure no console.log/println! in production

---

### 4.2 Performance Testing

**Target NFRs:** NFR1-6, NFR23

**Approach:**
- **Startup Profiling:** Measure time-to-interactive (TTI) with Lighthouse-style metrics
- **Context Recovery:** Timer from click → full AI response (100 samples, 95th percentile)
- **Memory Monitoring:** RSS tracked via `ps` every 5 minutes during 24h run
- **CPU Profiling:** `perf` on Linux to identify hot paths
- **Dashboard Rendering:** Measure time from SQLite query → card visible

**Tools:**
- **Criterion** (Rust benchmarking)
- **Chrome DevTools** (frontend performance)
- **Tauri Profiler** (app startup)
- Custom Rust instrumentation (tracing crate)

**Performance Budgets:**
| Metric | Budget | Failure Threshold |
|--------|--------|-------------------|
| Context Recovery (95th %ile) | \<10s | \>12s |
| Dashboard Load | \<2s | \>3s |
| Startup (warm) | \<3s | \>4s |
| GUI Memory (baseline) | \<150MB | \>200MB |

---

### 4.3 Reliability Testing

**Target NFRs:** NFR17-19, NFR24-28

**Approach:**
- **Crash Recovery:** `kill -9` during write, verify database intact on restart
- **Sleep/Wake:** Suspend laptop, resume, verify Silent Observer reconnects
- **Long-Running Stability:** 7-day burn-in test, assert no memory leaks
- **Load Testing:** Add 100 projects, verify dashboard doesn't crash (NFR28)
- **Git Safety:** Simulate all error scenarios (detached HEAD, no remote, remote ahead)

**Tools:**
- **SQLite PRAGMA:** `integrity_check`, `foreign_key_check`
- **Systemd:** `systemctl suspend` for sleep/wake simulation
- **Stress Testing:** Add 500 projects script

**Manual Validation:**
- TEA performs "chaos day" - random laptop suspends, network disconnects, API errors

---

### 4.4 Accessibility Testing

**Target NFRs:** NFR20-22

**Approach:**
- **Keyboard Navigation:** Automated tests via Playwright (Tab, Enter, Escape)
- **Color Contrast:** Assert WCAG AA compliance (≥4.5:1) with contrast checker
- **Screen Reader:** Manual testing with Orca (Linux), assert ARIA labels present
- **Reduced Motion:** Test `@media (prefers-reduced-motion: reduce)` CSS

**Tools:**
- **axe-core** (accessibility linting)
- **Playwright Accessibility** (automated checks)
- **Orca Screen Reader** (manual)
- **Color Contrast Analyzer**

**Manual Review:**
- TEA performs keyboard-only navigation through full app

---

## 5. Test Environment Requirements

### 5.1 CI/CD Environment

**Platform:** GitHub Actions or GitLab CI

**Configuration:**
```yaml
Environment: Ubuntu 22.04 LTS
Display Server: Xvfb (headless X11)
Rust: stable (1.75+)
Node.js: 18 LTS
Dependencies: libwebkit2gtk-4.1-dev, build-essential, libssl-dev
```

**Test Execution:**
1. **Unit Tests:** `cargo test` (fast, every commit)
2. **Integration Tests:** `cargo test --test '*'` (every commit)
3. **E2E Tests:** Playwright (every PR, headless)
4. **Performance Tests:** Nightly builds (cron job)

**Limitations:**
- ❌ **No Wayland GNOME:** CI uses X11 only (Wayland requires manual testing)
- ❌ **No Live API:** OpenRouter API mocked in CI (live API tested in staging)

---

### 5.2 Local Development Environment

**Developer Machines:**
- OS: Linux (Ubuntu/Fedora/Arch) with X11 or Wayland GNOME
- Rust toolchain: rustup
- Node.js: nvm
- Test Data: `./tests/fixtures/` with sample Git repos

**Manual Testing Checklist:**
- [ ] Test on X11 session (primary)
- [ ] Test on Wayland GNOME with Shell Extension installed
- [ ] Test with real OpenRouter API (rate limit aware)
- [ ] Test offline mode (disconnect network)

---

### 5.3 Staging Environment

**Purpose:** Pre-release validation with live integrations

**Setup:**
- Real OpenRouter API (test account, monthly budget)
- 5 test projects (mix of Git + Generic)
- 7-day burn-in run on VM

**Validation:**
- [ ] Context recovery \<10s (real API)
- [ ] Silent Observer memory \<50MB (7-day uptime)
- [ ] No crashes across sleep/wake cycles
- [ ] AI accuracy on 5 golden scenarios

---

## 6. Testability Concerns Summary

### Blockers (Must Fix Before Implementation)

**NONE IDENTIFIED** - Architecture is testable as designed.

---

### Concerns (Mitigation Required)

1. **🟡 Wayland GNOME Shell Extension** - Not automatable in CI
   - **Mitigation:** Manual test protocol + X11 as primary automated path
2. **🟡 AI Accuracy (80% Target NFR30)** - No automated validation yet
   - **Mitigation:** Golden scenario suite + weekly manual review
3. **🟡 Git Safety (NFR19)** - Shell command edge cases
   - **Mitigation:** Comprehensive chaos scenarios + pre-flight checks

---

### Risks (Monitor)

1. **🟢 Silent Observer Memory Leaks** - Long-running daemon risk
   - **Monitoring:** 7-day burn-in tests, RSS profiling
2. **🟢 Context Recovery Performance** - API latency variable
   - **Monitoring:** Synthetic checks, performance budgets

---

## 7. Recommendations for Sprint 0 (Framework Setup)

Before starting story implementation, set up the test infrastructure:

### 7.1 Test Framework Setup

1. **Unit Tests:**
   - Initialize `cargo test` structure
   - Add `tests/` directory for integration tests
   - Configure Jest + React Testing Library for frontend

2. **E2E Framework:**
   - Install Playwright with Tauri support
   - Create page object models for Dashboard, ProjectCard, Settings
   - Set up Xvfb for headless CI

3. **Performance Tests:**
   - Add Criterion for Rust benchmarks
   - Create startup profiling script
   - Set up memory monitoring (RSS tracker)

---

### 7.2 Test Data \u0026 Fixtures

```
tests/
├── fixtures/
│   ├── git-repos/
│   │   ├── fresh-repo/          # Empty Git repo
│   │   ├── active-repo/         # Recent commits
│   │   ├── dormant-repo/        # 30-day-old commits
│   │   └── stuck-repo/          # Uncommitted changes
│   ├── generic-folders/
│   │   ├── documents/           # .docx, .pdf files
│   │   └── empty-folder/
│   ├── databases/
│   │   ├── empty.db             # Fresh database
│   │   └── seeded.db            # 10 projects pre-loaded
│   └── api-mocks/
│       ├── context-success.json
│       ├── context-rate-limit.json
│       └── context-error.json
```

---

### 7.3 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
      - run: cargo test

  integration-tests:
    runs-on: ubuntu-22.04
    steps:
      - run: cargo test --test '*'

  e2e-tests:
    runs-on: ubuntu-22.04
    steps:
      - run: |
          Xvfb :99 &
          export DISPLAY=:99
          npx playwright test

  performance-tests:
    runs-on: ubuntu-22.04
    if: github.event_name == 'schedule'  # Nightly only
    steps:
      - run: cargo bench
```

---

## 8. Quality Gate Criteria

Before moving to **Implementation Phase (Phase 4)**, the following must be true:

### Architecture Review ✅

- [ ] All 3 testability concerns have mitigation plans (documented above)
- [ ] Test levels strategy approved (40/30/25/5 split)
- [ ] NFR testing approach defined for all P0 NFRs

### Test Infrastructure ✅

- [ ] Unit test framework running (`cargo test` passing)
- [ ] Integration test structure created (`tests/` directory)
- [ ] E2E framework scaffolded (Playwright + Tauri)
- [ ] CI pipeline configured (GitHub Actions or equivalent)

### Sprint 0 Deliverables (Before Story 1.1)

- [ ] Test fixtures created (`tests/fixtures/` populated)
- [ ] Page Object Models defined for E2E (Dashboard, Settings)
- [ ] Performance baseline established (startup time measured)
- [ ] Golden scenarios documented (`tests/golden-scenarios/README.md`)

---

## 9. Next Steps

1. **Review this document** with architect (validate testability assessment)
2. **Run `/bmad-bmm-workflows-implementation-readiness`** workflow (gate check)
3. **Approve mitigation plans** for 3 identified concerns
4. **Proceed to Sprint Planning** (generate sprint-status.yaml)
5. **Execute Sprint 0** (test framework setup before Story 1.1)

---

## Appendix A: 5 Golden Scenarios for AI Accuracy (NFR30)

To validate **80% behavioral inference accuracy**, these scenarios will be recorded and tested:

### Scenario 1: Stuck on Auth Bug
- **Activity:** 15 edits to `auth.rs`, 3 StackOverflow searches "Rust lifetime mismatch", no commit for 3 hours
- **Expected AI Output:** "You appear stuck on authentication in auth.rs. Lifetime mismatch detected from searches. Suggestion: try Arc\<Mutex\<\>\>"

### Scenario 2: Refactoring Spree
- **Activity:** 8 commits in 2 hours, all to `refactor/api-cleanup` branch, DEVLOG note "Cleaning up API layer"
- **Expected AI Output:** "Active refactoring session. You've been cleaning up the API layer across multiple files."

### Scenario 3: Context Switch Frustration
- **Activity:** Rapid window switching (VS Code → Browser → Terminal → Slack), 5 minutes idle, then single commit
- **Expected AI Output:** "Detected context switching. You recently committed after a brief pause."

### Scenario 4: Dormant Project Resurrection
- **Activity:** 30-day-old repo opened, no recent commits, last DEVLOG entry "TODO: fix database migration"
- **Expected AI Output:** "This project has been dormant for 30 days. Last known goal: fix database migration."

### Scenario 5: Generic Folder (Non-Git)
- **Activity:** Folder with 12 .docx files, last modified 5 days ago, no Git
- **Expected AI Output:** "This folder contains 12 documents, last modified 5 days ago. (Note: AI context limited without Git history)"

**Validation Method:** TEA manually reviews AI output for each scenario, marks PASS if key phrases present.

---

## Appendix B: Wayland GNOME Manual Test Protocol

Since GNOME Shell Extension cannot be automated in CI, follow this manual checklist before each release:

### Setup
1. Boot Linux with Wayland GNOME session
2. Install Ronin GNOME Shell Extension (`.gnome-shell-extension/`)
3. Enable extension: `gnome-extensions enable ronin-observer@seontech.biz`
4. Verify D-Bus service running: `busctl list | grep ronin`

### Test Cases
- [ ] **Window Title Tracking:** Open VS Code, verify title logged in activity table
- [ ] **App Switching:** Switch VS Code → Firefox, verify both titles logged
- [ ] **Silent Observer Disable:** Toggle off in Settings, verify no new logs
- [ ] **Extension Crash Recovery:** `killall gnome-shell`, verify Observer reconnects

### Acceptance
- All 4 test cases PASS before release on Wayland GNOME
- X11 tests PASS in CI (automated)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-18  
**Status:** **READY FOR IMPLEMENTATION READINESS REVIEW**
