# AI-Generated Commit Messages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambahkan tombol sparkle ✨ di commit editor yang memanggil AI untuk generate commit message berdasarkan `git diff HEAD`, mengisi textarea secara otomatis, dan membiarkan user edit sebelum commit.

**Architecture:** Command baru `generate_commit_message` di Rust backend yang ambil diff via CLI, resolve provider yang aktif dari DB, call AI non-streaming, return string ke frontend. Frontend tambah state `generating` dan sparkle button di `GitControls.tsx` yang invoke command tersebut. Tidak ada streaming, tidak ada staging UI baru — konsisten dengan `commit_changes` yang sudah `git add -A`.

**Tech Stack:** Rust (Tauri v2, tokio, rusqlite, reqwest), React 19 + TypeScript, lucide-react (`Sparkles`, `Loader2`), Vitest + Testing Library, Cargo test.

---

## Task 1: Backend — Command `generate_commit_message`

**Files:**
- Modify: `src-tauri/src/commands/git.rs` (tambah fungsi + unit tests)
- Modify: `src-tauri/src/lib.rs` (daftarkan command)

### Step 1: Tulis failing unit tests

Tambahkan di bagian bawah `src-tauri/src/commands/git.rs`, sebelum penutup `}` module `tests`:

```rust
// ========================================================================
// TESTS FOR AI COMMIT MESSAGE GENERATION
// ========================================================================

#[tokio::test]
async fn test_generate_commit_message_invalid_path() {
    // Bukan git repo → harus return error
    // Note: kita test helper get_diff_for_commit saja, bukan full command
    // karena full command butuh DB pool (Tauri state)
    let result = get_diff_for_commit("/nonexistent/path".to_string()).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_generate_commit_message_empty_repo() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let repo_path = temp_dir.path();

    Command::new("git")
        .args(["init"])
        .current_dir(repo_path)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(repo_path)
        .output()
        .expect("Failed to set user name");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(repo_path)
        .output()
        .expect("Failed to set user email");

    // Repo kosong, tidak ada commit sama sekali
    let result = get_diff_for_commit(repo_path.to_string_lossy().to_string()).await;
    assert!(result.is_err());
    assert!(
        result.unwrap_err().contains("No changes"),
        "Should indicate no changes"
    );
}

#[tokio::test]
async fn test_generate_commit_message_with_changes() {
    let temp_repo = create_test_repo(); // Helper yang sudah ada
    let repo_path = temp_repo.path();

    // Buat file baru tapi belum di-commit
    let new_file = repo_path.join("feature.rs");
    fs::write(&new_file, "pub fn greet() -> &'static str { \"hello\" }")
        .expect("Failed to write file");

    let result = get_diff_for_commit(repo_path.to_string_lossy().to_string()).await;
    assert!(result.is_ok(), "Should return diff string");
    let diff = result.unwrap();
    assert!(!diff.is_empty(), "Diff should not be empty");
    assert!(diff.contains("feature.rs"), "Diff should mention the file");
}

#[test]
fn test_truncate_diff_at_8kb() {
    let big_diff = "a".repeat(10 * 1024); // 10KB
    let truncated = truncate_diff(&big_diff);
    assert!(truncated.len() <= 8 * 1024 + 100, "Should be truncated near 8KB");
    assert!(truncated.contains("... (diff truncated)"), "Should have truncation marker");
}

#[test]
fn test_truncate_diff_small() {
    let small_diff = "small diff content";
    let truncated = truncate_diff(small_diff);
    assert_eq!(truncated, small_diff, "Small diff should not be truncated");
}
```

### Step 2: Jalankan tests untuk verifikasi gagal

```bash
cargo test test_generate_commit_message --manifest-path src-tauri/Cargo.toml 2>&1 | tail -20
```

Expected: FAIL — fungsi `get_diff_for_commit` dan `truncate_diff` belum ada.

### Step 3: Implementasi helper functions dan command

Tambahkan di `src-tauri/src/commands/git.rs`, **sebelum** blok `#[cfg(test)]`:

