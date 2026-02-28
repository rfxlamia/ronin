# Plan C — UI & Clean Code Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 issues dari code review — UX feedback, NaN propagation, false LRU label, redundant effect call, hardcoded key prefix, magic number, empty state UI, dan setup ESLint.

**Architecture:** Setiap task independent, tidak ada shared state antar perubahan. Semua perubahan bersifat additive atau replace minimal — tidak ada refactoring arsitektur. Urutan aman: utils → stores → components → config.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest + Testing Library, Tailwind CSS v4 (config via `@theme` di `src/index.css`), ESLint v9 flat config.

---

## Task 1: Fix NaN Propagation di dateUtils

**Files:**
- Modify: `src/lib/utils/dateUtils.ts:6-11`
- Create: `src/lib/utils/dateUtils.test.ts`

**Step 1: Tulis failing test**

```typescript
// src/lib/utils/dateUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDaysSince, formatDaysSince } from './dateUtils';

describe('calculateDaysSince', () => {
  it('returns 0 for empty string without throwing', () => {
    expect(calculateDaysSince('')).toBe(0);
  });

  it('returns 0 for invalid date string without throwing', () => {
    expect(calculateDaysSince('not-a-date')).toBe(0);
  });

  it('returns correct days for valid ISO date', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(calculateDaysSince(yesterday)).toBe(1);
  });

  it('formatDaysSince does not render NaN for invalid input', () => {
    // NaN dari calculateDaysSince lama akan merender "NaN days ago"
    const days = calculateDaysSince('invalid');
    expect(formatDaysSince(days)).toBe('Today');
  });
});
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
vitest run src/lib/utils/dateUtils.test.ts
```

Expected: FAIL — "returns 0 for empty string" dan "returns 0 for invalid date" gagal karena `calculateDaysSince` mengembalikan `NaN`.

**Step 3: Implementasi fix**

```typescript
// src/lib/utils/dateUtils.ts
export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn(`[calculateDaysSince] Invalid date string: "${dateString}"`);
    return 0;
  }
  const diffTime = Math.abs(Date.now() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```

Fungsi `formatDaysSince` tidak perlu diubah — return 0 akan diformat sebagai "Today".

**Step 4: Jalankan test — pastikan PASS**

```bash
vitest run src/lib/utils/dateUtils.test.ts
```

Expected: PASS semua 4 test.

**Step 5: Commit**

```bash
git add src/lib/utils/dateUtils.ts src/lib/utils/dateUtils.test.ts
git commit -m "fix(utils): guard calculateDaysSince against invalid date strings"
```

---

## Task 2: Fix Cache Eviction FIFO Mislabeled LRU di devlogStore

**Files:**
- Modify: `src/stores/devlogStore.ts:164-173`
- Test: `src/stores/devlogStore.test.ts`

**Step 1: Tulis failing test**

Cari describe block yang tepat di `devlogStore.test.ts`. Tambahkan test berikut di dalam describe `cacheVersion`:

```typescript
it('implements true LRU — evicts least recently accessed, not least recently inserted', () => {
  // Fill cache to 10 items
  for (let i = 1; i <= 10; i++) {
    useDevlogStore.getState().cacheVersion(`hash${i}`, `content${i}`);
  }

  // Access hash1 to make it recently used
  useDevlogStore.getState().cacheVersion('hash1', 'content1-updated');

  // Add item 11 — should evict hash2 (LRU), not hash1
  useDevlogStore.getState().cacheVersion('hash11', 'content11');

  const cache = useDevlogStore.getState().versionCache;
  expect(Object.keys(cache)).toContain('hash1');  // recently used → kept
  expect(Object.keys(cache)).not.toContain('hash2'); // LRU → evicted
  expect(Object.keys(cache)).toContain('hash11'); // newest → kept
});
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
vitest run src/stores/devlogStore.test.ts
```

Expected: FAIL — implementasi lama adalah FIFO, bukan LRU, jadi `hash1` (bukan `hash2`) yang dievict.

**Step 3: Implementasi true LRU dengan Map**

```typescript
// src/stores/devlogStore.ts — ganti cacheVersion:
cacheVersion: (hash, content) => set((state) => {
  // Map preserves insertion order — delete then re-insert = move to end (most recently used)
  const cache = new Map(Object.entries(state.versionCache));
  cache.delete(hash);
  cache.set(hash, content);
  if (cache.size > 10) {
    cache.delete(cache.keys().next().value!); // evict least recently used (first entry)
  }
  return { versionCache: Object.fromEntries(cache) };
}),
```

**Step 4: Jalankan test — pastikan PASS**

```bash
vitest run src/stores/devlogStore.test.ts
```

Expected: PASS semua test termasuk test LRU baru.

**Step 5: Commit**

