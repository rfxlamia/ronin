# Ronin v0.4 – Intelligence from Data You Already Have

> Date: 2026-05-20  
> Baseline: v0.3.x (post Focus Session, Resurrection Plan, Ollama, Ambient Mode)  
> Theme: **Turn Passive Data Collection into Active Intelligence**

---

## Executive Summary

Eksplorasi codebase mengungkap sesuatu yang menarik: Ronin sudah **mengumpulkan data yang kaya** — timestamp AI sessions, file edit paths, window durations, stuck session criteria — tapi hampir semuanya **dibuang setelah dipakai sekali** atau tidak pernah di-surface ke user.

v0.4 tidak menambah sumber data baru. v0.4 **menambang data yang sudah ada** untuk menghasilkan intelligence yang selama ini tertidur di dalam database.

> Berbeda dari v0.2 (UX polish) dan v0.3 (paradigma baru), v0.4 adalah tentang **analitik mendalam dari data yang sudah dikumpulkan sejak hari pertama**.

---

## Temuan Kunci dari Codebase

Sebelum masuk ke fitur, ini adalah data yang sudah di-capture tapi tidak pernah di-surface:

| Data | Di-capture? | Di-simpan? | Di-analisa? | Di-surface ke user? |
|------|------------|------------|-------------|---------------------|
| AI session timestamps (start/end) | ✅ `aggregator/types.rs:65` | ✅ DB | ⚠️ In-memory saja | ❌ |
| Durasi setiap AI session | ✅ `patterns.rs:198` | ❌ Tidak di-persist | ⚠️ Dihitung, lalu dibuang | ❌ |
| File paths yang di-edit | ✅ `watcher.rs:14` | ✅ DB | ❌ | ⚠️ Raw array saja |
| Window duration (SQL LEAD) | ✅ `db.rs:191–212` | ✅ View defined | ❌ View tidak pernah di-query | ❌ |
| Commit files changed | ✅ `git.rs:92` | ❌ Tidak disimpan | ❌ | ⚠️ Di context panel saja |
| Semua branch di repo | ✅ git2 tersedia | ❌ Hanya HEAD | ❌ | ❌ |
| Detail kriteria stuck | ✅ `patterns.rs:154` | ❌ Hanya bool | ✅ Dihitung | ❌ Boolean saja |
| Context switch antar project | ✅ observer_events | ✅ Implisit di DB | ❌ | ❌ |
| Tool AI mana yang dipakai | ✅ `patterns.rs:54` | ✅ Di attribution | ❌ Tidak per-tool | ⚠️ Teks attribution |

**Kesimpulan**: Sistem sudah data-rich, tapi analysis-poor. Semua fitur di bawah hanya butuh persistence layer baru + aggregation queries + UI surface — bukan data baru.

---

## Ide 1 — Development Session Timeline

**Kategori: Session Intelligence**  
**Priority: High | Effort: Medium**  
**Data source**: `observer_events`, `AiToolSession.start_time/end_time`, `db.rs:191 (view)`

### Problem
Durasi setiap AI session sudah dihitung di `patterns.rs:198` tapi langsung dibuang. SQL view `observer_events_with_duration` didefinisikan di `db.rs:202–203` menggunakan `LEAD()` window function tapi **tidak pernah di-query** di mana pun.

### Solusi
Timeline kronologis sesi kerja per project — seperti "GitHub contribution graph" tapi per jam, bukan per hari:

```
my-api-project — Timeline Minggu Ini

Mon  ████░░░░████████░░░░████  Claude (2h 10m) → 1 commit
Tue  ░░░░████░░░░░░░░░░░░░░░░  ChatGPT (45m) → 0 commits
Wed  ░░░░░░░░░░░░████████████  Cursor (3h 05m) → 3 commits ← breakthrough day
Thu  ░░░░░░░░░░░░░░░░░░░░░░░░  No activity
Fri  ████░░░░░░░░░░░░░░░░████  Claude (1h 20m) → 2 commits
```

- Block per session dengan warna = AI tool yang dipakai
- Hover: detail session (durasi, file count, commit yang follow)
- "Breakthrough" marker: session yang diikuti commit dalam 5 menit
- Total weekly deep work hours per project