```rust
/// Get git diff for AI commit message generation
///
/// Tries `git diff HEAD` first (catches all changes vs last commit).
/// Falls back to `git diff --cached` for repos with staged-only changes.
/// Returns Err if no changes detected or repo invalid.
pub async fn get_diff_for_commit(project_path: String) -> Result<String, String> {
    // Validate it's a git repo
    Repository::open(&project_path)
        .map_err(|_| "Not a git repository".to_string())?;

    // Try git diff HEAD first (all changes vs last commit)
    let diff_output = Command::new("git")
        .args(["diff", "HEAD"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();

    if !diff.trim().is_empty() {
        return Ok(diff);
    }

    // Fallback: try --cached (staged files only, e.g. first commit scenario)
    let cached_output = Command::new("git")
        .args(["diff", "--cached"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run git diff --cached: {}", e))?;

    let cached_diff = String::from_utf8_lossy(&cached_output.stdout).to_string();

    if !cached_diff.trim().is_empty() {
        return Ok(cached_diff);
    }

    Err("No changes detected".to_string())
}

/// Truncate diff to max 8KB to avoid wasting tokens
pub fn truncate_diff(diff: &str) -> String {
    const MAX_BYTES: usize = 8 * 1024;
    if diff.len() <= MAX_BYTES {
        diff.to_string()
    } else {
        let truncated: String = diff.chars().take(MAX_BYTES).collect();
        format!("{}\n... (diff truncated)", truncated)
    }
}

/// Generate a commit message using AI based on git diff
///
/// Uses the user's configured AI provider (same as generate_context).
/// Returns a single-line commit message string.
/// Non-streaming — commit messages are short enough to collect in full.
#[tauri::command]
pub async fn generate_commit_message(
    project_path: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<String, String> {
    use crate::ai::provider::{AiProvider, ContextPayload};
    use crate::ai::providers::{DemoProvider, OpenRouterProvider};
    use crate::security::decrypt_api_key;
    use base64::{engine::general_purpose, Engine as _};
    use futures_util::StreamExt;
    use rusqlite::OptionalExtension;

    // Step 1: Get diff
    let raw_diff = get_diff_for_commit(project_path.clone()).await?;
    let diff = truncate_diff(&raw_diff);

    // Step 2: Resolve provider from DB (same pattern as generate_context)
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    let default_provider: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_provider_default'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query default provider: {}", e))?
        .unwrap_or_else(|| "openrouter".to_string());

    let selected_model: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_model_openrouter'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query model: {}", e))?;

    let api_key = if default_provider == "demo" {
        None
    } else {
        let setting_key = format!("api_key_{}", default_provider);
        let encoded: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params![setting_key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Failed to query API key: {}", e))?;

        match encoded {
            Some(enc) => {
                let encrypted = general_purpose::STANDARD
                    .decode(&enc)
                    .map_err(|e| format!("Failed to decode key: {}", e))?;
                let decrypted = decrypt_api_key(&encrypted)?;
                Some(decrypted)
            }
            None => return Err("Please configure your API key in settings".to_string()),
        }
    };

    // Step 3: Build prompt
    let system_prompt = "You are an expert at writing git commit messages. \
        Write a single, concise commit message following conventional commits format \
        (e.g. feat:, fix:, chore:, docs:, refactor:). \
        Rules: one line only, max 72 characters, no period at the end, \
        imperative mood (\"add\" not \"added\"). \
        Only output the commit message text, nothing else — no quotes, no explanation."
        .to_string();

    let user_message = format!(
        "Based on this git diff, write a commit message:\n\n{}",
        diff
    );

    // Step 4: Create provider and call AI
    let attribution = crate::ai::openrouter::Attribution {
        commits: 0,
        files: 0,
        sources: vec!["git".to_string()],
        devlog_lines: None,
        ai_sessions: None,
    };

    let payload = ContextPayload {
        system_prompt,
        user_message,
        attribution,
    };

    let provider: Box<dyn AiProvider> = match default_provider.as_str() {
        "openrouter" => {
            let key = api_key.ok_or("API key required for OpenRouter")?;
            Box::new(OpenRouterProvider::new(key, selected_model))
        }
        "demo" => {
            let lambda_url = option_env!("DEMO_LAMBDA_URL")
                .unwrap_or(
                    "https://dkm5aeebsg7dggdpwoovlbzjde0ayxyh.lambda-url.ap-southeast-2.on.aws/",
                )
                .to_string();
            Box::new(DemoProvider::new(lambda_url))
        }
        _ => return Err("AI provider is not available".to_string()),
    };

    // Step 5: Collect full response (non-streaming)
    let mut stream = provider
        .stream_context(payload)
        .await
        .map_err(|e| e.user_message())?;

    let mut result = String::new();
    while let Some(chunk) = stream.next().await {
        result.push_str(&chunk);
    }

    // Step 6: Clean up response — strip quotes, extra whitespace, newlines
    let cleaned = result
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .lines()
        .next()  // Take only first line
        .unwrap_or("")
        .trim()
        .to_string();

    if cleaned.is_empty() {
        return Err("AI returned an empty response".to_string());
    }

    Ok(cleaned)
}
```

