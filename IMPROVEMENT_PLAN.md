# Ronin – Improvement Planning

> Date: 2026-05-20  
> Version baseline: 0.1.4 (Beta)  
> Scope: Feature additions for v0.2.x roadmap

---

## Executive Summary

Ronin sudah feature-complete untuk Linux dengan arsitektur yang solid (React 19 + Tauri v2 + SQLite). Analisis codebase (~27K baris TypeScript, 38 file Rust) mengidentifikasi **6 area utama** yang dapat ditingkatkan untuk meningkatkan nilai produk tanpa refactor besar-besaran.

---

## Area Improvement

### 1. Batch Operations
**Priority: High | Effort: Medium | Files: Frontend only**

Tidak ada operasi batch sama sekali saat ini. Semua aksi (archive, delete, context generation) hanya berlaku satu project.

**Rencana:**
- Tambah multi-select mode di `src/components/Dashboard/ProjectCard.tsx` (checkbox overlay saat hover)
- Tambah action bar yang muncul ketika ada project terseleksi di `src/pages/Dashboard.tsx`
- Expose batch Tauri commands di `src-tauri/src/commands/projects.rs`:
  - `batch_archive_projects(ids: Vec<i64>)`
  - `batch_delete_projects(ids: Vec<i64>)`
- Tambah "Generate All Context" yang queue AI calls secara sequential (bukan parallel, untuk menghindari rate limit)

**Files yang perlu diubah:**
```
src/pages/Dashboard.tsx
src/components/Dashboard/ProjectCard.tsx
src/components/Dashboard/BatchActionBar.tsx     ← baru
src/stores/projectStore.ts
src-tauri/src/commands/projects.rs
```

---

### 2. Fuzzy Search & Filter Lanjutan
**Priority: High | Effort: Low | Files: Frontend only**

Search sekarang hanya `string.includes()` biasa. Tidak ada filter by health status, language, atau last active.

**Rencana:**
- Integrasikan library `fuse.js` (sudah ringan, tidak perlu backend) untuk fuzzy search di `src/stores/projectStore.ts`
- Tambah filter chips di atas project grid:
  - Health status: Active / Dormant / Stuck
  - Sort by: Last Active, Name, Date Added
  - Language: auto-detect dari repository (sudah ada data di DB)
- Persist filter preference ke `settingsStore.ts`

**Files yang perlu diubah:**
```
src/components/Dashboard/SearchBar.tsx          ← update
src/components/Dashboard/FilterChips.tsx        ← baru
src/stores/projectStore.ts
src/stores/settingsStore.ts
package.json                                    ← tambah fuse.js
```

---

### 3. DEVLOG Version Diff Viewer
**Priority: Medium | Effort: Medium | Files: Frontend + sedikit Rust**

History view di `DevlogHistory.tsx` sudah ada tapi hanya menampilkan versi lama secara penuh – tidak ada diff antara dua versi.

**Rencana:**
- Tambah mode "Compare" di `src/components/devlog/DevlogHistory.tsx`: pilih dua versi untuk dibandingkan
- Gunakan library `diff` (sudah tersedia di ekosistem npm) untuk generate unified diff di frontend
- Tampilkan dengan syntax highlighting merah/hijau menggunakan CodeMirror yang sudah ada
- Tambah Tauri command `get_devlog_version_content(project_id, version_index)` jika belum ada

**Files yang perlu diubah:**
```
src/components/devlog/DevlogHistory.tsx
src/components/devlog/DevlogDiffViewer.tsx      ← baru
src-tauri/src/commands/devlog.rs               ← tambah command jika perlu
package.json                                    ← tambah diff
```

---

### 4. IDE Detection Lebih Luas
**Priority: Medium | Effort: Low | Files: Rust only**

`src-tauri/src/commands/ide.rs` sekarang hanya mendeteksi VS Code dan VS Codium.

**Rencana:**
- Tambah deteksi untuk:
  - JetBrains family: `idea`, `clion`, `pycharm`, `goland`, `webstorm`, `rider`
  - Neovim: cek proses `nvim` dengan server socket aktif
  - Zed: cek binary `zed`
  - Helix: cek binary `hx`
