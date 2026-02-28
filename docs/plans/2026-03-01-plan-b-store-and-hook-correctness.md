# Plan B — Store & Hook Correctness

> **Scope**: `src/stores/aiStore.ts`, `src/stores/settingsStore.ts`, `src/hooks/useAiContext.ts`, `src/hooks/useGitStatus.ts`, `src/stores/projectStore.ts`
> **Issues**: 7 issues (1 CRITICAL, 4 HIGH, 2 MEDIUM)
> **Risk**: Menyentuh core state management — perlu test coverage yang baik

---

## Issues yang Ditangani

| # | Severity | File | Masalah |
|---|----------|------|---------|
| 1 | CRITICAL | `aiStore.ts:64` | `localStorage` akses synchronous saat module evaluation |
| 2 | HIGH | `aiStore.ts:178` | Expiry 24 jam ditulis tapi tidak pernah dibaca |
| 3 | HIGH | `settingsStore.ts:34` | Decrypted API key disimpan di Zustand state (JS heap) |
| 4 | HIGH | `useAiContext.ts:185` | Cleanup async tanpa `.catch()`, listener bisa aktif post-unmount |
| 5 | HIGH | `projectStore.ts:104` | 3 subscription independen tanpa `useShallow` |
| 6 | MEDIUM | `useGitStatus.ts:37` | Tidak ada debounce pada focus/visibility refetch |
| 7 | MEDIUM | `useAiContext.ts:96` | `String(error)` menambah prefix `"Error: "` sehingga `startsWith('OFFLINE:')` gagal |

---

## Step 1 — Fix localStorage di Module Eval Time (aiStore.ts)

**Problem**: `localStorage.getItem('demo-upgrade-dismissed') === 'true'` dipanggil sebagai nilai inisialisasi field di `create<AiStore>()` — dievaluasi synchronous saat module pertama kali di-import. Menyebabkan test pollution di jsdom dan akan throw di SSR.

**Fix**: Wrap dalam fungsi yang dipanggil lazy:

```typescript
function getInitialUpgradePromptDismissed(): boolean {
  try {
    const dismissedUntil = localStorage.getItem('demo-upgrade-dismissed-until');
    if (!dismissedUntil) return false;
    return Date.now() < parseInt(dismissedUntil, 10);
  } catch {
    return false;
  }
}

export const useAiStore = create<AiStore>((set, get) => ({
  // ...
  upgradePromptDismissed: getInitialUpgradePromptDismissed(),
  // ...
}));
```

> Ini sekaligus menyelesaikan Step 2 (expiry logic never read) dalam satu fungsi.

---

## Step 2 — Fix Expiry Logic Never Read (aiStore.ts)

**Problem**: `dismissUpgradePrompt` (baris 178) menulis `demo-upgrade-dismissed` (boolean) dan `demo-upgrade-dismissed-until` (timestamp). Tapi inisialisasi store hanya membaca key boolean — expiry tidak pernah dicek, sehingga dismissal bersifat permanen.

**Fix**: Sudah terselesaikan di Step 1 — fungsi `getInitialUpgradePromptDismissed` membaca `demo-upgrade-dismissed-until` dan membandingkan dengan `Date.now()`.

Juga: di `dismissUpgradePrompt`, hapus penulisan key boolean yang tidak lagi dibaca:
```typescript
dismissUpgradePrompt: () => {
  const dismissedUntil = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem('demo-upgrade-dismissed-until', dismissedUntil.toString());
  // Hapus: localStorage.setItem('demo-upgrade-dismissed', 'true');
  set({ upgradePromptDismissed: true });
},
```

---

## Step 3 — Fix API Key di Plain Zustand State (settingsStore.ts)

**Problem**: `loadApiKey` menyimpan decrypted key ke `set({ apiKey: key })`. Zustand state ada di JS heap, accessible via DevTools atau ekstensi browser. `saveApiKey` juga menyimpan key yang sama.

**Pendekatan**: Ini adalah `settingsStore` lama yang sudah ada sebelum `aiStore` (dengan `getApiKeyStatus` yang mengembalikan masked key). Dua store menyimpan key dengan cara berbeda — ini duplikasi.

**Fix**:
1. Hapus field `apiKey` dari `SettingsState` interface
2. Hapus `set({ apiKey: key })` dari `loadApiKey` dan `saveApiKey`
3. Untuk display: gunakan `aiStore.getApiKeyStatus(providerId)` yang sudah mengembalikan masked key
4. Untuk operasi yang butuh key (test connection): `testApiKey` sudah benar — menerima key sebagai parameter transient, tidak menyimpannya

```typescript
// SEBELUM
interface SettingsState {
  apiKey: string | null;
  // ...
  loadApiKey: () => Promise<void>;
  saveApiKey: (key: string) => Promise<boolean>;
}

// SESUDAH — hapus apiKey dari state
interface SettingsState {
  // apiKey dihapus
  // ...
  // loadApiKey masih ada tapi tidak menyimpan key ke state
}
```

> **Perlu audit**: Cari semua consumer `useSettingsStore(s => s.apiKey)` dan update ke `aiStore.getApiKeyStatus` atau terima key dari prop/input langsung.