### Step 4: Daftarkan command di `lib.rs`

Di `src-tauri/src/lib.rs`, cari baris `commands::git::safe_push,` lalu tambahkan baris baru setelahnya:

```rust
// Sebelum:
commands::git::safe_push,

// Sesudah:
commands::git::safe_push,
commands::git::generate_commit_message,
```

### Step 5: Jalankan tests untuk verifikasi lulus

```bash
cargo test test_generate_commit_message test_truncate_diff --manifest-path src-tauri/Cargo.toml 2>&1 | tail -30
```

Expected: semua 5 tests PASS.

### Step 6: Verifikasi compile tanpa error

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -20
```

Expected: `Finished` tanpa error.

### Step 7: Commit

```bash
git add src-tauri/src/commands/git.rs src-tauri/src/lib.rs
git commit -m "feat(git): add generate_commit_message Tauri command"
```

---

## Task 2: Frontend — Sparkle Button di `GitControls.tsx`

**Files:**
- Modify: `src/components/Dashboard/GitControls.tsx`
- Modify: `src/components/Dashboard/GitControls.test.tsx` (jika ada, atau buat baru)

### Step 1: Cek apakah test file sudah ada

```bash
ls src/components/Dashboard/GitControls.test.tsx 2>/dev/null && echo "exists" || echo "not found"
```

Jika tidak ada, buat file baru di Step 2. Jika sudah ada, lanjut ke Step 3.

### Step 2: Buat file test baru (jika belum ada)

Buat `src/components/Dashboard/GitControls.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitControls } from './GitControls';
import type { Project } from '@/types/project';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

const mockProject: Project = {
    id: 1,
    name: 'test-project',
    path: '/home/user/test-project',
    lastOpened: null,
    addedAt: '2024-01-01T00:00:00Z',
    isGitRepo: true,
    deletedAt: null,
};

const mockStatus = {
    branch: 'main',
    uncommittedFiles: 3,
    unpushedCommits: 0,
    lastCommitTimestamp: 1700000000,
    hasRemote: true,
    isDetached: false,
    hasConflicts: false,
    isEmpty: false,
};

describe('GitControls — sparkle button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sparkle button tidak muncul di mode idle', () => {
        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );
        expect(screen.queryByTitle('Generate commit message with AI')).toBeNull();
    });

    it('sparkle button muncul saat mode editing', async () => {
        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));
        expect(screen.getByTitle('Generate commit message with AI')).toBeInTheDocument();
    });

    it('generate sukses mengisi textarea dengan hasil AI', async () => {
        vi.mocked(invoke).mockResolvedValueOnce('feat: add user authentication');

        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));
        fireEvent.click(screen.getByTitle('Generate commit message with AI'));

        await waitFor(() => {
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.value).toBe('feat: add user authentication');
        });
    });

    it('generate error menampilkan toast error dan tidak clear message', async () => {
        vi.mocked(invoke).mockRejectedValueOnce('No changes detected');

        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));

        // Tulis manual dulu
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'my manual message' } });

        fireEvent.click(screen.getByTitle('Generate commit message with AI'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });

        // Message manual tidak hilang
        expect((textarea as HTMLTextAreaElement).value).toBe('my manual message');
    });

    it('tombol sparkle dan Commit disabled saat generating', async () => {
        // invoke tidak resolve — biarkan pending
        vi.mocked(invoke).mockReturnValueOnce(new Promise(() => {}));

        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));
        fireEvent.click(screen.getByTitle('Generate commit message with AI'));

        // Saat generating — sparkle dan commit harus disabled
        await waitFor(() => {
            expect(screen.getByTitle('Generate commit message with AI')).toBeDisabled();
            expect(screen.getByRole('button', { name: /commit/i })).toBeDisabled();
        });
    });
});
```

### Step 3: Jalankan test untuk verifikasi gagal

```bash
npx vitest run src/components/Dashboard/GitControls.test.tsx 2>&1 | tail -20
```

Expected: FAIL — `Sparkles` import belum ada, state `generating` belum ada.

### Step 4: Update `GitControls.tsx`

**4a. Tambahkan `Sparkles` ke import lucide-react:**

Di `src/components/Dashboard/GitControls.tsx` baris 2, ubah:

```typescript
// Sebelum:
import { GitCommitHorizontal, Upload, Loader2 } from 'lucide-react';