```bash
git add src/stores/devlogStore.ts src/stores/devlogStore.test.ts
git commit -m "fix(devlogStore): implement true LRU cache eviction using Map insertion order"
```

---

## Task 3: Fix Silent Import Failures di ProjectScanner

**Files:**
- Modify: `src/components/Dashboard/ProjectScanner.tsx:60-91`
- Test: `src/components/Dashboard/ProjectScanner.test.tsx`

**Step 1: Tulis failing test**

Tambahkan test baru di dalam describe `Error Handling` di `ProjectScanner.test.tsx`:

```typescript
it('shows error count when some imports fail but others succeed', async () => {
  const mockProjects = [
    { path: '/home/user/projects/p1', name: 'p1' },
    { path: '/home/user/projects/p2', name: 'p2' },
    { path: '/home/user/projects/p3', name: 'p3' },
  ];

  mockInvoke
    .mockResolvedValueOnce(mockProjects) // scan_projects
    .mockRejectedValueOnce(new Error('Disk error'))  // p1 fails
    .mockResolvedValueOnce({ id: 2, path: '/home/user/projects/p2', name: 'p2', type: 'git', created_at: '', updated_at: '' })
    .mockResolvedValueOnce({ id: 3, path: '/home/user/projects/p3', name: 'p3', type: 'git', created_at: '', updated_at: '' });

  render(<ProjectScanner />);
  fireEvent.click(getScanButton());
  await waitFor(() => { expect(screen.getByText('p1')).toBeInTheDocument(); });

  fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

  await waitFor(() => {
    expect(screen.getByText(/1 project\(s\) failed to import/)).toBeInTheDocument();
  });
});

it('keeps scanner open when ALL imports fail', async () => {
  const mockProjects = [{ path: '/home/user/projects/p1', name: 'p1' }];

  mockInvoke
    .mockResolvedValueOnce(mockProjects)
    .mockRejectedValueOnce(new Error('Disk error'));

  render(<ProjectScanner />);
  fireEvent.click(getScanButton());
  await waitFor(() => { expect(screen.getByText('p1')).toBeInTheDocument(); });

  fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

  await waitFor(() => {
    // Scanner list masih terlihat (tidak direset)
    expect(screen.getByText('p1')).toBeInTheDocument();
    expect(screen.getByText(/failed to import/)).toBeInTheDocument();
  });
});
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
vitest run src/components/Dashboard/ProjectScanner.test.tsx
```

Expected: 2 test baru FAIL — implementasi lama tidak menampilkan error count dan selalu reset scanner.

**Step 3: Implementasi `handleImportSelected` dengan `Promise.allSettled`**

```typescript
// src/components/Dashboard/ProjectScanner.tsx — ganti handleImportSelected:
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
  // Jika semua gagal: scanner tetap terbuka agar user bisa retry
};
```

Hapus juga outer try/catch lama karena `Promise.allSettled` tidak pernah throw.

**Step 4: Jalankan test — pastikan PASS**

```bash
vitest run src/components/Dashboard/ProjectScanner.test.tsx
```

Expected: PASS semua test termasuk 2 test baru.

**Step 5: Commit**

```bash
git add src/components/Dashboard/ProjectScanner.tsx src/components/Dashboard/ProjectScanner.test.tsx
git commit -m "fix(ProjectScanner): surface partial import failures with error count using Promise.allSettled"
```

---

## Task 4: Fix Redundant `loadProviderModel` Call di AiProviderSettings

**Files:**
- Modify: `src/components/settings/AiProviderSettings.tsx:71-77`
- Test: `src/components/settings/AiProviderSettings.test.tsx`

**Step 1: Tulis failing test**

Cari area test yang sesuai di `AiProviderSettings.test.tsx`. Tambahkan test berikut:

```typescript
it('does NOT call loadProviderModel when model search query changes', async () => {
  const loadProviderModel = vi.fn();
  const loadOpenRouterModels = vi.fn();

  useAiStore.setState({
    loadProviderModel,
    loadOpenRouterModels,
    defaultProvider: 'openrouter',
  });

  render(<AiProviderSettings />);

  // Wait for initial mount effects
  await waitFor(() => {
    expect(loadProviderModel).toHaveBeenCalledTimes(1); // only on mount
  });

  // Simulate typing in model search (triggers debouncedModelQuery change)
  const searchInput = screen.getByTestId('model-search');
  fireEvent.change(searchInput, { target: { value: 'gpt' } });

  // After debounce, loadOpenRouterModels should be called but NOT loadProviderModel again
  await new Promise((r) => setTimeout(r, 400)); // wait for debounce (300ms)

  expect(loadProviderModel).toHaveBeenCalledTimes(1); // still 1, not called again
  expect(loadOpenRouterModels).toHaveBeenCalledWith('gpt');
});
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
vitest run src/components/settings/AiProviderSettings.test.tsx
```

