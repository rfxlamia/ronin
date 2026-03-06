import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface PlatformInfo {
    os: string;
}

interface PlatformState {
    /** Operating system: "linux", "macos", "windows", or "unknown" before init */
    os: string;
    /** Whether platform info has been loaded */
    isLoaded: boolean;
    /** Initialize platform detection from backend */
    init: () => Promise<void>;
    /** Helper: true if running on macOS */
    isMacOS: () => boolean;
    /** Helper: true if running on Linux */
    isLinux: () => boolean;
    /** Helper: true if running on Windows */
    isWindows: () => boolean;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
    os: 'unknown',
    isLoaded: false,
    init: async () => {
        try {
            const info = await invoke<PlatformInfo>('get_platform_info');
            set({ os: info.os, isLoaded: true });
        } catch {
            // Fallback: try to detect from navigator (dev mode / browser)
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('mac')) {
                set({ os: 'macos', isLoaded: true });
            } else if (ua.includes('win')) {
                set({ os: 'windows', isLoaded: true });
            } else {
                set({ os: 'linux', isLoaded: true });
            }
        }
    },
    isMacOS: () => get().os === 'macos',
    isLinux: () => get().os === 'linux',
    isWindows: () => get().os === 'windows',
}));