### Implementasi
```
DB: Tambah tabel session_metrics(id, project_id, tool_name, start_time, duration_ms, files_touched, commits_following)
    — query dari observer_events_with_duration view yang sudah ada di db.rs:191

Rust: src-tauri/src/commands/analytics.rs     ← command get_session_timeline(project_id, days)
      src-tauri/src/aggregator/fetchers.rs     ← persist session duration saat fetching

React: src/components/Analytics/SessionTimeline.tsx    ← baru
       src/components/Analytics/SessionBlock.tsx        ← baru
       src/pages/ProjectDetail.tsx                      ← tambah tab "Timeline"
```

---

## Ide 2 — File Heatmap & Work Index

**Kategori: Code Focus Intelligence**  
**Priority: High | Effort: Medium**  
**Data source**: `FileEvent.file_path` di `observer_events` table

### Problem
`watcher.rs` merekam setiap file yang di-edit lengkap dengan timestamp. Data ini ada di DB tapi tidak pernah diagregasi — tidak ada yang tahu file mana yang paling sering disentuh, atau file mana yang paling banyak dikerjakan bersama AI.

### Solusi
Visualisasi file tree dengan intensitas = frekuensi edit:

```
src/
├── middleware/      ██████████  42 edits  (Hot)
│   ├── auth.ts      ████████    28 edits  ★ Most edited
│   └── logger.ts    ██          14 edits
├── api/             ████        18 edits
│   ├── routes.ts    ███         12 edits  ★ AI-assisted (7 sessions)
│   └── handlers.ts  █           6 edits
└── utils/           ██          8 edits
```

- Warna intensitas = edit frequency
- Star icon = file yang paling sering dikerjakan bersama AI session
- "AI-assisted files": file yang di-edit dalam 30 menit setelah AI session
- "Stale files": file yang belum disentuh > 2 minggu tapi pernah sangat aktif

### Implementasi
```
DB: Tambah tabel file_work_metrics(file_path, project_id, touch_count, last_touched, ai_session_count, is_stale)
    — di-compute dari observer_events WHERE event_type = 'file_modified'

Rust: src-tauri/src/commands/analytics.rs    ← command get_file_heatmap(project_id)

React: src/components/Analytics/FileHeatmap.tsx     ← baru, tree dengan warna
       src/components/Analytics/FileWorkCard.tsx    ← baru, top files list
```

---

## Ide 3 — Stuck Session Debugger

**Kategori: Diagnostic Intelligence**  
**Priority: High | Effort: Low**  
**Data source**: `patterns.rs:154–177` — detail kriteria stuck sudah dihitung, tapi di-return sebagai `bool` saja

### Problem
`patterns.rs` sudah menghitung: durasi, jumlah AI sessions, unique files yang disentuh, dan apakah ada edit recenti — tapi semua ini di-aggregate ke satu boolean `stuck_detected`. Diagnosis lengkap **dibuang begitu saja**.

### Solusi
Ubah boolean menjadi diagnostic report penuh:

```
⚠️ Stuck Session Detected — my-api-project

Severity: High (3/4 criteria met)

Reasons:
  ✗ Duration: 2h 14m in same problem area  (threshold: 45m)
  ✗ AI sessions: 8 sessions with no commit  (threshold: 3)
  ✗ File edits: Only 2 files touched repeatedly
  ✓ Recent edits: Yes, 8 min ago

Suggested recovery:
  → You've looped on auth.ts 8 times. Try writing a failing test first.
  → Commit your current attempt as WIP, even if broken.
  → Step away — your last 3 breakthrough commits happened after breaks.

Past stuck episodes on this project: 4  |  Average resolution time: 23 min
```

### Implementasi
```
DB: Tambah tabel stuck_episodes(project_id, start_time, resolved_time, severity, reason_codes, resolution_type)
    — tulis saat stuck terdeteksi, update saat commit/break terjadi

Rust: src-tauri/src/aggregator/patterns.rs   ← ubah return type: bool → StuckAnalysis struct
      src-tauri/src/aggregator/types.rs       ← tambah StuckAnalysis, StuckSeverity enum

React: src/components/StuckDebugger/StuckAlert.tsx     ← baru, ganti boolean badge
       src/components/StuckDebugger/RecoverySuggestions.tsx  ← baru
```

