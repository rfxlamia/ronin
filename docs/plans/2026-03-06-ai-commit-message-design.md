# AI-Generated Commit Messages — Design Document

**Tanggal:** 2026-03-06  
**Status:** Approved  
**Feature:** Tombol sparkle ✨ di commit editor untuk generate commit message via AI

---

## Overview

Tambahkan fitur AI-generated commit message ke `GitControls.tsx`. User klik tombol sparkle → AI baca `git diff HEAD` → textarea terisi otomatis → user bisa edit atau langsung commit. Flow manual tetap bisa dipakai sebagai fallback.

---

## Architecture

### Pendekatan

**Opsi A — New Tauri command `generate_commit_message`** (dipilih)

Command baru di `src-tauri/src/commands/git.rs` yang:
1. Ambil git diff via CLI
2. Build prompt khusus commit message
3. Reuse provider resolution yang sudah ada (baca settings DB)
4. Return `String` (non-streaming) ke frontend

Alasan pilih Opsi A vs alternatif:
- **vs extend `generate_context`**: Separation of concern — context recovery dan commit message adalah dua concern berbeda. Susah di-test kalau digabung.
- **vs call OpenRouter dari frontend**: API key terekspos ke JS layer — melanggar security pattern Ronin yang encrypt key di Rust.

---

## Backend Design

### Command Signature

```rust
// src-tauri/src/commands/git.rs
#[tauri::command]
pub async fn generate_commit_message(
    project_path: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<String, String>
```

Didaftarkan di `src-tauri/src/lib.rs` dalam `invoke_handler![]`.

### Alur Kerja

1. **Ambil diff** — jalankan `git diff HEAD` via `std::process::Command`
2. **Fallback diff** — jika diff kosong (misal: file baru, belum ada commit sebelumnya), jalankan `git diff --cached`
3. **Edge case empty repo** — jika kedua diff kosong dan repo baru, return error deskriptif
4. **Truncate** — potong diff ke max **8KB** sebelum dikirim ke AI (cukup konteks, tidak waste token)
5. **Resolve provider** — baca `ai_provider_default` dan `api_key_<provider>` dari SQLite, reuse logic yang sama dengan `generate_context`
6. **Build prompt** — system + user message khusus commit message (lihat bagian Prompt Design)
7. **Call AI** — non-streaming, collect full response
8. **Strip & return** — trim whitespace, buang quote atau prefix yang tidak perlu, return `Ok(String)`

### Prompt Design

```
System:
You are an expert at writing git commit messages.
Write a single, concise commit message following conventional commits format
(e.g. feat:, fix:, chore:, docs:, refactor:).
- One line only, max 72 characters
- No period at the end
- Imperative mood ("add" not "added")
- Only output the commit message, nothing else

User:
Based on this diff, write a commit message:

<diff truncated to 8KB>
```

### Provider Resolution

Reuse pattern dari `generate_context`:
1. Query `ai_provider_default` dari settings (default: `"openrouter"`)
2. Query `api_key_<provider>` → decrypt via `decrypt_api_key()`
3. Query `ai_model_openrouter` untuk model preference
4. Instantiate provider (`OpenRouterProvider` atau `DemoProvider`)

Demo mode: route ke lambda yang sama dengan `generate_context`. Tidak ada special handling — demo provider sudah handle rate limit sendiri.

### Error Cases

| Kondisi | Error yang di-return |
|---|---|
| Diff kosong (tidak ada perubahan) | `"No changes detected"` |
| Repo empty (belum ada commit) | `"No commits yet, please make your first commit via terminal"` |
| Bukan git repo | `"Not a git repository"` |
| API key tidak dikonfigurasi | `"Please configure your API key in settings"` |
| AI error | Forward `AiError::user_message()` sebagai String |
| Git CLI gagal | Forward stderr dari git |

---

## Frontend Design

### State Machine

Tambah satu state baru ke `Mode` type yang sudah ada:

```typescript
// sebelum
type Mode = 'idle' | 'editing' | 'submitting';

// sesudah
type Mode = 'idle' | 'editing' | 'submitting' | 'generating';
```

- `generating` = AI sedang proses, textarea + semua button disabled

### Layout Perubahan

Hanya mode `editing` yang berubah. Di baris action buttons, dari **2 tombol** menjadi **3 tombol**:

```
[ ✨ ]  [ Commit ──────────── ]  [ Cancel ]
```

- **Tombol sparkle** — `variant="outline"`, `size="sm"`, icon-only (`Sparkles` dari lucide-react)
  - Saat `generating`: icon diganti `Loader2` dengan `animate-spin`
  - `disabled` saat `mode === 'generating' || mode === 'submitting'`
  - `title="Generate commit message with AI"`
  - Di demo mode: tetap aktif (route ke lambda)
- **Tombol Commit** — tidak berubah, tetap `flex-1`
- **Tombol Cancel** — tidak berubah

### Behavior Sparkle Button

```
onClick sparkle:
  1. setMode('generating')
  2. invoke('generate_commit_message', { projectPath: project.path })
  3a. Sukses → setMessage(result), setMode('editing'), focus textarea
  3b. Error  → toast.error(errorMessage), setMode('editing')
              → message TIDAK di-clear (draft manual user tetap ada)
```

Flow commit tidak berubah — sparkle hanya mengisi textarea. User masih yang klik Commit.

### Sumber Diff

`git diff HEAD` — konsisten dengan `commit_changes` yang sudah auto `git add -A`. AI melihat semua perubahan (unstaged + staged) yang akan masuk commit. Fallback ke `git diff --cached` jika HEAD belum ada.

---

## Testing

### Backend Tests (`src-tauri/src/commands/git.rs`)

- `test_generate_commit_message_empty_diff` — return error kalau tidak ada perubahan
- `test_generate_commit_message_invalid_path` — return error kalau bukan git repo
- `test_generate_commit_message_empty_repo` — return error kalau repo belum punya commit

*(AI call tidak di-test di unit test — butuh API key live)*

### Frontend Tests (`src/components/Dashboard/GitControls.test.tsx`)

Mock `invoke` dari `@tauri-apps/api/core`:
- Sparkle button muncul saat mode `editing`, tidak muncul saat mode `idle`
- Saat generate sukses → message di-set ke hasil AI, mode kembali ke `editing`
- Saat generate gagal → toast error muncul, mode kembali ke `editing`, message tidak di-clear
- Tombol sparkle dan Commit disabled saat `mode === 'generating'`
- Textarea disabled saat `mode === 'generating'`

---

## Files yang Berubah

| File | Perubahan |
|---|---|
| `src-tauri/src/commands/git.rs` | Tambah fungsi `generate_commit_message` + unit tests |
| `src-tauri/src/lib.rs` | Daftarkan command baru di `invoke_handler![]` |
| `src/components/Dashboard/GitControls.tsx` | Tambah state `generating`, sparkle button, handler |
| `src/components/Dashboard/GitControls.test.tsx` | Test cases baru untuk sparkle behavior |

---

## Keputusan yang Tidak Diambil (YAGNI)

- **Selective staging UI** — out of scope. `commit_changes` sudah `git add -A`, konsisten.
- **Streaming commit message** — tidak perlu, response pendek (~72 char).
- **Cache hasil generate** — tidak perlu, user bisa klik sparkle lagi.
- **Model khusus untuk commit** — pakai model yang sama dengan context generation, tidak perlu config baru.
- **Riwayat commit message yang di-generate** — tidak perlu untuk MVP.
