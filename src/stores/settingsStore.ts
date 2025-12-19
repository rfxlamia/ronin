import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
    oathShown: boolean;
    setOathShown: (shown: boolean) => void;
    checkOathStatus: () => Promise<void>;
    markOathShown: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    oathShown: true, // Default to true to prevent flash, set to false after check if needed
    setOathShown: (shown) => set({ oathShown: shown }),
    checkOathStatus: async () => {
        const val = await invoke<string | null>('get_setting', { key: 'oath_shown' });
        // If value is null (never set), it's false. If "true", it's true.
        set({ oathShown: val === 'true' });
    },
    markOathShown: async () => {
        await invoke('update_setting', { key: 'oath_shown', value: 'true' });
        set({ oathShown: true });
    }
}));
