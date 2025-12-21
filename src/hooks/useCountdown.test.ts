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
});
