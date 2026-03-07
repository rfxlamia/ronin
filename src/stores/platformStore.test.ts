import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('platformStore', () => {
    beforeEach(async () => {
        // Reset module to get fresh store state
        vi.resetModules();
    });

    it('should default session_type to unknown', async () => {
        const { usePlatformStore } = await import('./platformStore');
        expect(usePlatformStore.getState().sessionType).toBe('unknown');
    });

    it('isWayland() should return false by default', async () => {
        const { usePlatformStore } = await import('./platformStore');
        expect(usePlatformStore.getState().isWayland()).toBe(false);
    });

    it('isWayland() should return true when session_type is wayland', async () => {
        vi.mocked(invoke).mockResolvedValue({ os: 'linux', session_type: 'wayland' });
        const { usePlatformStore } = await import('./platformStore');
        await usePlatformStore.getState().init();
        expect(usePlatformStore.getState().isWayland()).toBe(true);
    });

    it('isWayland() should return false when session_type is x11', async () => {
        vi.mocked(invoke).mockResolvedValue({ os: 'linux', session_type: 'x11' });
        const { usePlatformStore } = await import('./platformStore');
        await usePlatformStore.getState().init();
        expect(usePlatformStore.getState().isWayland()).toBe(false);
    });
});
