# Debounce Model Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement debounce pada pencarian model OpenRouter untuk menghilangkan lag saat user mengetik.

**Architecture:** Buat custom hook `useDebounce` yang reusable, gunakan di `AiProviderSettings.tsx` untuk men-delay API call saat search model.

**Tech Stack:** React hooks (useState, useEffect), TypeScript

---

## Problem Analysis

Saat ini di `AiProviderSettings.tsx:101-107`:

```typescript
const handleModelSearch = useCallback(
  async (query: string) => {
    setLocalModelQuery(query);
    await loadOpenRouterModels(query);  // <- Dipanggil SETIAP kali user mengetik!
  },
  [setLocalModelQuery, loadOpenRouterModels]
);
```

Setiap keystroke langsung memicu API call ke OpenRouter, menyebabkan:
1. Network request beruntun
2. UI blocking/lag saat mengetik
3. Rate limiting risk

## Solution

Implement debounce 300ms - hanya jalankan API call setelah user berhenti mengetik selama 300ms.

---

## Task 1: Create useDebounce Hook

**Files:**
- Create: `src/hooks/useDebounce.ts`
- Test: `src/hooks/useDebounce.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/useDebounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'changed', delay: 300 });
    expect(result.current).toBe('initial'); // Still initial immediately

    vi.advanceTimersByTime(299);
    expect(result.current).toBe('initial'); // Still initial before delay

    vi.advanceTimersByTime(1);
    await waitFor(() => {
      expect(result.current).toBe('changed'); // Changed after delay
    });
  });

  it('should reset timer on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: '', delay: 300 } }
    );

    // Simulate rapid typing
    rerender({ value: 'a', delay: 300 });
    vi.advanceTimersByTime(100);

    rerender({ value: 'ab', delay: 300 });
    vi.advanceTimersByTime(100);

    rerender({ value: 'abc', delay: 300 });
    vi.advanceTimersByTime(100);

    // Should still be empty, timer was reset each time
    expect(result.current).toBe('');

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current).toBe('abc');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
vitest run src/hooks/useDebounce.test.ts
```

Expected: FAIL - "useDebounce is not defined" or module not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
```

**Step 4: Run test to verify it passes**

```bash
vitest run src/hooks/useDebounce.test.ts
```

Expected: PASS all tests

**Step 5: Commit**

```bash
git add src/hooks/useDebounce.ts src/hooks/useDebounce.test.ts
git commit -m "feat(hooks): add useDebounce hook with tests

Implement debounce hook that delays value updates until
user stops typing for specified milliseconds.

- useDebounce<T>(value, delayMs): T
- Handles cleanup on unmount and value changes
- Comprehensive test coverage for debounce behavior"
```

---

## Task 2: Apply Debounce to Model Search

**Files:**
- Modify: `src/components/settings/AiProviderSettings.tsx:101-107`
- Modify: `src/components/settings/AiProviderSettings.tsx:54,70-75`
- Test: `src/components/settings/AiProviderSettings.test.tsx`

**Step 1: Write the test for debounced search**

Add test to existing `AiProviderSettings.test.tsx`:

```typescript
// In AiProviderSettings.test.tsx
import { vi, it, describe, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

describe('AiProviderSettings model search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should debounce model search API calls', async () => {
    const { loadOpenRouterModels } = setupMocks();
    renderWithProviders(<AiProviderSettings />);

    // Select openrouter provider first
    // ... (existing test setup for provider selection)

    const searchInput = screen.getByPlaceholderText('Search OpenRouter model (e.g. glm, qwen, gemini)');

    // Type rapidly
    await userEvent.type(searchInput, 'gpt');

    // Should not call API immediately
    expect(loadOpenRouterModels).not.toHaveBeenCalled();

    // Advance timers by 300ms
    vi.advanceTimersByTime(300);

    // Now API should be called once with final value
    await waitFor(() => {
      expect(loadOpenRouterModels).toHaveBeenCalledTimes(1);
      expect(loadOpenRouterModels).toHaveBeenCalledWith('gpt');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
vitest run src/components/settings/AiProviderSettings.test.tsx -t "debounce"
```

Expected: FAIL - API called immediately, not debounced

**Step 3: Apply debounce to component**

Modify `AiProviderSettings.tsx`:

```typescript
// Add import
import { useDebounce } from '@/hooks/useDebounce';

// Inside component, replace line 55:
const [localModelQuery, setLocalModelQuery] = useState('');

// Add after line 55:
const debouncedModelQuery = useDebounce(localModelQuery, 300);

// Replace lines 70-75 (useEffect):
useEffect(() => {
  if (defaultProvider === 'openrouter') {
    void loadProviderModel('openrouter');
    void loadOpenRouterModels(debouncedModelQuery);  // Use debounced value
  }
}, [defaultProvider, loadProviderModel, loadOpenRouterModels, debouncedModelQuery]);

// Replace lines 101-107 (handleModelSearch):
const handleModelSearch = useCallback(
  (query: string) => {
    setLocalModelQuery(query);  // Just update local state, no API call
  },
  [setLocalModelQuery]
);
```

**Step 4: Run test to verify it passes**

```bash
vitest run src/components/settings/AiProviderSettings.test.tsx -t "debounce"
```

Expected: PASS

**Step 5: Run all related tests**

```bash
vitest run src/components/settings/
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/components/settings/AiProviderSettings.tsx
git add src/components/settings/AiProviderSettings.test.tsx
git commit -m "fix(settings): apply debounce to model search

Fix severe lag when typing in model search input.

- Use useDebounce(300ms) to delay API calls
- API only called after user stops typing
- Prevents network request spam on each keystroke"
```

---

## Verification

**Manual Test:**
1. Buka Settings page
2. Pastikan provider OpenRouter terpilih
3. Ketik di search model dengan cepat: "gemini-pro"
4. **Expected:** Input responsif, tidak ada lag
5. Tunggu 300ms setelah berhenti mengetik
6. **Expected:** Dropdown model terupdate dengan hasil pencarian

**Performance Check:**
- Buka DevTools Network tab
- Ketik "claude" huruf per huruf dengan cepat
- **Expected:** Hanya 1 API request setelah selesai mengetik, bukan 6 request

---

## Summary

Changes made:
1. New hook `useDebounce.ts` dengan test coverage
2. Modified `AiProviderSettings.tsx` menggunakan debounce untuk model search
3. Delay 300ms - balance antara responsiveness dan API efficiency