- Deteksi via `/proc/<pid>/cmdline` (Linux, sudah tersedia) + proses name matching
- Tampilkan icon IDE yang terdeteksi di project card

**Files yang perlu diubah:**
```
src-tauri/src/commands/ide.rs
src/components/Dashboard/ProjectCard.tsx        ← tampilkan icon IDE
src/components/ui/IdeIcon.tsx                  ← baru
```

---

### 5. Smart Context Truncation
**Priority: Medium | Effort: Medium | Files: Rust**

Hard limit 10KB di `src-tauri/src/aggregator/summarizer.rs` menyebabkan truncation yang tidak semantic – bisa memotong di tengah commit message atau DEVLOG entry penting.

**Rencana:**
- Implementasikan **priority-based truncation**:
  1. Uncommitted changes (prioritas tertinggi – state saat ini)
  2. Commit messages 5 terbaru (ringkas, tanpa diff)
  3. DEVLOG entry terbaru (potong per paragraph, bukan per karakter)
  4. Behavior events (summarize ke "X focus sessions, Y file changes")
- Tambah unit tests untuk setiap truncation strategy
- Expose metadata ke frontend: "Context: 8.2KB / 10KB (3 commits, 1 DEVLOG entry)"

**Files yang perlu diubah:**
```
src-tauri/src/aggregator/summarizer.rs
src-tauri/src/aggregator/mod.rs
src/components/ContextPanel.tsx                 ← tampilkan context metadata
```

---

### 6. Project Health Score yang Lebih Kaya
**Priority: Low | Effort: Medium | Files: Frontend + Rust**

`src/lib/logic/projectHealth.ts` menggunakan threshold waktu sederhana saja.

**Rencana:**
- Perkaya sinyal health score dengan:
  - **Commit frequency**: rata-rata commit per minggu (3 minggu terakhir)
  - **File churn rate**: berapa banyak file yang sering berubah
  - **DEVLOG activity**: apakah ada entri baru belakangan ini
  - **Observer data**: apakah project sering di-focus dalam seminggu terakhir
- Tampilkan breakdown score di tooltip health badge
- Tidak ada ML – cukup weighted scoring yang transparan

**Files yang perlu diubah:**
```
src/lib/logic/projectHealth.ts
src-tauri/src/commands/projects.rs              ← expose lebih banyak metrics
src/components/Dashboard/HealthBadge.tsx        ← tambah tooltip breakdown
```

---

## Prioritized Roadmap

| # | Feature | Priority | Effort | Sprint |
|---|---------|----------|--------|--------|
| 1 | Fuzzy Search & Filter | High | Low | v0.2.0 |
| 2 | Batch Operations | High | Medium | v0.2.0 |
| 3 | IDE Detection Lanjutan | Medium | Low | v0.2.1 |
| 4 | Smart Context Truncation | Medium | Medium | v0.2.1 |
| 5 | DEVLOG Diff Viewer | Medium | Medium | v0.2.2 |
| 6 | Project Health Score | Low | Medium | v0.3.0 |

---

## Catatan Implementasi

- Semua perubahan **backward-compatible** – tidak ada schema DB migration yang breaking
- Item 1 & 2 (Fuzzy Search + Batch) bisa dikerjakan paralel karena tidak ada shared state baru
- Item 4 (Smart Truncation) sebaiknya dikerjakan sebelum Item 6 (Health Score) karena context quality mempengaruhi AI accuracy
- Observer-based signals di Item 6 hanya tersedia di Linux – perlu fallback graceful untuk platform lain

---

## Out of Scope (v0.2.x)

Hal berikut tidak direkomendasikan untuk siklus ini karena effort terlalu tinggi vs. nilai:

- macOS/Windows activity monitoring (membutuhkan native API integration yang kompleks)
- RAG atau fine-tuning model AI
- Collaboration / multi-user features
- Git merge conflict UI (lebih baik buka terminal/IDE)
