# Ronin v0.3 – Next-Level Feature Planning

> Date: 2026-05-20  
> Baseline: v0.2.x (post fuzzy search, batch ops, IDE detection)  
> Theme: **New Interaction Paradigms & Workflow Integration**

---

## Executive Summary

v0.2 memoles UX dan meningkatkan kualitas fitur yang sudah ada. v0.3 masuk ke kategori yang benar-benar baru: *behavioral intelligence*, *workflow automation*, dan *alternative interfaces*. Semua ide di bawah tidak overlap dengan v0.2.

---

## Ide 1 — Cross-Project Behavioral Analytics

**Kategori: Intelligence Layer**  
**Priority: High | Effort: High**

### Problem
Semua insight di Ronin saat ini bersifat per-project. Developer tidak punya gambaran tentang pola kebiasaan mereka sendiri secara keseluruhan.

### Solusi
Agregasi data Observer + Git activity lintas semua project untuk menghasilkan behavioral insights:

- **Produktivitas pattern**: hari/jam mana developer paling aktif (heatmap mingguan)
- **Project loyalty score**: seberapa sering seseorang kembali ke sebuah project vs abandon
- **Abandon pattern detection**: "Kamu cenderung berhenti setelah fase implementasi auth" — deteksi dari commit message patterns
- **Context switching fatigue**: alert ketika terlalu sering berpindah project dalam satu hari
- **Monthly recap**: summary otomatis aktivitas bulan lalu lintas semua project

### Tampilan
- Tab baru "Insights" di sidebar kiri
- Heatmap aktivitas (seperti GitHub contributions, tapi local + lebih detail)
- Card "Pattern Detected": highlight pola yang ditemukan AI
- Export sebagai PDF/image untuk retrospective

### Files Baru
```
src/pages/Insights.tsx
src/components/Insights/ActivityHeatmap.tsx
src/components/Insights/PatternCard.tsx
src/components/Insights/ProjectLoyalty.tsx
src-tauri/src/commands/analytics.rs          ← aggregasi lintas project
src-tauri/src/db.rs                          ← tambah index untuk query analytics
```

### Privacy
- Semua komputasi lokal, tidak ada data yang keluar device
- User bisa disable di Settings > Privacy

---

## Ide 2 — Project Resurrection Plan

**Kategori: AI Use Case Baru**  
**Priority: High | Effort: Medium**

### Problem
Sekarang AI hanya menghasilkan *context* (apa yang sudah terjadi). Developer masih harus sendiri memikirkan langkah selanjutnya setelah membaca context.

### Solusi
Mode AI baru: **Resurrection Plan** — forward-looking, bukan backward.

Untuk project berstatus Dormant atau Stuck, Ronin generate rencana aksi konkret:

```
🔧 Resurrection Plan — my-saas-project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estimated warm-up time: ~2.5 hours

Immediate actions:
  ☐ Run `npm install` — 3 new deps since last session
  ☐ 2 dependencies have security advisories (axios, lodash)
  ☐ Auth middleware incomplete at src/middleware/auth.ts:47

Next logical steps (from last DEVLOG entry):
  ☐ Implement /api/refresh-token endpoint
  ☐ Wire up protected routes in React Router
  ☐ Write tests for auth flow

Context cliff notes:
  Last worked: 47 days ago
  Stopped because: (from DEVLOG) "need to figure out JWT refresh strategy"
```

### Implementasi
- Tambah prompt khusus di `src-tauri/src/ai/` untuk resurrection mode
- Cek `package.json`/`Cargo.toml` diff dengan lockfile untuk detect dep changes
- Parse DEVLOG untuk extract "stopped because" reason
- Tampilkan sebagai checklist interaktif yang bisa di-tick (tersimpan ke DB)

### Files
```
src-tauri/src/commands/ai.rs                 ← tambah resurrection_plan command
src-tauri/src/ai/prompts/resurrection.rs     ← prompt template baru
src/components/ResurrectionPlan/
  PlanCard.tsx
  ActionChecklist.tsx
src/hooks/useResurrectionPlan.ts
```

---

## Ide 3 — Ambient Mode / System Tray HUD

**Kategori: Interaction Paradigm Baru**  
**Priority: Medium | Effort: High**

### Problem
Ronin harus dibuka secara manual. Banyak momen penting terlewat karena developer tidak ingat untuk membuka app.

### Solusi
Ronin selalu ada di background — minimal, tidak mengganggu:

- **System tray icon** dengan quick menu: list project aktif + health status
- **Smart notification**: "Project X belum disentuh 2 minggu — mau generate context?"  
  (trigger dari Observer yang sudah ada)
- **Mini floating HUD** yang muncul saat IDE di-focus: nama project, health, last commit
- **Do Not Disturb**: otomatis suppress notifikasi saat focus session aktif (lihat Ide 4)

### Implementasi
- Tauri sudah support `tauri-plugin-notification` dan `tauri-plugin-tray`
- HUD sebagai Tauri window kedua yang `always_on_top`, borderless, ukuran kecil
- Observer mendeteksi IDE focus → trigger HUD via event

### Files
```
src-tauri/src/commands/tray.rs               ← system tray management
src-tauri/src-tauri/tauri.conf.json          ← tambah tray config
src/components/Tray/TrayMenu.tsx
src/components/HUD/ProjectHUD.tsx            ← mini overlay window
src-tauri/Cargo.toml                         ← tambah tauri-plugin-notification
```

---

## Ide 4 — Project Focus Session

**Kategori: Workflow Integration**  
**Priority: High | Effort: Medium**

### Problem
DEVLOG sekarang harus ditulis manual. Developer sering tidak sempat atau lupa, terutama setelah sesi kerja panjang.

