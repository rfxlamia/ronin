# Plan C — UI & Clean Code

> **Scope**: `ProjectScanner.tsx`, `dateUtils.ts`, `devlogStore.ts`, `ModelSelector.tsx`, `AiProviderSettings.tsx`, `AppShell.tsx`, `settingsStore.ts`, `package.json`
> **Issues**: 8 issues (4 HIGH/MEDIUM, 4 LOW)
> **Risk**: Rendah — mostly UI feedback dan clean code, tidak ada perubahan arsitektur

---

## Issues yang Ditangani

| # | Severity | File | Masalah |
|---|----------|------|---------|
| 1 | HIGH | `ProjectScanner.tsx:74` | Silent import failures — scanner reset seolah sukses meski ada yang gagal |
| 2 | MEDIUM | `dateUtils.ts:6` | `calculateDaysSince` propagate NaN untuk date string invalid |
| 3 | MEDIUM | `devlogStore.ts:164` | Cache eviction labeled LRU tapi implementasinya FIFO |
| 4 | MEDIUM | `AiProviderSettings.tsx:72` | `loadProviderModel` terpanggil setiap keystroke karena sharing satu `useEffect` |
| 5 | LOW | `settingsStore.ts:43` | `saveApiKey` menolak diam-diam semua key non-OpenRouter |
| 6 | LOW | `AppShell.tsx:48` | Magic number `pt-[73px]` tidak terhubung ke header height |
| 7 | LOW | `ModelSelector.tsx:52` | Tidak ada empty state saat `models` kosong dan tidak loading |
| 8 | LOW | `package.json:13` | Tidak ada ESLint di CI |

---

## Step 1 — Surface Import Failures (ProjectScanner.tsx)

**Problem**: Loop `for...of` dengan inner `try/catch` menelan error per-project. Scanner direset seolah sukses bahkan jika semua import gagal. User tidak mendapat feedback.

**Fix**: Track jumlah failures dan tampilkan ke user:

```tsx
const handleImportSelected = async () => {
  if (selectedProjects.size === 0) return;

  const results = await Promise.allSettled(
    [...selectedProjects].map(async (path) => {
      const project: Project = await invoke('add_project', { path });
      addProject(project);
      return project;
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  const succeeded = results
    .filter((r): r is PromiseFulfilledResult<Project> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (failed.length > 0) {
    setError(`${failed.length} project(s) failed to import. ${succeeded.length} succeeded.`);
  }

  if (succeeded.length > 0) {
    onImportComplete?.(succeeded);
    setScannedProjects([]);
    setSelectedProjects(new Set());
  }
  // Jika semua gagal: scanner tetap terbuka sehingga user bisa retry
};
```

---

## Step 2 — Fix NaN Propagation (dateUtils.ts)

**Problem**: `calculateDaysSince('')` atau `calculateDaysSince('invalid')` menghasilkan `NaN` yang propagate ke `formatDaysSince` dan muncul sebagai `"NaN days ago"` di UI.

**Fix**: Tambahkan validasi input:

```typescript
export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn(`[calculateDaysSince] Invalid date string: "${dateString}"`);
    return 0; // safe default: treat as "today"
  }
  const diffTime = Math.abs(Date.now() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```

Return 0 ("Today") sebagai safe default — tidak membuat proyek terklasifikasi sebagai dormant secara salah.

---

## Step 3 — Fix FIFO Mislabeled as LRU (devlogStore.ts)

**Problem**: Cache eviction menggunakan `Object.keys()[0]` yang mengembalikan key pertama berdasarkan insertion order (FIFO). Komentar menyebutnya "LRU-like" yang menyesatkan.

**Dua opsi**:

**Opsi A** (mudah): Update komentar untuk mendeskripsikan FIFO secara akurat. Tidak mengubah behavior.
```typescript
// FIFO eviction: remove oldest inserted key when cache exceeds 10 entries
```

**Opsi B** (benar): Implementasi true LRU dengan Map yang mempertahankan insertion order dan move-to-end:
```typescript
cacheVersion: (hash, content) => set((state) => {
  const cache = new Map(Object.entries(state.versionCache));
  cache.delete(hash); // move to end if exists (true LRU)
  cache.set(hash, content);
  if (cache.size > 10) cache.delete(cache.keys().next().value!);
  return { versionCache: Object.fromEntries(cache) };
}),
```

**Rekomendasi**: Opsi B — cache ini digunakan untuk devlog version history (DEVLOG.md git versions). True LRU lebih tepat karena user lebih sering mengakses version yang baru-baru ini dilihat.

---

## Step 4 — Split useEffect di AiProviderSettings (AiProviderSettings.tsx)

**Problem**: Satu `useEffect` dengan dependency `debouncedModelQuery` memanggil baik `loadProviderModel` maupun `loadOpenRouterModels`. Setiap keystroke (setelah debounce) memicu `loadProviderModel` yang tidak perlu — model yang dipilih tidak berubah saat user search.

