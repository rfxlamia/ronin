# Ronin — Senior Fullstack Code Review Report

> **Reviewer**: Senior Fullstack Developer (Strict/Constructive)
> **Scope**: Architecture, Maintainability, Testability, Error Handling, Security, Performance
> **Total Issues Found**: 22 across 19 files

---

## 🔴 CRITICAL Issues (3)

---

### [SEVERITY: CRITICAL] Race Condition in Rate Limit Check-Then-Increment
**File**: [`serverless/demo-proxy/ratelimit.mjs:107`](serverless/demo-proxy/ratelimit.mjs:107)
**Category**: Security | Performance
**Problem**: `checkRateLimit` performs a read (`getUsage`) then a write (`incrementUsage`) as two separate, non-atomic DynamoDB operations. Under concurrent Lambda invocations, two requests can both read `count=9`, both pass the check, and both increment — resulting in 11 requests served when only 10 should be allowed. Classic TOCTOU (Time-of-Check-Time-of-Use) race condition.
**Impact**: Rate limit bypassed under concurrent load, allowing unlimited shared API key consumption and cost overruns.
**Fix**:
```javascript
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

async function atomicIncrementAndCheck(fingerprint, window, limit) {
  const ttl = window === 'hourly'
    ? Math.floor(Date.now() / 1000) + 3600
    : Math.floor(Date.now() / 1000) + 86400;
  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { fingerprint, window },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :one, #ttl = :ttl',
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':limit': limit, ':ttl': ttl },
      ReturnValues: 'UPDATED_NEW'
    }));
    return { allowed: true, newCount: result.Attributes.count };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') return { allowed: false };
    console.error('DynamoDB atomic increment error:', err);
    return { allowed: true, newCount: 0 }; // fail open
  }
}
```

---

### [SEVERITY: CRITICAL] Hardcoded Lambda URL Embedded in Client-Side Bundle
**File**: [`src/lib/ai/registry.ts:24`](src/lib/ai/registry.ts:24)
**Category**: Security
**Problem**: `process.env.DEMO_LAMBDA_URL || "https://dkm5aeebsg7dggdpwoovlbzjde0ayxyh.lambda-url.ap-southeast-2.on.aws/"` — the fallback URL is hardcoded and will be embedded in the production Vite/Tauri binary. Anyone who inspects the app binary can extract this endpoint.
**Impact**: Lambda URL becomes a publicly enumerable attack surface. Combined with the TOCTOU race above, a motivated attacker can script unlimited requests.
**Fix**:
```typescript
// vite.config.ts — require the variable at build time, no fallback:
// define: { 'import.meta.env.VITE_DEMO_LAMBDA_URL': JSON.stringify(process.env.DEMO_LAMBDA_URL ?? '') }

// registry.ts — never fall back to a hardcoded URL:
{
  id: 'demo',
  name: 'Demo Mode (Limited)',
  baseUrl: import.meta.env.VITE_DEMO_LAMBDA_URL ?? '',
  requiresKey: false,
  isDefault: false,
},
// Guard in demo mode UI: if baseUrl is empty, disable demo mode entirely.
```

---

### [SEVERITY: CRITICAL] `localStorage` Access at Module Evaluation Time (SSR/Test Safety)
**File**: [`src/stores/aiStore.ts:64`](src/stores/aiStore.ts:64)
**Category**: Error Handling | Testability
**Problem**: `localStorage.getItem('demo-upgrade-dismissed') === 'true'` is called synchronously inside `create<AiStore>()`. In jsdom test environments, this reads from shared global state, causing test pollution and non-deterministic results.
**Impact**: Tests that import `aiStore` silently share `localStorage` state; any SSR attempt throws.
**Fix**:
```typescript
function getInitialUpgradePromptDismissed(): boolean {
  try {
    return typeof localStorage !== 'undefined'
      && localStorage.getItem('demo-upgrade-dismissed') === 'true';
  } catch {
    return false;
  }
}

export const useAiStore = create<AiStore>((set, get) => ({
  upgradePromptDismissed: getInitialUpgradePromptDismissed(),
  // ...
}));
```

