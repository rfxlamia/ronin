import { useEffect, useCallback } from 'react';

interface HotkeyOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 * @param key - The key to listen for (e.g., 'D', 'K')
 * @param callback - Function to call when hotkey is pressed
 * @param options - Modifier keys required (default: { ctrl: true, shift: true })
 */
export function useHotkeys(
  key: string,
  callback: () => void,
  options: HotkeyOptions = { ctrl: true, shift: true }
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { ctrl = false, shift = false, alt = false } = options;

      // Check if all required modifiers match
      const ctrlMatch = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
      const altMatch = alt ? event.altKey : !event.altKey;

      // Check if the key matches (case-insensitive)
      const keyMatch = event.key.toUpperCase() === key.toUpperCase();

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callback();
      }
    },
    [key, callback, options]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