// Sesudah:
import { GitCommitHorizontal, Upload, Loader2, Sparkles } from 'lucide-react';
```

**4b. Tambahkan `'generating'` ke type `Mode`:**

```typescript
// Sebelum:
type Mode = 'idle' | 'editing' | 'submitting';

// Sesudah:
type Mode = 'idle' | 'editing' | 'submitting' | 'generating';
```

**4c. Tambahkan handler `handleGenerate` setelah `handleCancel`:**

```typescript
const handleGenerate = async () => {
    setMode('generating');
    try {
        const generated = await invoke<string>('generate_commit_message', {
            projectPath: project.path,
        });
        setMessage(generated);
        setMode('editing');
        // Autofocus textarea setelah generate
        setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (error) {
        const errorMessage = String(error);
        toast.error(`Could not generate: ${errorMessage}`, { duration: 5000 });
        setMode('editing');
        // message TIDAK di-clear — draft manual user tetap ada
    }
};
```

**4d. Update baris action buttons di mode editing:**

Cari blok `<div className="flex gap-2">` yang berisi tombol Commit dan Cancel, ubah menjadi:

```tsx
<div className="flex gap-2">
    <Button
        onClick={handleGenerate}
        disabled={mode === 'generating' || mode === 'submitting'}
        variant="outline"
        size="sm"
        title="Generate commit message with AI"
        className="font-serif"
    >
        {mode === 'generating' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
            <Sparkles className="h-4 w-4" />
        )}
    </Button>
    <Button
        onClick={handleCommit}
        disabled={!message.trim() || mode === 'submitting' || mode === 'generating' || hasConflicts}
        size="sm"
        className="flex-1 font-serif"
        title={hasConflicts ? 'Cannot commit with conflicts' : ''}
    >
        {mode === 'submitting' ? (
            <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Committing...
            </>
        ) : (
            'Commit'
        )}
    </Button>
    <Button
        onClick={handleCancel}
        variant="outline"
        size="sm"
        disabled={mode === 'submitting' || mode === 'generating'}
        className="font-serif"
    >
        Cancel
    </Button>
</div>
```

**4e. Update disabled state textarea** — tambahkan `mode === 'generating'` ke kondisi disabled:

```tsx
// Sebelum:
disabled={mode === 'submitting' || hasConflicts}

// Sesudah:
disabled={mode === 'submitting' || mode === 'generating' || hasConflicts}
```

### Step 5: Jalankan test untuk verifikasi lulus

```bash
npx vitest run src/components/Dashboard/GitControls.test.tsx 2>&1 | tail -20
```

Expected: semua tests PASS.

### Step 6: Jalankan full test suite untuk pastikan tidak ada regresi

```bash
npm test 2>&1 | tail -30
```

Expected: semua tests PASS.

### Step 7: TypeScript lint check

```bash
npm run lint 2>&1 | tail -20
```

Expected: tidak ada error.

### Step 8: Commit

```bash
git add src/components/Dashboard/GitControls.tsx src/components/Dashboard/GitControls.test.tsx
git commit -m "feat(ui): add AI sparkle button for commit message generation"
```

---

## Verification Checklist

Sebelum klaim selesai, verifikasi manual:

- [ ] `cargo build` sukses tanpa warning baru
- [ ] `npm test` semua pass
- [ ] `npm run lint` bersih
- [ ] Sparkle button muncul di mode editing, tidak di idle
- [ ] Saat generate, textarea dan semua button disabled
- [ ] Saat sukses, textarea terisi hasil AI dan bisa diedit
- [ ] Saat error, toast muncul dan draft manual tidak hilang
- [ ] Flow commit manual masih bisa dipakai tanpa menyentuh sparkle
