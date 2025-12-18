import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWindowSize } from './useWindowSize';

describe('useWindowSize', () => {
    beforeEach(() => {
        // Set initial window size
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768,
        });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial window dimensions', () => {
        const { result } = renderHook(() => useWindowSize());

        expect(result.current.width).toBe(1024);
        expect(result.current.height).toBe(768);
    });

    it('should clean up event listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useWindowSize());

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        removeEventListenerSpy.mockRestore();
    });

    it('should debounce resize events', async () => {
        const { result } = renderHook(() => useWindowSize(100));

        // Initial value
        expect(result.current.width).toBe(1024);

        // Simulate resize
        Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });

        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        // Value should NOT have changed yet (debounce in progress)
        expect(result.current.width).toBe(1024);

        // Fast forward past debounce delay
        act(() => {
            vi.advanceTimersByTime(150);
        });

        // Now value should be updated
        expect(result.current.width).toBe(1280);
        expect(result.current.height).toBe(900);
    });

    it('should accept custom debounce delay', () => {
        const { result } = renderHook(() => useWindowSize(300));

        // Simulate resize
        Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        // Fast forward 200ms - not enough for 300ms debounce
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current.width).toBe(1024); // Unchanged

        // Fast forward another 150ms - total 350ms > 300ms debounce
        act(() => {
            vi.advanceTimersByTime(150);
        });
        expect(result.current.width).toBe(800); // Now updated
    });

    it('should consolidate multiple rapid resizes', () => {
        const { result } = renderHook(() => useWindowSize(100));

        // Simulate rapid multiple resizes
        Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        act(() => {
            vi.advanceTimersByTime(50);
        });

        Object.defineProperty(window, 'innerWidth', { value: 1100, configurable: true });
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        act(() => {
            vi.advanceTimersByTime(50);
        });

        Object.defineProperty(window, 'innerWidth', { value: 1400, configurable: true });
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        // Still original value - all resizes were within debounce window
        expect(result.current.width).toBe(1024);

        // Fast forward to complete debounce
        act(() => {
            vi.advanceTimersByTime(150);
        });

        // Should have final value only
        expect(result.current.width).toBe(1400);
    });
});