---

## Step 4 — Fix Unhandled Promise Cleanup (useAiContext.ts)

**Problem**: Cleanup function di `useEffect` memanggil `unlistenPromises.then(...)` tanpa `.catch()`. Jika Promise reject (listener registration gagal), error ditelan diam-diam. Jika komponen unmount sebelum Promise resolve, callback `.then()` bisa fire post-unmount dan memanggil `setState` pada komponen yang sudah unmount.

**Fix**: Gunakan `isMounted` flag + async setup + `.catch()`:

```typescript
useEffect(() => {
  if (!projectId) return;

  let isMounted = true;
  const unlistenFns: Array<() => void> = [];

  generateContext();

  const setup = async () => {
    try {
      const [unChunk, unComplete, unError] = await Promise.all([
        listen('ai-chunk', handleChunk),
        listen('ai-complete', handleComplete),
        listen('ai-error', handleError),
      ]);
      if (isMounted) {
        unlistenFns.push(unChunk, unComplete, unError);
      } else {
        // Komponen sudah unmount saat listener terdaftar
        unChunk(); unComplete(); unError();
      }
    } catch (err) {
      console.error('[useAiContext] Failed to register listeners:', err);
    }
  };

  setup();
  return () => {
    isMounted = false;
    unlistenFns.forEach((fn) => fn());
  };
}, [projectId, generateContext]);
```

Pisahkan handler (`handleChunk`, `handleComplete`, `handleError`) ke `useCallback` agar dependency array `useEffect` stabil.

---

## Step 5 — Fix Triple Subscriptions (projectStore.ts)

**Problem**: `useFilteredProjects` membuat 3 subscription terpisah ke Zustand store. Masing-masing subscription berpotensi trigger re-render independen.

**Fix**: Gunakan `useShallow` untuk satu selector yang mengekstrak semua yang dibutuhkan:

```typescript
import { useShallow } from 'zustand/react/shallow';

export const useFilteredProjects = (): Project[] =>
  useProjectStore(
    useShallow(({ projects, searchQuery, filterStatus }) =>
      projects.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          filterStatus === 'all' ? !p.isArchived
          : filterStatus === 'archived' ? p.isArchived
          : !p.isArchived && p.healthStatus === filterStatus;
        return matchesSearch && matchesStatus;
      })
    )
  );
```

`useShallow` melakukan shallow equality check pada array hasil filter — component hanya re-render jika isi array benar-benar berubah.

---

## Step 6 — Add Debounce ke useGitStatus (useGitStatus.ts)

**Problem**: `visibilitychange` dan `focus` bisa fire bersamaan saat window focus, masing-masing langsung memanggil `fetchStatus()`. Dengan N `ProjectCard` masing-masing mount hook ini, satu focus event → N×2 backend calls.

**Fix**: Gunakan `useDebounce` hook yang sudah ada di codebase:

```typescript
import { useDebounce } from '@/hooks/useDebounce';

// Di dalam hook:
const [refetchTrigger, setRefetchTrigger] = useState(0);
const debouncedTrigger = useDebounce(refetchTrigger, 300);

useEffect(() => {
  if (debouncedTrigger > 0) fetchStatus();
}, [debouncedTrigger, fetchStatus]);

// Di event handlers:
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') setRefetchTrigger(t => t + 1);
};
const handleFocus = () => {
  setRefetchTrigger(t => t + 1);
};
```

Alternatif lebih sederhana: gunakan `useRef` untuk store timeout ID tanpa state tambahan.

---

## Step 7 — Fix String(error) Prefix Matching (useAiContext.ts)

**Problem**: Di `catch` block `generateContext` (baris 94–103), `String(error)` pada `Error` object menghasilkan `"Error: OFFLINE: ..."` — prefix `"Error: "` menyebabkan `parseError` yang cek `startsWith('OFFLINE:')` gagal match.

**Fix**: Ekstrak message dari Error object terlebih dahulu:

```typescript
} catch (error) {
  console.error('Failed to invoke generate_context:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  const parsed = parseError(errorMessage);
  setState((prev) => ({
    ...prev,
    contextState: 'error',
    error: errorMessage,
    parsedError: parsed,
  }));
}
```

---

## Testing Checklist

- [ ] `aiStore`: test bahwa `upgradePromptDismissed` false ketika `demo-upgrade-dismissed-until` expired
- [ ] `aiStore`: test bahwa `upgradePromptDismissed` true ketika `demo-upgrade-dismissed-until` masih valid
- [ ] `settingsStore`: verifikasi tidak ada consumer `apiKey` yang break setelah field dihapus
- [ ] `useAiContext`: test cleanup saat unmount sebelum Promise resolve (gunakan vi.useFakeTimers)
- [ ] `useFilteredProjects`: pastikan tidak ada regresi pada filter logic
- [ ] `useGitStatus`: verifikasi debounce mencegah double-call saat rapid focus events
- [ ] `parseError`: tambah test case untuk `Error("OFFLINE: ...")` — harus menghasilkan `kind: 'offline'`