Expected: FAIL — implementasi lama satu `useEffect` memanggil `loadProviderModel` setiap kali `debouncedModelQuery` berubah.

**Step 3: Pisah satu useEffect menjadi dua**

```typescript
// src/components/settings/AiProviderSettings.tsx — ganti useEffect gabungan (baris 71-77):

// Effect 1: Load selected model hanya saat provider berubah
useEffect(() => {
  if (defaultProvider === 'openrouter') {
    void loadProviderModel('openrouter');
  }
}, [defaultProvider, loadProviderModel]);

// Effect 2: Load model list saat search query berubah
useEffect(() => {
  if (defaultProvider === 'openrouter') {
    void loadOpenRouterModels(debouncedModelQuery);
  }
}, [defaultProvider, loadOpenRouterModels, debouncedModelQuery]);
```

**Step 4: Jalankan test — pastikan PASS**

```bash
vitest run src/components/settings/AiProviderSettings.test.tsx
```

Expected: PASS semua test.

**Step 5: Commit**

```bash
git add src/components/settings/AiProviderSettings.tsx src/components/settings/AiProviderSettings.test.tsx
git commit -m "fix(AiProviderSettings): split useEffect to prevent redundant loadProviderModel calls on search"
```

---

## Task 5: Remove Hardcoded Key Prefix di settingsStore

**Files:**
- Modify: `src/stores/settingsStore.ts:40-53`
- Test: `src/stores/settingsStore.test.ts`

**Step 1: Tulis failing test**

Tambahkan di dalam `describe('saveApiKey')`:

```typescript
it('accepts keys that do not start with sk-or-v1- prefix', async () => {
  const mockInvoke = vi.mocked(invoke);
  mockInvoke.mockResolvedValue(undefined);

  const result = await useSettingsStore.getState().saveApiKey('sk-ant-abc123');

  expect(result).toBe(true); // sekarang false karena prefix check
  expect(mockInvoke).toHaveBeenCalledWith('set_api_key', { key: 'sk-ant-abc123' });
});

it('rejects empty or whitespace-only key', async () => {
  const result = await useSettingsStore.getState().saveApiKey('   ');
  expect(result).toBe(false);
});
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
vitest run src/stores/settingsStore.test.ts
```

Expected: FAIL — `saveApiKey('sk-ant-abc123')` mengembalikan `false` karena prefix check lama.

**Step 3: Hapus prefix check, delegate ke backend**

```typescript
// src/stores/settingsStore.ts — ganti saveApiKey:
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

**Step 4: Jalankan test — pastikan PASS**

```bash
vitest run src/stores/settingsStore.test.ts
```

Expected: PASS semua test.

**Step 5: Commit**

```bash
git add src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "fix(settingsStore): remove hardcoded sk-or-v1- prefix check, delegate validation to backend"
```

---

## Task 6: Replace Magic Number `pt-[73px]` di AppShell

**Files:**
- Modify: `src/index.css` — tambah spacing token di `@theme`
- Modify: `src/components/AppShell.tsx:48`
- Test: `src/components/AppShell.test.tsx`

**Step 1: Baca test AppShell yang ada dulu**

Sebelum menulis test, baca dulu `src/components/AppShell.test.tsx` untuk tahu apa yang sudah ada.

**Step 2: Tambahkan spacing token di `@theme` block di `src/index.css`**

Tambahkan di dalam `@theme { }` (setelah `--radius` tokens):

```css
/* Layout Spacing */
--spacing-header: 73px;
```

Catatan: Tailwind v4 memetakan `--spacing-{name}` ke class `pt-{name}`, `mt-{name}`, dst.

**Step 3: Update `AppShell.tsx`**

```tsx
// Baris 48 — ganti:
<main className="flex-1 overflow-auto animate-fade-in pt-[73px]">
// Menjadi:
<main className="flex-1 overflow-auto animate-fade-in pt-header">
```

**Step 4: Verifikasi secara visual (opsional)**

Jalankan `npm run tauri dev` dan pastikan header tidak overlap konten.

**Step 5: Jalankan semua test terkait**

```bash
vitest run src/components/AppShell.test.tsx
```

Expected: PASS — tidak ada perubahan behavior, hanya CSS class yang berubah.

**Step 6: Commit**

```bash
git add src/index.css src/components/AppShell.tsx
git commit -m "fix(AppShell): replace magic number pt-[73px] with semantic spacing token pt-header"
```

---

## Task 7: Add Empty State ke ModelSelector

**Files:**
- Modify: `src/components/settings/ModelSelector.tsx:52-61`
- Test: `src/components/settings/ModelSelector.test.tsx`

**Step 1: Tulis failing test**

Tambahkan test di `ModelSelector.test.tsx`:

```typescript
it('shows "No models found" when models array is empty and not loading', () => {
  render(
    <ModelSelector
      value={null}
      models={[]}
      query="xyz-not-found"
      onQueryChange={vi.fn()}
      onSelect={vi.fn()}
      isLoading={false}
    />
  );

  expect(screen.getByText('No models found')).toBeInTheDocument();
});

