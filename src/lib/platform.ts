import { usePlatformStore } from '@/stores/platformStore';

/**
 * Returns the platform-appropriate modifier key label.
 * macOS: uses symbols (⌘, ⌥, ⇧)
 * Linux/Windows: uses text (Ctrl, Alt, Shift)
 */
export function getModifierSymbol(modifier: 'ctrl' | 'shift' | 'alt'): string {
    const os = usePlatformStore.getState().os;
    if (os === 'macos') {
        switch (modifier) {
            case 'ctrl': return '⌘';
            case 'shift': return '⇧';
            case 'alt': return '⌥';
        }
    }
    switch (modifier) {
        case 'ctrl': return 'Ctrl';
        case 'shift': return 'Shift';
        case 'alt': return 'Alt';
    }
}

/**
 * Formats a shortcut string for the current platform.
 * Example: formatShortcut('Ctrl', 'Shift', 'D')
 *   macOS -> "⌘⇧D"
 *   Linux/Windows -> "Ctrl+Shift+D"
 */
export function formatShortcut(...keys: string[]): string {
    const os = usePlatformStore.getState().os;
    const mapped = keys.map(k => {
        const lower = k.toLowerCase();
        if (lower === 'ctrl' || lower === 'cmd') return getModifierSymbol('ctrl');
        if (lower === 'shift') return getModifierSymbol('shift');
        if (lower === 'alt' || lower === 'option') return getModifierSymbol('alt');
        return k;
    });
    // macOS uses symbols without separator, others use +
    return os === 'macos' ? mapped.join('') : mapped.join('+');
}
