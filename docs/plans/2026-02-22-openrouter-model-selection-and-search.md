# OpenRouter Model Selection & Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove hardcoded OpenRouter model selection by letting users choose a model in Settings, and search available OpenRouter models before selecting.

**Architecture:** Keep provider selection as-is, add provider-model setting (`settings` key-value), and fetch model catalog from OpenRouter `/api/v1/models` via new Tauri commands. Persist selected model in SQLite, load it into `generate_context`, and keep current fallback resilience by trying selected model first then existing fallback models.

**Tech Stack:** Tauri (Rust), `reqwest`, `rusqlite`, React 19, Zustand, shadcn/ui (`Input`, `Select`), Vitest, Cargo test.

---

## Baseline Konfigurasi Saat Ini (hasil audit)

- Hardcoded fallback model list ada di `src-tauri/src/ai/providers/openrouter.rs:25-31`.
- Runtime context generation selalu membangun provider tanpa model preference di `src-tauri/src/commands/ai.rs:327-331`.
- Provider default tersimpan di setting key `ai_provider_default` (lihat `src-tauri/src/commands/settings.rs:63` dan `src-tauri/src/db.rs:314`).
- API key provider disimpan di `api_key_<provider>` (lihat `src-tauri/src/commands/settings.rs:148`).
- Endpoint OpenRouter models sudah dipakai untuk test koneksi di `src-tauri/src/commands/settings.rs:251-259`.

## Execution Rules

- Gunakan @superpowers:test-driven-development untuk semua perubahan behavior.
- Jalankan verifikasi akhir dengan @superpowers:verification-before-completion sebelum klaim selesai.
- Gunakan commit kecil per task (1 task = 1 commit).

### Task 1: Backend Settings Contract untuk Selected Model + OpenRouter Models API

**Files:**
- Modify: `src-tauri/src/commands/settings.rs:1-276`
- Modify: `src-tauri/src/lib.rs:131-175`
- Test: `src-tauri/src/commands/settings.rs:278-640`

**Step 1: Write the failing test**

Tambahkan test baru di `src-tauri/src/commands/settings.rs`:

```rust
#[test]
fn test_set_and_get_provider_model_roundtrip() {
    let (test_dir, pool) = create_test_db();
    let conn = pool.get().unwrap();

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_model_openrouter', ?1)",
        rusqlite::params!["z-ai/glm-4.5-air:free"],
    )
    .unwrap();

    let selected: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_model_openrouter'",
            [],
            |row| row.get(0),
        )
        .optional()
        .unwrap();

    assert_eq!(selected, Some("z-ai/glm-4.5-air:free".to_string()));
    std::fs::remove_dir_all(test_dir).ok();
}

#[test]
fn test_filter_openrouter_models_by_query_and_limit() {
    let models = vec![
        OpenRouterModelSummary {
            id: "z-ai/glm-4.5-air:free".to_string(),
            name: "GLM 4.5 Air".to_string(),
            description: Some("fast".to_string()),
            context_length: Some(128000),
            prompt_price: Some("0".to_string()),
            completion_price: Some("0".to_string()),
        },
        OpenRouterModelSummary {
            id: "openai/gpt-oss-20b:free".to_string(),
            name: "GPT OSS 20B".to_string(),
            description: Some("oss".to_string()),
            context_length: Some(131072),
            prompt_price: Some("0".to_string()),
            completion_price: Some("0".to_string()),
        },
    ];

    let filtered = filter_openrouter_models(models, Some("glm"), 10);
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].id, "z-ai/glm-4.5-air:free");
}
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd src-tauri && cargo test commands::settings::tests::test_filter_openrouter_models_by_query_and_limit -- --nocapture
```

Expected: FAIL dengan error seperti `cannot find type OpenRouterModelSummary` atau `cannot find function filter_openrouter_models`.

**Step 3: Write minimal implementation**

Tambahkan command dan model DTO di `src-tauri/src/commands/settings.rs`:

