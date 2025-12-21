import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHotkeys } from './useHotkeys';

describe('useHotkeys', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should add keydown event listener on mount', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('D', callback));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown event listener on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useHotkeys('D', callback));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call callback when Ctrl+Shift+D is pressed', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('D', callback, { ctrl: true, shift: true }));

    const handler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    const event = new KeyboardEvent('keydown', {
      key: 'D',
      ctrlKey: true,
      shiftKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

    handler(event);

    expect(callback).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should not call callback without correct modifiers', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('D', callback, { ctrl: true, shift: true }));

    const handler = addEventListenerSpy.mock.calls[0][1] as EventListener;

    // Only Ctrl pressed (missing Shift)
    const event1 = new KeyboardEvent('keydown', {
      key: 'D',
      ctrlKey: true,
      shiftKey: false,
    });
    handler(event1);
    expect(callback).not.toHaveBeenCalled();

    // Only Shift pressed (missing Ctrl)
    const event2 = new KeyboardEvent('keydown', {
      key: 'D',
      ctrlKey: false,
      shiftKey: true,
    });
    handler(event2);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should be case-insensitive for key matching', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('d', callback, { ctrl: true, shift: true }));

    const handler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    const event = new KeyboardEvent('keydown', {
      key: 'D',
      ctrlKey: true,
      shiftKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

    handler(event);

    expect(callback).toHaveBeenCalled();
  });
});