### Solusi
**Focus Session** — sesi kerja terstruktur yang auto-generate DEVLOG entry:

1. **Start Session**: klik "Start Focus" di project → timer mulai, Observer aktif
2. **Selama sesi**: Observer track file changes + window focus secara pasif
3. **End Session**: timer stop → AI summarize semua aktivitas → draft DEVLOG entry siap di-review
4. **One-click commit**: approve draft → auto-append ke DEVLOG

```
Focus Session Summary — my-api-project
Duration: 1h 47m  |  2026-05-20 14:00–15:47

Files modified: 8 files (src/auth/, src/middleware/)
Commits during session: 2 ("add JWT middleware", "fix token expiry")

AI Draft:
"Implemented JWT authentication middleware. Added token validation
in src/middleware/auth.ts and wired up protected routes. Encountered
issue with refresh token expiry — using 7d window for now, needs
review. Next: write integration tests for auth flow."

[✓ Approve & Append]  [Edit Draft]  [Discard]
```

### Implementasi
- Session state di `src-tauri/src/commands/` (start/stop/get_summary)
- Observer sudah track file + window events — tinggal query per time range
- Prompt baru di AI layer: summarize raw events → natural language DEVLOG entry
- Timer UI di project card / detail panel

### Files
```
src-tauri/src/commands/session.rs            ← baru, session lifecycle
src/components/FocusSession/
  SessionTimer.tsx
  SessionSummary.tsx
  DraftApproval.tsx
src/stores/sessionStore.ts
src/hooks/useFocusSession.ts
```

---

## Ide 5 — Local Model Support (Ollama)

**Kategori: AI Architecture**  
**Priority: Medium | Effort: Medium**

### Problem
Ronin hanya support OpenRouter (cloud). Developer yang privacy-conscious atau bekerja offline tidak bisa pakai fitur AI.

### Solusi
Integrasikan **Ollama** sebagai AI provider alternatif:

- Auto-detect Ollama berjalan di `localhost:11434`
- List model yang tersedia (codellama, mistral, llama3, dsb.)
- Fallback chain: Local Ollama → OpenRouter → Demo
- Badge "Local AI" di UI saat menggunakan Ollama

### Implementasi
- Tambah `providers/ollama.rs` yang implement trait `AiProvider` yang sudah ada
- Ollama API compatible dengan OpenAI format — relatif mudah
- Tambah "AI Provider" selector di Settings: Auto / Ollama / OpenRouter / Demo
- Context payload limit bisa lebih longgar untuk model lokal (tidak ada biaya)

### Files
```
src-tauri/src/ai/providers/ollama.rs         ← baru, implement AiProvider trait
src-tauri/src/commands/settings.rs           ← tambah ollama_url config
src/pages/Settings.tsx                       ← tambah Ollama section
src/components/Settings/OllamaSetup.tsx      ← baru, setup card
```

---

## Ide 6 — CLI Companion (`ronin` command)

**Kategori: Alternative Interface**  
**Priority: Low | Effort: Medium**

### Problem
Developer yang terminal-first harus membuka GUI hanya untuk cek status project atau append DEVLOG.

### Solusi
Binary `ronin-cli` yang berkomunikasi dengan daemon Ronin melalui IPC:

```bash
ronin status                         # semua project + health badge
ronin status my-project              # detail satu project
ronin context my-project             # stream AI context ke terminal
ronin log my-project "Fixed auth"    # append ke DEVLOG
ronin session start my-project       # mulai focus session
ronin session end                    # end + generate summary
ronin open my-project                # buka GUI + focus ke project
```

### Implementasi
- Binary baru di `src-tauri/src/bin/cli.rs`
- Komunikasi via Unix socket ke Ronin daemon (mirip pola observer)
- Output dengan ANSI color + table formatting
- Dapat berjalan tanpa GUI aktif (headless mode)

### Files
```
src-tauri/src/bin/cli.rs             ← binary baru
src-tauri/src/ipc/                   ← baru, Unix socket server/client
  mod.rs
  server.rs
  client.rs
  protocol.rs
src-tauri/Cargo.toml                 ← tambah CLI deps (clap, colored)
```

---

## Prioritized Roadmap v0.3

| # | Feature | Priority | Effort | Sprint |
|---|---------|----------|--------|--------|
| 1 | Project Focus Session | High | Medium | v0.3.0 |
| 2 | Project Resurrection Plan | High | Medium | v0.3.0 |
| 3 | Local Model Support (Ollama) | Medium | Medium | v0.3.1 |
| 4 | Cross-Project Behavioral Analytics | High | High | v0.3.1 |
| 5 | Ambient Mode / System Tray HUD | Medium | High | v0.3.2 |
| 6 | CLI Companion | Low | Medium | v0.3.2 |

---

## Dependency Map

```
Focus Session (1)
  └── diperkuat oleh → Behavioral Analytics (4)
  └── notifikasi via → Ambient Mode (5)

Resurrection Plan (2)
  └── kualitas lebih baik dengan → Local Model / Ollama (3)

Ambient Mode (5)
  └── data dari → Focus Session (1) + Analytics (4)

CLI (6)
  └── independent, bisa dikerjakan paralel dengan semua
```

**Rekomendasi urutan implementasi**: Focus Session → Resurrection Plan → Ollama → Analytics → Ambient → CLI

---

## Catatan Kurasi

Tandai kolom ini saat review:

| Feature | Status | Catatan |
|---------|--------|---------|
| Focus Session | ⬜ | |
| Resurrection Plan | ⬜ | |
| Ollama Support | ⬜ | |
| Behavioral Analytics | ⬜ | |
| Ambient Mode / HUD | ⬜ | |
| CLI Companion | ⬜ | |