it('shows "Loading models..." when models array is empty and isLoading is true', () => {
  render(
    <ModelSelector
      value={null}
      models={[]}
      query=""
      onQueryChange={vi.fn()}
      onSelect={vi.fn()}
      isLoading={true}
    />
  );

  expect(screen.getByText('Loading models...')).toBeInTheDocument();
});
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
vitest run src/components/settings/ModelSelector.test.tsx
```

Expected: FAIL — "No models found" dan "Loading models..." tidak dirender saat `models=[]`.

**Step 3: Tambahkan empty state di `SelectContent`**

```tsx
// src/components/settings/ModelSelector.tsx — ganti SelectContent:
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

**Step 4: Jalankan test — pastikan PASS**

```bash
vitest run src/components/settings/ModelSelector.test.tsx
```

Expected: PASS semua test.

**Step 5: Commit**

```bash
git add src/components/settings/ModelSelector.tsx src/components/settings/ModelSelector.test.tsx
git commit -m "fix(ModelSelector): add empty state for no results and loading state"
```

---

## Task 8: Setup ESLint

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` — update `lint` script dan `devDependencies`

**Step 1: Install ESLint dan plugins**

```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks eslint-plugin-react-refresh
```

**Step 2: Buat `eslint.config.js` (ESLint v9 flat config)**

```javascript
// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist/**', 'src-tauri/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // project uses console.error/warn intentionally
    },
  },
];
```

**Step 3: Jalankan ESLint untuk lihat baseline warning**

```bash
npx eslint src --max-warnings 9999 2>&1 | tail -20
```

Catat jumlah warning. Jika ada error (bukan warning), fix dulu sebelum lanjut.

**Step 4: Update `package.json` lint script**

```json
"lint": "tsc --noEmit && eslint src"
```

Catatan: Mulai tanpa `--max-warnings 0` — tambahkan setelah semua existing warning dibersihkan di sprint berikutnya.

**Step 5: Verifikasi lint script berjalan**

```bash
npm run lint
```

Expected: TypeScript pass, ESLint berjalan (mungkin ada warning, tapi tidak crash).

**Step 6: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore(lint): add ESLint v9 with TypeScript and React Hooks plugins"
```

---

## Task 9: Jalankan Full Test Suite

**Step 1: Jalankan semua test**

```bash
npm test
```

Expected: PASS — tidak ada regresi dari perubahan Plan C.

**Step 2: Jika ada failure, investigate dulu**

Lihat file test yang fail, baca error message. Jangan langsung hapus atau skip test.

**Step 3: Commit final jika ada cleanup kecil**

```bash
git add -A
git commit -m "test: verify all Plan C changes pass full test suite"
```

---

## Testing Checklist Summary

- [ ] `dateUtils`: `calculateDaysSince('')` → 0, bukan NaN
- [ ] `dateUtils`: `calculateDaysSince('invalid')` → 0, bukan NaN
- [ ] `devlogStore`: LRU evicts least-recently-accessed, bukan oldest-inserted
- [ ] `ProjectScanner`: partial failure (1/3 fail) → error message muncul, 2 project imported
- [ ] `ProjectScanner`: semua gagal → scanner tidak direset, error ditampilkan
- [ ] `AiProviderSettings`: `loadProviderModel` tidak dipanggil saat model query berubah
- [ ] `settingsStore`: `saveApiKey('sk-ant-abc123')` → `true` (tidak ditolak karena prefix)
- [ ] `ModelSelector`: `models=[]` + `isLoading=false` → "No models found"
- [ ] `ModelSelector`: `models=[]` + `isLoading=true` → "Loading models..."
- [ ] `AppShell`: header tidak overlap konten (visual check)
- [ ] `npm run lint` → tidak ada error baru

---

## Urutan Eksekusi yang Disarankan

Urutan berdasarkan risiko dan dependensi:
1. Task 1 (dateUtils) — utils murni, paling aman
2. Task 2 (devlogStore LRU) — store, isolated
3. Task 3 (ProjectScanner) — komponen, ada existing tests
4. Task 5 (settingsStore prefix) — hapus validasi, verify backend cukup
5. Task 4 (AiProviderSettings effects) — split useEffect
6. Task 7 (ModelSelector empty state) — UI additive
7. Task 6 (AppShell magic number) — CSS token, visual verify
8. Task 8 (ESLint setup) — tooling, tidak affect runtime
9. Task 9 (full suite) — verifikasi akhir