```rust
const OPENROUTER_MODEL_KEY: &str = "ai_model_openrouter";
const DEFAULT_OPENROUTER_MODEL: &str = "xiaomi/mimo-v2-flash:free";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OpenRouterModelSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub context_length: Option<u32>,
    pub prompt_price: Option<String>,
    pub completion_price: Option<String>,
}

#[tauri::command]
pub async fn get_provider_model(
    provider_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<String, String> {
    if provider_id != "openrouter" {
        return Err("Model selection currently supports OpenRouter only".to_string());
    }

    let conn = pool.get().map_err(|_| "Unable to access application data".to_string())?;

    let selected: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![OPENROUTER_MODEL_KEY],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query provider model: {}", e))?;

    Ok(selected.unwrap_or_else(|| DEFAULT_OPENROUTER_MODEL.to_string()))
}

#[tauri::command]
pub async fn set_provider_model(
    provider_id: String,
    model_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    if provider_id != "openrouter" {
        return Err("Model selection currently supports OpenRouter only".to_string());
    }
    if model_id.trim().is_empty() {
        return Err("Model ID cannot be empty".to_string());
    }

    let conn = pool.get().map_err(|_| "Unable to access application data".to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![OPENROUTER_MODEL_KEY, model_id.trim()],
    )
    .map_err(|e| format!("Failed to set provider model: {}", e))?;

    Ok(())
}
```

Tambahkan juga parser + filter helper untuk endpoint `/api/v1/models`, command `get_openrouter_models`, dan register command baru di `src-tauri/src/lib.rs`:

```rust
commands::settings::get_provider_model,
commands::settings::set_provider_model,
commands::settings::get_openrouter_models,
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd src-tauri && cargo test commands::settings::tests::test_set_and_get_provider_model_roundtrip -- --nocapture
cd src-tauri && cargo test commands::settings::tests::test_filter_openrouter_models_by_query_and_limit -- --nocapture
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/commands/settings.rs src-tauri/src/lib.rs
git commit -m "feat(settings): add provider model persistence and openrouter model listing commands"
```

### Task 2: Runtime Wiring - Gunakan Selected Model Saat `generate_context`

**Files:**
- Modify: `src-tauri/src/commands/ai.rs:252-361`
- Modify: `src-tauri/src/ai/providers/openrouter.rs:12-179`
- Test: `src-tauri/src/ai/providers/openrouter.rs:182-204`

**Step 1: Write the failing test**

Tambahkan test di `src-tauri/src/ai/providers/openrouter.rs`:

```rust
#[test]
fn test_build_model_candidates_prefers_selected_without_duplicates() {
    let selected = "z-ai/glm-4.5-air:free";
    let candidates = OpenRouterProvider::build_model_candidates(Some(selected));

    assert_eq!(candidates.first().unwrap(), selected);
    assert_eq!(
        candidates.iter().filter(|m| m.as_str() == selected).count(),
        1
    );
    assert!(candidates.iter().any(|m| m == "xiaomi/mimo-v2-flash:free"));
}
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd src-tauri && cargo test ai::providers::openrouter::tests::test_build_model_candidates_prefers_selected_without_duplicates -- --nocapture
```

Expected: FAIL karena `build_model_candidates` belum ada.

**Step 3: Write minimal implementation**

Ubah provider agar menerima model preference:

```rust
pub struct OpenRouterProvider {
    api_key: String,
    client: reqwest::Client,
    preferred_model: Option<String>,
}

impl OpenRouterProvider {
    pub fn new(api_key: String, preferred_model: Option<String>) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
            preferred_model,
        }
    }

    fn default_models() -> [&'static str; 3] {
        [
            "xiaomi/mimo-v2-flash:free",
            "z-ai/glm-4.5-air:free",
            "openai/gpt-oss-20b:free",
        ]
    }

    fn build_model_candidates(preferred_model: Option<&str>) -> Vec<String> {
        let mut out: Vec<String> = Vec::new();

        if let Some(model) = preferred_model {
            if !model.trim().is_empty() {
                out.push(model.trim().to_string());
            }
        }

        for fallback in Self::default_models() {
            if !out.iter().any(|m| m == fallback) {
                out.push(fallback.to_string());
            }
        }

        out
    }
}
```

Lalu di `src-tauri/src/commands/ai.rs`, ambil model dari settings dan inject ke provider:

```rust
let selected_openrouter_model: Option<String> = conn
    .query_row(
        "SELECT value FROM settings WHERE key = 'ai_model_openrouter'",
        [],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("Failed to query selected model: {}", e))?;

// ...
"openrouter" => {
    let key = api_key.ok_or("API key required for OpenRouter")?;
    Box::new(OpenRouterProvider::new(key, selected_openrouter_model))
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd src-tauri && cargo test ai::providers::openrouter::tests::test_build_model_candidates_prefers_selected_without_duplicates -- --nocapture
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/ai/providers/openrouter.rs src-tauri/src/commands/ai.rs
git commit -m "feat(ai): honor selected openrouter model with resilient fallback ordering"
```