---

## Ide 4 — AI Tool Effectiveness Dashboard

**Kategori: Meta-Intelligence**  
**Priority: Medium | Effort: Medium**  
**Data source**: `AiToolSession.tool_name` di `aggregator/patterns.rs:8–36`

### Problem
Ronin sudah tahu kamu pakai Claude, ChatGPT, Cursor, Copilot, Windsurf, dsb. (ada 15+ tool di-detect). Tapi tidak ada analisa: **tool mana yang paling efektif untuk kamu secara personal?**

### Solusi
Scorecard per AI tool berdasarkan data kerja nyata:

```
AI Tool Effectiveness — Last 30 Days

Tool        Sessions  Avg Duration  Commits After  Productivity
──────────────────────────────────────────────────────────────
Claude       47        1h 12m        1.3 / session  ████████  High
Cursor       31        2h 05m        2.1 / session  ██████████ Highest
ChatGPT      18        32m           0.4 / session  ████       Medium
Copilot      12        45m           0.8 / session  █████      Medium
Windsurf      4        1h 30m        0.2 / session  ██         Low

Insight: Cursor correlates with 2x more commits per session than Claude.
         ChatGPT sessions rarely result in commits within 1 hour.
```

- "Commits after session" = commit dalam 30 menit setelah session
- "Productivity score" = weighted: commit rate × avg commit size × session duration
- Ini bukan ranking absolut — ini personal analytics berdasarkan pola kamu sendiri

### Implementasi
```
DB: Tambah tabel tool_effectiveness(project_id, tool_name, session_count, avg_duration_ms, commits_per_session, productivity_score)
    — di-compute dari join observer_events + git log

Rust: src-tauri/src/commands/analytics.rs    ← command get_tool_effectiveness(days=30)

React: src/components/Analytics/ToolScorecard.tsx    ← baru
       src/pages/Insights.tsx                         ← tambah section (dari v0.3)
```

---

## Ide 5 — Branch & Feature Lifecycle Tracker

**Kategori: Git Intelligence**  
**Priority: Medium | Effort: Medium**  
**Data source**: `git2` library (sudah ada) — hanya HEAD yang di-query sekarang

### Problem
`git.rs` hanya fetch current branch (`HEAD`). Padahal `git2` crate bisa list semua branch. Tidak ada visibility ke: berapa lama sebuah feature branch hidup, branch mana yang stale, atau apakah ada WIP yang terlupakan.

### Solusi
Lifecycle view per branch:

```
Branches — my-api-project

Branch                 Age    Commits  Last Activity   Status
──────────────────────────────────────────────────────────────
main                   —      247      2 days ago      ✅ Active
feature/auth-refresh   14d    12       Yesterday       🔥 In Progress
feature/rate-limit     47d    3        41 days ago     ⚠️ Stale
fix/login-bug          3d     1        3 days ago      🔥 In Progress
refactor/middleware    89d    7        88 days ago     💀 Abandoned?

AI sessions on feature/auth-refresh: 14  (most AI-assisted branch this month)
```

- Branch age, commit count, last activity
- "Stale" warning: branch > 30 hari tanpa commit
- "Abandoned?" alert: branch > 60 hari
- Correlation dengan AI sessions: branch mana paling banyak AI-assisted

### Implementasi
```
Rust: src-tauri/src/commands/git.rs         ← tambah get_branch_analytics(path)
      — gunakan git2::Repository::branches() yang sudah tersedia

React: src/components/BranchTracker/BranchList.tsx      ← baru
       src/components/BranchTracker/BranchStatusBadge.tsx  ← baru
       src/components/Dashboard/ProjectCard.tsx          ← tambah branch count indicator
```

---

## Ide 6 — DEVLOG Search & Auto-Mining

**Kategori: Knowledge Intelligence**  
**Priority: Medium | Effort: Medium**  
**Data source**: DEVLOG.md files per project (sudah dibaca, tapi tidak di-index)

