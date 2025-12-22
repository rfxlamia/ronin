import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with zero by default', () => {
    const { result } = renderHook(() => useCountdown());
    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('initializes with provided seconds', () => {
    const { result } = renderHook(() => useCountdown(30));
    expect(result.current.secondsRemaining).toBe(30);
    expect(result.current.isActive).toBe(true);
  });

  it('counts down every second', () => {
    const { result } = renderHook(() => useCountdown(3));

    expect(result.current.secondsRemaining).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsRemaining).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('can be started with a new value', () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.start(10);
    });

    expect(result.current.secondsRemaining).toBe(10);
    expect(result.current.isActive).toBe(true);
  });

  it('can be reset', () => {
    const { result } = renderHook(() => useCountdown(30));

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('stops at zero and becomes inactive', () => {
    const { result } = renderHook(() => useCountdown(1));

    expect(result.current.isActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isActive).toBe(false);

    // Advancing more time should not go negative
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsRemaining).toBe(0);
  });

  // Story 4.25-3: Tests for minutes, seconds, timeRemaining, and progress
  describe('convenience properties (Story 4.25-3)', () => {
    it('returns timeRemaining as alias for secondsRemaining', () => {
      const { result } = renderHook(() => useCountdown(90));
      expect(result.current.timeRemaining).toBe(90);
      expect(result.current.timeRemaining).toBe(result.current.secondsRemaining);
    });

    it('calculates minutes and seconds correctly', () => {
      const { result } = renderHook(() => useCountdown(125)); // 2 min 5 sec
      expect(result.current.minutes).toBe(2);
      expect(result.current.seconds).toBe(5);
    });

    it('updates minutes and seconds as countdown progresses', () => {
      const { result } = renderHook(() => useCountdown(65)); // 1 min 5 sec

      expect(result.current.minutes).toBe(1);
      expect(result.current.seconds).toBe(5);

      act(() => {
        vi.advanceTimersByTime(6000); // 6 seconds
      });

      expect(result.current.minutes).toBe(0);
      expect(result.current.seconds).toBe(59);
    });

    it('calculates progress percentage correctly', () => {
      const { result } = renderHook(() => useCountdown(100));

      expect(result.current.progress).toBe(0);

      act(() => {
        vi.advanceTimersByTime(50000); // 50 seconds = 50%
      });

      expect(result.current.progress).toBe(50);
    });

    it('shows 100% progress when countdown completes', () => {
      const { result } = renderHook(() => useCountdown(2));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.progress).toBe(100);
    });

    it('handles progress correctly when started with new value', () => {
      const { result } = renderHook(() => useCountdown());

      act(() => {
        result.current.start(50);
      });

      expect(result.current.progress).toBe(0);

      act(() => {
        vi.advanceTimersByTime(25000); // 25 seconds = 50%
      });

      expect(result.current.progress).toBe(50);
    });
  });
});