### Task 3: Frontend Store + Type Contract untuk Model Search & Selection

**Files:**
- Modify: `src/types/ai.ts:17-83`
- Modify: `src/stores/aiStore.ts:14-238`
- Create: `src/stores/aiStore.test.ts`

**Step 1: Write the failing test**

Buat `src/stores/aiStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useAiStore } from './aiStore';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('aiStore model settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiStore.setState({
      availableModels: [],
      selectedModelByProvider: {},
      modelQuery: '',
      isLoadingModels: false,
      modelError: null,
    } as Partial<ReturnType<typeof useAiStore.getState>>);
  });

  it('loads openrouter models and selected model', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce([
        { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air' },
      ])
      .mockResolvedValueOnce('z-ai/glm-4.5-air:free');

    await useAiStore.getState().loadOpenRouterModels('glm');
    await useAiStore.getState().loadProviderModel('openrouter');

    expect(invoke).toHaveBeenCalledWith('get_openrouter_models', {
      query: 'glm',
      limit: 200,
    });
    expect(invoke).toHaveBeenCalledWith('get_provider_model', {
      providerId: 'openrouter',
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- src/stores/aiStore.test.ts
```

Expected: FAIL karena state/action model belum ada di `aiStore`.

**Step 3: Write minimal implementation**

Tambahkan contract type dan state/action baru.

`src/types/ai.ts`:

```ts
export interface OpenRouterModelSummary {
  id: string;
  name: string;
  description?: string | null;
  context_length?: number | null;
  prompt_price?: string | null;
  completion_price?: string | null;
}
```

`src/stores/aiStore.ts` (inti minimal):

```ts
availableModels: OpenRouterModelSummary[];
selectedModelByProvider: Record<string, string | null>;
modelQuery: string;
isLoadingModels: boolean;
modelError: string | null;

loadOpenRouterModels: async (query = '') => {
  set({ isLoadingModels: true, modelError: null, modelQuery: query });
  try {
    const models = await invoke<OpenRouterModelSummary[]>('get_openrouter_models', {
      query: query || null,
      limit: 200,
    });
    set({ availableModels: models, isLoadingModels: false });
  } catch (error) {
    set({
      modelError: error instanceof Error ? error.message : 'Failed to load models',
      isLoadingModels: false,
    });
  }
},

loadProviderModel: async (providerId: string) => {
  const selected = await invoke<string>('get_provider_model', { providerId });
  set((state) => ({
    selectedModelByProvider: { ...state.selectedModelByProvider, [providerId]: selected },
  }));
},

setProviderModel: async (providerId: string, modelId: string) => {
  await invoke('set_provider_model', { providerId, modelId });
  set((state) => ({
    selectedModelByProvider: { ...state.selectedModelByProvider, [providerId]: modelId },
  }));
},
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm run test -- src/stores/aiStore.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/ai.ts src/stores/aiStore.ts src/stores/aiStore.test.ts
git commit -m "feat(frontend): add ai store model catalog and selected-model state"
```

### Task 4: Settings UI - Searchable Model Picker

**Files:**
- Create: `src/components/settings/ModelSelector.tsx`
- Create: `src/components/settings/ModelSelector.test.tsx`
- Modify: `src/components/settings/AiProviderSettings.tsx:12-130`
- Modify: `src/components/settings/index.ts:1-10`

**Step 1: Write the failing test**

Buat `src/components/settings/ModelSelector.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSelector } from './ModelSelector';

describe('ModelSelector', () => {
  it('searches and selects model', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onSelect = vi.fn();

    render(
      <ModelSelector
        value="z-ai/glm-4.5-air:free"
        models={[
          { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air' },
          { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B' },
        ]}
        query=""
        onQueryChange={onSearch}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    await user.type(screen.getByPlaceholderText(/search openrouter model/i), 'gpt');
    expect(onSearch).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- src/components/settings/ModelSelector.test.tsx
```

Expected: FAIL karena `ModelSelector` belum ada.

**Step 3: Write minimal implementation**

Buat `ModelSelector` berbasis `Input + Select` agar searchable tanpa dependency baru:

```tsx
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OpenRouterModelSummary } from '@/types/ai';

interface ModelSelectorProps {
  value: string | null;
  models: OpenRouterModelSummary[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (modelId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  models,
  query,
  onQueryChange,
  onSelect,
  isLoading,
  disabled,
}: ModelSelectorProps) {
  const selected = models.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search OpenRouter model (e.g. glm, qwen, gemini)"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        disabled={disabled || isLoading}
      />

      <Select value={value || undefined} onValueChange={onSelect} disabled={disabled || isLoading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? 'Loading models...' : 'Select model'}>
            {selected ? `${selected.name} (${selected.id})` : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span>{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.id}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

Integrasikan ke `AiProviderSettings`:

- Saat provider `openrouter` aktif, panggil:
  - `loadProviderModel('openrouter')`
  - `loadOpenRouterModels(currentQuery)`
- Render `ModelSelector` di bawah API key section.
- Saat user pilih model, panggil `setProviderModel('openrouter', modelId)`.

**Step 4: Run test to verify it passes**

Run:

```bash
npm run test -- src/components/settings/ModelSelector.test.tsx src/stores/aiStore.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/settings/ModelSelector.tsx src/components/settings/ModelSelector.test.tsx src/components/settings/AiProviderSettings.tsx src/components/settings/index.ts
git commit -m "feat(settings): add searchable openrouter model selector"
```

### Task 5: Integration Guard Test untuk Settings Flow

**Files:**
- Create: `src/components/settings/AiProviderSettings.test.tsx`
- Modify: `src/components/settings/AiProviderSettings.tsx:29-127`

**Step 1: Write the failing test**

Buat test integrasi komponen untuk memastikan wiring model lifecycle benar:

```tsx
it('loads provider model + models when openrouter selected', async () => {
  const loadProviders = vi.fn().mockResolvedValue(undefined);
  const loadProviderModel = vi.fn().mockResolvedValue(undefined);
  const loadOpenRouterModels = vi.fn().mockResolvedValue(undefined);

  // mock useAiStore selectors/actions untuk defaultProvider=openrouter
  // render <AiProviderSettings />
  // assert ketiga action dipanggil pada mount/provider-change
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- src/components/settings/AiProviderSettings.test.tsx
```

Expected: FAIL jika lifecycle effect untuk load selected model / list model belum benar.

**Step 3: Write minimal implementation**

Perkuat `useEffect` di `AiProviderSettings`:

```tsx
useEffect(() => {
  if (defaultProvider === 'openrouter') {
    void loadProviderModel('openrouter');
    void loadOpenRouterModels(modelQuery);
  }
}, [defaultProvider, loadProviderModel, loadOpenRouterModels, modelQuery]);
```

Tambahkan handler query perubahan agar search bekerja tanpa re-render berlebih:

```tsx
const handleModelSearch = useCallback(async (query: string) => {
  setModelQuery(query);
  await loadOpenRouterModels(query);
}, [setModelQuery, loadOpenRouterModels]);
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm run test -- src/components/settings/AiProviderSettings.test.tsx src/components/settings/ModelSelector.test.tsx src/stores/aiStore.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/settings/AiProviderSettings.test.tsx src/components/settings/AiProviderSettings.tsx
git commit -m "test(settings): guard openrouter model loading and search wiring"
```

## Final Verification (wajib sebelum selesai)

Run:

```bash
cd src-tauri && cargo test commands::settings::tests::test_set_and_get_provider_model_roundtrip -- --nocapture
cd src-tauri && cargo test commands::settings::tests::test_filter_openrouter_models_by_query_and_limit -- --nocapture
cd src-tauri && cargo test ai::providers::openrouter::tests::test_build_model_candidates_prefers_selected_without_duplicates -- --nocapture
npm run test -- src/stores/aiStore.test.ts src/components/settings/ModelSelector.test.tsx src/components/settings/AiProviderSettings.test.tsx
npm run lint
```

Expected:
- Semua targeted Rust tests PASS.
- Semua targeted Vitest tests PASS.
- TypeScript lint (`tsc --noEmit`) PASS.

## Notes (Scope + Risks)

- Scope model selection dibatasi ke provider `openrouter` dulu (sesuai request + arsitektur saat ini).
- Demo mode tetap tanpa model picker.
- Untuk latency search, MVP pakai fetch + filter query dari backend command; optimization (debounce/cache TTL) bisa jadi follow-up jika diperlukan.
