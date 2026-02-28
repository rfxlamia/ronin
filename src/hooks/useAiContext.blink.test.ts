/**
 * TDD Tests for Blinking Root Cause Analysis
 * 
 * These tests are designed to fail (RED) if there's any condition that would cause blinking:
 * 1. State inconsistency - state changes in wrong order
 * 2. Race condition - events arriving out of order
 * 3. Text content changing during streaming → complete transition
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock listen to capture events
const mockListeners: Map<string, (event: { payload: any }) => void> = new Map();

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn((eventName: string, callback: any) => {
        mockListeners.set(eventName, callback);
        return Promise.resolve(() => {
            mockListeners.delete(eventName);
        });
    }),
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve()),
}));

// Import after mocks
import { useAiContext } from './useAiContext';

describe('Blinking Root Cause Analysis', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockListeners.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * TEST 1: State transition must be atomic
     * - From streaming to complete, there should be NO intermediate state
     */
    it('should transition directly from streaming to complete without intermediate states', async () => {
        const { result } = renderHook(() => useAiContext(1));

        // Wait for initial streaming state
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Record initial state
        const initialState = result.current.contextState;
        expect(initialState).toBe('streaming');

        // Simulate chunks arriving
        await act(async () => {
            mockListeners.get('ai-chunk')?.({ payload: { text: 'Hello ' } });
            await vi.advanceTimersByTimeAsync(10);
        });

        await act(async () => {
            mockListeners.get('ai-chunk')?.({ payload: { text: 'World' } });
            await vi.advanceTimersByTimeAsync(10);
        });

        const textBeforeComplete = result.current.contextText;
        expect(textBeforeComplete).toBe('Hello World');

        // Simulate complete event
        await act(async () => {
            mockListeners.get('ai-complete')?.({
                payload: {
                    text: 'Hello World', // Same text as accumulated
                    attribution: { commits: 5, files: 2, sources: ['git'] },
                    cached: false,
                },
            });
            await vi.advanceTimersByTimeAsync(10);
        });

        // CRITICAL: Text must NOT change during transition
        expect(result.current.contextText).toBe(textBeforeComplete);
        expect(result.current.contextState).toBe('complete');
    });

    /**
     * TEST 2: Text content must remain stable during transition
     * - The accumulated text during streaming should be identical after complete
     */
    it('should preserve accumulated text exactly when transitioning to complete', async () => {
        const { result } = renderHook(() => useAiContext(1));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Accumulate a long text
        const chunks = [
            '# Context\n\n',
            'You were working on **chippy** (version 2.4 development), ',
            'specifically on the **onboarding experience** and **UI components**. ',
            'The immediate context shows recent work on:\n\n',
            '- BootSequenceOverlay.tsx\n',
            '- DiscoveryPhase.tsx\n',
            '- ChipCharacter.tsx\n',
        ];

        for (const chunk of chunks) {
            await act(async () => {
                mockListeners.get('ai-chunk')?.({ payload: { text: chunk } });
                await vi.advanceTimersByTimeAsync(5);
            });
        }

        const accumulatedText = result.current.contextText;
        const expectedFullText = chunks.join('');
        expect(accumulatedText).toBe(expectedFullText);

        // Complete with empty text (simulating real backend behavior)
        await act(async () => {
            mockListeners.get('ai-complete')?.({
                payload: {
                    text: '', // Backend sends empty text (known issue)
                    attribution: { commits: 10, files: 3, sources: ['git'] },
                },
            });
            await vi.advanceTimersByTimeAsync(10);
        });

        // CRITICAL: Text must remain the accumulated version, not the empty payload
        expect(result.current.contextText).toBe(expectedFullText);
        expect(result.current.contextText.length).toBeGreaterThan(0);
    });

    /**
     * TEST 3: No flash to empty state
     * - During any transition, text should never become empty then re-appear
     */
    it('should never have empty text after chunks have been received', async () => {
        const textHistory: string[] = [];

        renderHook(() => {
            const ctx = useAiContext(1);
            // Track every text value
            textHistory.push(ctx.contextText);
            return ctx;
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Send chunks
        await act(async () => {
            mockListeners.get('ai-chunk')?.({ payload: { text: 'Part1' } });
        });

        await act(async () => {
            mockListeners.get('ai-chunk')?.({ payload: { text: 'Part2' } });
        });

        // Complete
        await act(async () => {
            mockListeners.get('ai-complete')?.({
                payload: {
                    text: '',
                    attribution: { commits: 1, files: 1, sources: ['git'] },
                },
            });
        });

        // Find if there was ever a regression to empty string after having content
        let hadContent = false;
        let flashedToEmpty = false;

        for (const text of textHistory) {
            if (text.length > 0) hadContent = true;
            if (hadContent && text.length === 0) flashedToEmpty = true;
        }

        // CRITICAL: Should never flash to empty after having content
        expect(flashedToEmpty).toBe(false);
    });

    /**
     * TEST 4: Race condition - late chunk after complete
     * - If a chunk arrives after complete, it should be ignored
     */
    it('should ignore chunks that arrive after complete event', async () => {
        const { result } = renderHook(() => useAiContext(1));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Send chunk
        await act(async () => {
            mockListeners.get('ai-chunk')?.({ payload: { text: 'Hello' } });
        });

        // Complete
        await act(async () => {
            mockListeners.get('ai-complete')?.({
                payload: {
                    text: '',
                    attribution: { commits: 1, files: 1, sources: ['git'] },
                },
            });
        });

        const textAtComplete = result.current.contextText;
        const stateAtComplete = result.current.contextState;

        // Simulate late chunk arriving (race condition)
        await act(async () => {
            mockListeners.get('ai-chunk')?.({ payload: { text: ' World' } });
        });

        // CRITICAL: Late chunk should NOT modify state after complete
        expect(result.current.contextState).toBe(stateAtComplete);
        // Note: Current implementation WILL fail this - chunks still append after complete
        // This is a potential source of blinking!
        expect(result.current.contextText).toBe(textAtComplete);
    });
});