---

## 🟠 HIGH Issues (5)

---

### [SEVERITY: HIGH] `dismissUpgradePrompt` Expiry Logic Never Read — Dismissal Is Permanent
**File**: [`src/stores/aiStore.ts:178`](src/stores/aiStore.ts:178)
**Category**: Clean Code | Error Handling
**Problem**: `dismissUpgradePrompt` writes a `demo-upgrade-dismissed-until` timestamp, but store initialization reads only the boolean `demo-upgrade-dismissed` key — the expiry is never checked. The "24 hours" comment is misleading; dismissal is permanent until storage is cleared.
**Fix**:
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
```

---

### [SEVERITY: HIGH] Unhandled Promise in `useAiContext` Cleanup — Memory Leak Risk
**File**: [`src/hooks/useAiContext.ts:185`](src/hooks/useAiContext.ts:185)
**Category**: Error Handling | Testability
**Problem**: The `useEffect` cleanup calls `unlistenPromises.then(...)`. If the component unmounts before `Promise.all` resolves, the `.then()` fires post-unmount. No `.catch()` is attached — listener registration failures are silently swallowed.
**Fix**:
```typescript
useEffect(() => {
  if (!projectId) return;
  let isMounted = true;
  const unlistenFns: Array<() => void> = [];

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
        unChunk(); unComplete(); unError(); // already unmounted
      }
    } catch (err) {
      console.error('[useAiContext] Failed to register listeners:', err);
    }
  };

  setup();
  return () => { isMounted = false; unlistenFns.forEach((fn) => fn()); };
}, [projectId]);
```

---

### [SEVERITY: HIGH] `useFilteredProjects` — Three Separate Store Subscriptions Cause Triple Re-Renders
**File**: [`src/stores/projectStore.ts:104`](src/stores/projectStore.ts:104)
**Category**: Performance
**Problem**: Three separate `useProjectStore` calls create three independent subscriptions. A single action that updates `projects`, `searchQuery`, and `filterStatus` triggers three re-renders. Filtering also runs on every render without memoization.
**Fix**:
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

---

### [SEVERITY: HIGH] `ProjectScanner` — Silent Per-Project Import Failures, No User Feedback
**File**: [`src/components/Dashboard/ProjectScanner.tsx:74`](src/components/Dashboard/ProjectScanner.tsx:74)
**Category**: Error Handling
**Problem**: Each project import failure is caught and logged to console only. If 3 of 5 projects fail, the scanner resets as if everything succeeded — silent data loss from the user's perspective.
**Fix**:
```typescript
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
  const succeeded = results.filter((r) => r.status === 'fulfilled');
  if (failed.length > 0) {
    setError(`${failed.length} project(s) failed to import. ${succeeded.length} succeeded.`);
  }
  if (succeeded.length > 0) {
    onImportComplete?.(succeeded.map((r) => (r as PromiseFulfilledResult<Project>).value));
    setScannedProjects([]);
    setSelectedProjects(new Set());
  }
};
```

---

### [SEVERITY: HIGH] `settingsStore` — Decrypted API Key Stored in Plain Zustand State
**File**: [`src/stores/settingsStore.ts:34`](src/stores/settingsStore.ts:34)
**Category**: Security
**Problem**: `loadApiKey` fetches the decrypted key and stores it as `set({ apiKey: key })`. Despite the "SECURE: Decrypts from database" comment, the key now lives in plain JS heap memory, accessible to any code calling `useSettingsStore.getState().apiKey`. This also creates a dual-store pattern with `aiStore`'s masked key status.
**Fix**:
```typescript
// Remove apiKey from SettingsState entirely.
// For display, use aiStore's getApiKeyStatus (returns masked value).
// For operations needing the key, pass it transiently — never store it:
testApiKey: async (key: string) => {
  return invoke<boolean>('test_api_connection', { apiKey: key });
}
```

---

## 🟡 MEDIUM Issues (8)

---

### [SEVERITY: MEDIUM] `useGitStatus` — No Debounce on Focus/Visibility Refetch
**File**: [`src/hooks/useGitStatus.ts:37`](src/hooks/useGitStatus.ts:37)
**Category**: Performance
**Problem**: Both `visibilitychange` and `focus` events call `fetchStatus()` immediately. On some OSes, both fire in rapid succession on window focus. With N `ProjectCard` components each mounting this hook, one focus event triggers N×2 backend calls.
**Fix**:
```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const debouncedFetch = useCallback(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(fetchStatus, 300);
}, [fetchStatus]);
// Use debouncedFetch in event listeners instead of fetchStatus directly
```

---

### [SEVERITY: MEDIUM] `devlogStore` — Cache Eviction Labeled "LRU" Is Actually FIFO
**File**: [`src/stores/devlogStore.ts:164`](src/stores/devlogStore.ts:164)
**Category**: Clean Code | Performance
**Problem**: `Object.keys()` returns insertion order (FIFO), not access order. The comment "LRU-like eviction" is misleading — frequently accessed versions may be evicted while stale ones are kept.
**Fix**:
```typescript
cacheVersion: (hash, content) => set((state) => {
  const cache = new Map(Object.entries(state.versionCache));
  cache.delete(hash); // move to end if exists (true LRU)
  cache.set(hash, content);
  if (cache.size > 10) cache.delete(cache.keys().next().value!);
  return { versionCache: Object.fromEntries(cache) };
}),
```

---

### [SEVERITY: MEDIUM] `ContextPanel` — O(N²) Markdown Re-Parse During Streaming
**File**: [`src/components/ContextPanel.tsx:267`](src/components/ContextPanel.tsx:267)
**Category**: Performance
**Problem**: `useMemo(() => <ReactMarkdown>{text}</ReactMarkdown>, [text])` re-parses the entire accumulated string on every streaming chunk — O(N) work per chunk, O(N²) total.
**Fix**:
```typescript
const markdownContent = useMemo(() => {
  if (!text) return null;
  if (state === 'streaming') {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
  return <ReactMarkdown>{text}</ReactMarkdown>;
}, [text, state]);
```

---

### [SEVERITY: MEDIUM] `ratelimit.mjs` — `exceedsTokenLimit` Passes a Number to `estimateTokens` — Always Returns `false`
**File**: [`serverless/demo-proxy/ratelimit.mjs:166`](serverless/demo-proxy/ratelimit.mjs:166)
**Category**: Security | Clean Code
**Problem**: `estimateTokens(totalChars)` receives a `number` but expects a `string`. `(number).length` is `undefined`, so `Math.ceil(undefined / 4)` is `NaN`, and `NaN > TOKEN_LIMIT` is always `false`. **The token limit check is completely non-functional.**
**Fix**:
```javascript
export function exceedsTokenLimit(requestBody) {
  const messages = requestBody.messages || [];
  const totalChars = messages.reduce((sum, msg) =>
    sum + (typeof msg.content === 'string' ? msg.content.length : 0), 0);
  const estimatedTokens = Math.ceil(totalChars / 4); // no estimateTokens call needed
  return estimatedTokens > TOKEN_LIMIT;
}
```

---

### [SEVERITY: MEDIUM] `index.mjs` — Body Size Check Occurs After `JSON.parse`
**File**: [`serverless/demo-proxy/index.mjs:208`](serverless/demo-proxy/index.mjs:208)
**Category**: Security | Performance
**Problem**: The 20KB body size check fires *after* `JSON.parse(event.body)`. A crafted deeply-nested JSON payload can exhaust CPU before the size guard rejects it.
**Fix**:
```javascript
// Move BEFORE JSON.parse:
if (event.body && event.body.length > 20480) {
  responseStream.write(JSON.stringify({ error: 'payload_too_large' }));
  responseStream.end();
  return;
}
const requestBody = JSON.parse(event.body || '{}');
```

---

### [SEVERITY: MEDIUM] `useAiContext` — `String(error)` Breaks Structured Error Prefix Matching
**File**: [`src/hooks/useAiContext.ts:96`](src/hooks/useAiContext.ts:96)
**Category**: Error Handling
**Problem**: `String(new Error("OFFLINE: ..."))` produces `"Error: OFFLINE: ..."`. The `parseError` function checks for `"OFFLINE:"` prefix — the `"Error: "` prefix causes it to fall through to `unknown`, losing retry-after timing and error-specific UI.
**Fix**:
```typescript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const parsed = parseError(errorMessage);
  setState((prev) => ({ ...prev, contextState: 'error', error: errorMessage, parsedError: parsed }));
}
```

---

### [SEVERITY: MEDIUM] `AiProviderSettings` — `loadProviderModel` Called on Every Model Search Keystroke
**File**: [`src/components/settings/AiProviderSettings.tsx:72`](src/components/settings/AiProviderSettings.tsx:72)
**Category**: Performance
**Problem**: A single `useEffect` depends on `debouncedModelQuery` and calls both `loadProviderModel` and `loadOpenRouterModels`. The selected model hasn't changed on a search keystroke, but `loadProviderModel` fires anyway — a redundant backend call on every search.
**Fix**:
```typescript
// Split into two effects:
useEffect(() => {
  if (defaultProvider === 'openrouter') void loadProviderModel('openrouter');
}, [defaultProvider, loadProviderModel]);