**Fix**: Pisah menjadi dua effect dengan dependency yang tepat:

```typescript
// Effect 1: load selected model hanya saat provider berubah
useEffect(() => {
  if (defaultProvider === 'openrouter') {
    void loadProviderModel('openrouter');
  }
}, [defaultProvider, loadProviderModel]);

// Effect 2: load model list saat query berubah
useEffect(() => {
  if (defaultProvider === 'openrouter') {
    void loadOpenRouterModels(debouncedModelQuery);
  }
}, [defaultProvider, loadOpenRouterModels, debouncedModelQuery]);
```

---

## Step 5 — Remove Hardcoded Key Prefix Validation (settingsStore.ts)

**Problem**: `if (!key || !key.startsWith('sk-or-v1-')) return false;` menolak diam-diam semua API key dari provider selain OpenRouter. Tidak ada error message ke user.

**Fix**: Hapus prefix check — delegate validasi ke backend yang sudah handle enkripsi dan validasi:

```typescript
saveApiKey: async (key: string) => {
  try {
    if (!key?.trim()) return false;
    await invoke('set_api_key', { key });
    set({ apiKey: key });
    return true;
  } catch (e) {
    console.error('Failed to save API key:', e);
    return false;
  }
},
```

> **Catatan**: `settingsStore.saveApiKey` ini adalah store lama (sebelum ada `aiStore.saveApiKey`). Pastikan tidak ada regresi — audit consumer dari kedua `saveApiKey`. Pertimbangkan untuk menyatukan ke satu store di Plan B Step 3.

---

## Step 6 — Replace Magic Number pt-[73px] (AppShell.tsx)

**Problem**: `pt-[73px]` harus disinkronkan manual dengan tinggi header yang sebenarnya.

**Fix** (pilih salah satu):

**Opsi A** — Tailwind config token:
```typescript
// tailwind.config.ts
theme: {
  extend: {
    spacing: { 'header': '73px' }
  }
}
// AppShell.tsx
<main className="flex-1 overflow-auto animate-fade-in pt-header">
```

**Opsi B** — CSS variable (lebih dinamis):
```tsx
// Header component: style={{ '--header-height': `${ref.current.offsetHeight}px` } as CSSProperties}
// AppShell.tsx: style={{ paddingTop: 'var(--header-height)' }}
```

**Rekomendasi**: Opsi A — lebih sederhana dan konsisten dengan Tailwind yang sudah digunakan. Cukup satu perubahan di config dan satu perubahan di AppShell.

---

## Step 7 — Add Empty State ke ModelSelector (ModelSelector.tsx)

**Problem**: Saat `models` array kosong (query tidak ada hasil, atau belum loaded), `SelectContent` merender dropdown kosong tanpa feedback.

**Fix**: Tambahkan conditional render:

```tsx
<SelectContent>
  {models.length === 0 ? (
    <div className="py-4 text-center text-sm text-muted-foreground">
      {isLoading ? 'Loading models...' : 'No models found'}
    </div>
  ) : (
    models.map((model) => (
      <SelectItem key={model.id} value={model.id}>
        <div className="flex flex-col">
          <span>{model.name}</span>
          <span className="text-xs text-muted-foreground">{model.id}</span>
        </div>
      </SelectItem>
    ))
  )}
</SelectContent>
```

---

## Step 8 — Add ESLint ke CI (package.json)

**Problem**: Script `lint` hanya menjalankan `tsc --noEmit`. Tidak ada ESLint — issues seperti missing `exhaustive-deps`, unused variables, dan magic numbers tidak terdeteksi di CI.

**Fix**:

1. Install dependencies:
```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks eslint-plugin-react-refresh
```

2. Buat `eslint.config.js` (ESLint v9 flat config):
```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: { parser: tsparser },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
```

3. Update `package.json`:
```json
"lint": "tsc --noEmit && eslint src --max-warnings 0"
```

> **Catatan**: Pastikan existing codebase lolos ESLint sebelum `--max-warnings 0` di-enforce di CI. Mulai dengan `--max-warnings 50` lalu turunkan secara bertahap.

---

## Testing Checklist

- [ ] `ProjectScanner`: test skenario partial failure (2 dari 5 gagal) — error message harus muncul, 3 project berhasil diimport
- [ ] `ProjectScanner`: test skenario semua gagal — scanner tidak direset, error message ditampilkan
- [ ] `calculateDaysSince`: test dengan string kosong `""` → return 0
- [ ] `calculateDaysSince`: test dengan `"invalid-date"` → return 0
- [ ] `ModelSelector`: test render saat `models=[]` dan `isLoading=false` → tampil "No models found"
- [ ] `AiProviderSettings`: verifikasi `loadProviderModel` tidak dipanggil saat model query berubah
- [ ] ESLint: pastikan `npm run lint` pass di CI tanpa error baru