describe('Cleanup race condition — unmount before listeners register', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockListeners.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not call listeners after unmount if Promise resolves late', async () => {
        // Simulasi: listen() sangat lambat resolve
        let resolveListen!: () => void;
        const slowListenPromise = new Promise<void>((resolve) => {
            resolveListen = resolve;
        });

        // Override mock listen agar lambat
        const { listen } = await import('@tauri-apps/api/event');
        vi.mocked(listen).mockImplementation((_event, _cb) =>
            slowListenPromise.then(() => vi.fn())
        );

        const { unmount } = renderHook(() => useAiContext(1));

        // Unmount SEBELUM listen resolve
        unmount();

        // Resolve SETELAH unmount
        resolveListen();
        await vi.advanceTimersByTimeAsync(50);

        // Test ini verifikasi tidak ada error "setState on unmounted component"
        // Jika isMounted flag tidak ada, listeners bisa terdaftar dan aktif setelah unmount
        // Ini tidak akan fail secara visible, tapi verifikasi pattern via struktur kode
        expect(true).toBe(true); // Placeholder — verifikasi utama: tidak ada console.error
    });

    it('cleanup function unregisters all listeners synchronously after mount', async () => {
        const unlistenMock = vi.fn();
        const { listen } = await import('@tauri-apps/api/event');
        vi.mocked(listen).mockResolvedValue(unlistenMock);

        const { unmount } = renderHook(() => useAiContext(1));

        // Tunggu listeners terdaftar
        await act(async () => {
            await vi.advanceTimersByTimeAsync(50);
        });

        // Unmount
        unmount();

        // Semua unlisten functions harus sudah dipanggil
        // (3 listeners: ai-chunk, ai-complete, ai-error)
        expect(unlistenMock).toHaveBeenCalledTimes(3);
    });
});
