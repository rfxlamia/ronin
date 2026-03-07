import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface PlatformInfo {
    os: string;
    session_type: string;
}

interface PlatformState {
    /** Operating system: "linux", "macos", "windows", or "unknown" before init */
    os: string;
    /** Display session: "x11", "wayland", or "unknown" before init */
    sessionType: string;
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
    /** Helper: true if running on Linux + Wayland session */
    isWayland: () => boolean;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
    os: 'unknown',
    sessionType: 'unknown',
    isLoaded: false,
    init: async () => {
        try {
            const info = await invoke<PlatformInfo>('get_platform_info');
            set({ os: info.os, sessionType: info.session_type, isLoaded: true });
        } catch {
            // Fallback: try to detect from navigator (dev mode / browser)
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('mac')) {
                set({ os: 'macos', sessionType: 'unknown', isLoaded: true });
            } else if (ua.includes('win')) {
                set({ os: 'windows', sessionType: 'unknown', isLoaded: true });
            } else {
                set({ os: 'linux', sessionType: 'unknown', isLoaded: true });
            }
        }
    },
    isMacOS: () => get().os === 'macos',
    isLinux: () => get().os === 'linux',
    isWindows: () => get().os === 'windows',
    isWayland: () => get().os === 'linux' && get().sessionType === 'wayland',
}));