useEffect(() => {
  if (defaultProvider === 'openrouter') void loadOpenRouterModels(debouncedModelQuery);
}, [defaultProvider, loadOpenRouterModels, debouncedModelQuery]);
```

---

### [SEVERITY: MEDIUM] `dateUtils.ts` — `calculateDaysSince` Propagates `NaN` on Invalid Input
**File**: [`src/lib/utils/dateUtils.ts:6`](src/lib/utils/dateUtils.ts:6)
**Category**: Error Handling
**Problem**: `calculateDaysSince('')` or `calculateDaysSince('invalid')` produces `NaN`, which propagates to `formatDaysSince` and renders `"NaN days ago"` in the UI. `projectHealth.ts` also uses this function and would misclassify projects with invalid dates.
**Fix**:
```typescript
export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn(`[calculateDaysSince] Invalid date string: "${dateString}"`);
    return 0; // safe default: treat as "today"
  }
  return Math.floor(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
```

---

## 🔵 LOW Issues (6)

---

### [SEVERITY: LOW] No ESLint in CI Pipeline
**File**: [`package.json:13`](package.json:13)
**Category**: Clean Code
**Problem**: `lint` script only runs `tsc --noEmit`. No ESLint configured. Issues like missing `exhaustive-deps`, magic numbers, and unused variables go undetected in CI.
**Fix**:
```json
{
  "scripts": {
    "lint": "tsc --noEmit && eslint src --ext .ts,.tsx --max-warnings 0"
  },
  "devDependencies": {
    "eslint": "^9.x",
    "@typescript-eslint/eslint-plugin": "^8.x",
    "eslint-plugin-react-hooks": "^5.x"
  }
}
```

---

### [SEVERITY: LOW] Magic Number `pt-[73px]` for Header Offset
**File**: [`src/components/AppShell.tsx:48`](src/components/AppShell.tsx:48)
**Category**: Clean Code
**Problem**: `pt-[73px]` must be manually kept in sync with the header's actual rendered height. If the header changes, this silently breaks layout.
**Fix**:
```typescript
// tailwind.config.ts:
// theme.extend.spacing: { 'header': '73px' }
// Usage: className="pt-header"
// Or use a CSS variable set by the header component itself.
```

---

### [SEVERITY: LOW] `settingsStore` — `saveApiKey` Hardcodes OpenRouter Key Prefix
**File**: [`src/stores/settingsStore.ts:43`](src/stores/settingsStore.ts:43)
**Category**: Clean Code
**Problem**: `key.startsWith('sk-or-v1-')` silently rejects valid keys from any future provider. No error message is surfaced to the user.
**Fix**:
```typescript
// Remove prefix check; delegate format validation to the backend:
saveApiKey: async (key: string, providerId: string) => {
  if (!key?.trim()) return false;
  await invoke('set_api_key', { key, providerId });
  return true;
}
```

---

### [SEVERITY: LOW] `ProjectCard` — No-Op `handleOpenChange` Wrapper
**File**: [`src/components/Dashboard/ProjectCard.tsx:82`](src/components/Dashboard/ProjectCard.tsx:82)
**Category**: Clean Code
**Problem**: `handleOpenChange` only calls `setIsOpen(open)` — it adds no logic. The wrapper adds indirection without benefit.
**Fix**: Pass `setIsOpen` directly to `onOpenChange={setIsOpen}` and move the explanatory comment to the `useAiContext` call site.

---

### [SEVERITY: LOW] `ModelSelector` — Empty State Not Handled
**File**: [`src/components/settings/ModelSelector.tsx:52`](src/components/settings/ModelSelector.tsx:52)
**Category**: Clean Code
**Problem**: When `models` is empty (no search results or not yet loaded), the dropdown opens but shows nothing — confusing UX.
**Fix**:
```tsx
<SelectContent>
  {models.length === 0 ? (
    <div className="py-4 text-center text-sm text-muted-foreground">
      {isLoading ? 'Loading...' : 'No models found'}
    </div>
  ) : models.map((model) => <SelectItem key={model.id} value={model.id}>...</SelectItem>)}
</SelectContent>
```

---

### [SEVERITY: LOW] `ratelimit.mjs` — Sliding Window Is Actually "Fixed Window From Last Request"
**File**: [`serverless/demo-proxy/ratelimit.mjs:60`](serverless/demo-proxy/ratelimit.mjs:60)
**Category**: Clean Code
**Problem**: The `timestamp` is updated on every increment to `Date.now()`. The window check compares *last request time* against window start — this is not a true sliding window or fixed calendar window. Users may be blocked longer than the stated 1-hour window.
**Fix**: Document the actual behavior, or implement a true fixed window using epoch-bucketed keys:
```javascript
const windowKey = window === 'hourly'
  ? Math.floor(Date.now() / (60 * 60 * 1000))   // hour epoch
  : Math.floor(Date.now() / (24 * 60 * 60 * 1000)); // day epoch
// Composite key: `${fingerprint}:${window}:${windowKey}`
```

---

## Summary Table

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 3 |
| 🟠 HIGH | 5 |
| 🟡 MEDIUM | 8 |
| 🔵 LOW | 6 |
| **Total** | **22** |

| Category | Count |
|----------|-------|
| Security | 5 |
| Error Handling | 6 |
| Performance | 5 |
| Clean Code | 5 |
| Testability | 2 |

---

## 🎯 Top 5 Priority Actions

1. **[CRITICAL — Security]** Fix the TOCTOU race condition in [`ratelimit.mjs:107`](serverless/demo-proxy/ratelimit.mjs:107) — Replace the read-then-write pattern with a single atomic DynamoDB `UpdateItem` with a `ConditionExpression`. This is the highest-risk issue: the shared API key can be consumed without limit under concurrent load.

2. **[CRITICAL — Security]** Remove the hardcoded Lambda URL from [`registry.ts:24`](src/lib/ai/registry.ts:24) — The fallback URL embeds the Lambda endpoint in the production binary. Require `VITE_DEMO_LAMBDA_URL` at build time with no hardcoded fallback.

3. **[MEDIUM — Security/Bug]** Fix the broken token limit check in [`ratelimit.mjs:166`](serverless/demo-proxy/ratelimit.mjs:166) — `estimateTokens(totalChars)` passes a `number` where a `string` is expected, making `NaN > TOKEN_LIMIT` always `false`. **The token guard is completely non-functional** and must be fixed immediately alongside the TOCTOU fix.

4. **[HIGH — Error Handling]** Fix the unhandled promise and memory leak in [`useAiContext.ts:185`](src/hooks/useAiContext.ts:185) — The cleanup function must handle unmount-before-registration and must attach `.catch()` to surface listener registration failures.

5. **[HIGH — UX/Error Handling]** Surface partial import failures in [`ProjectScanner.tsx:74`](src/components/Dashboard/ProjectScanner.tsx:74) — Use `Promise.allSettled` and display a clear error count when some projects fail to import, preventing silent data loss.