### Problem
DEVLOG dibaca sebagai plain text untuk AI context, tapi tidak pernah **dianalisa strukturnya**. Tidak ada search, tidak ada "apa yang saya tulis 3 minggu lalu tentang auth?", dan tidak ada cara auto-generate entry dari aktivitas yang sudah ada.

### Solusi
Tiga sub-fitur:

**A. DEVLOG Full-Text Search**
```
Search devlog: "JWT refresh"

Results:
  my-api-project  — 2026-04-30: "Decided to use 7d window for JWT refresh..."
  my-api-project  — 2026-03-15: "JWT refresh endpoint blocked by CORS issue..."
  auth-service    — 2026-04-12: "Fixed JWT refresh after rebase conflict..."
```

**B. Auto-Entry Suggestion**
Setelah setiap commit, Ronin draft DEVLOG entry otomatis:
```
💡 Suggested DEVLOG Entry

"Implemented rate limiting middleware (src/middleware/rate-limit.ts).
 Used token bucket algorithm, 100 req/min per IP. Tested against
 auth endpoints — passes. TODO: add Redis backend for distributed use."

[Add to DEVLOG]  [Edit]  [Skip]
```
— Draft di-generate dari: commit message + files changed + recent AI sessions

**C. Contextual Reminder**
Saat mulai kerja di area yang pernah ditulis di DEVLOG:
```
💬 Relevant DEVLOG entry from 3 weeks ago:
   "auth.ts: JWT refresh strategy unclear — needs more research"
   → You're editing auth.ts now. Still relevant?
```

### Implementasi
```
DB: Tambah tabel devlog_entries(project_id, date, content, keywords)
    Tambah FTS index: CREATE VIRTUAL TABLE devlog_fts USING fts5(content, ...)

Rust: src-tauri/src/commands/devlog.rs       ← tambah search_devlog(query), parse_entries()
      src-tauri/src/commands/ai.rs           ← tambah generate_devlog_entry(project_id, commit_sha)

React: src/components/devlog/DevlogSearch.tsx       ← baru
       src/components/devlog/EntryDraftBanner.tsx   ← baru, muncul post-commit
       src/components/devlog/ContextualReminder.tsx ← baru
```

---

## Prioritized Roadmap v0.4

| # | Feature | Priority | Effort | Sprint |
|---|---------|----------|--------|--------|
| 1 | Stuck Session Debugger | High | Low | v0.4.0 |
| 2 | Branch & Feature Lifecycle Tracker | Medium | Medium | v0.4.0 |
| 3 | Development Session Timeline | High | Medium | v0.4.1 |
| 4 | DEVLOG Search & Auto-Mining | Medium | Medium | v0.4.1 |
| 5 | File Heatmap & Work Index | High | Medium | v0.4.2 |
| 6 | AI Tool Effectiveness Dashboard | Medium | Medium | v0.4.2 |

---

## Kenapa v0.4 Berbeda

| | v0.2 | v0.3 | v0.4 |
|--|------|------|------|
| **Focus** | UX & fitur yang ada | Paradigma & workflow baru | Mining data yang sudah ada |
| **Data baru?** | Tidak | Sebagian | ❌ Tidak perlu |
| **Backend effort** | Rendah | Sedang–Tinggi | Sedang (mostly queries) |
| **User value** | Polish | New capabilities | Insights yang selama ini tersembunyi |
| **Analoginya** | VS Code polish | Notion + Pomodoro | Datadog untuk developer habits |

---

## Catatan Teknis

- Semua fitur ini **tidak butuh data collection baru** — Observer dan Git sudah mengumpulkan semua yang diperlukan
- Bottleneck utama: **persistence** (session metrics, file metrics, DEVLOG index belum di-simpan ke DB)
- Estimated schema additions: 5 tabel baru, 1 FTS virtual table, 3 SQL views
- Tidak ada breaking changes ke existing schema — semua additive

---

## Tabel Kurasi

| Feature | Status | Catatan |
|---------|--------|---------|
| Stuck Session Debugger | ⬜ | |
| Branch & Feature Lifecycle | ⬜ | |
| Development Session Timeline | ⬜ | |
| DEVLOG Search & Auto-Mining | ⬜ | |
| File Heatmap & Work Index | ⬜ | |
| AI Tool Effectiveness Dashboard | ⬜ | |
