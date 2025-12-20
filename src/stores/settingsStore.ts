import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
    oathShown: boolean;
    apiKey: string | null;
    isLoadingKey: boolean;
    setOathShown: (shown: boolean) => void;
    checkOathStatus: () => Promise<void>;
    markOathShown: () => Promise<void>;
    loadApiKey: () => Promise<void>;
    saveApiKey: (key: string) => Promise<boolean>;
    removeApiKey: () => Promise<void>;
    testApiKey: (key: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    oathShown: true,
    apiKey: null,
    isLoadingKey: false,
    setOathShown: (shown) => set({ oathShown: shown }),
    checkOathStatus: async () => {
        const val = await invoke<string | null>('get_setting', { key: 'oath_shown' });
        set({ oathShown: val === 'true' });
    },
    markOathShown: async () => {
        await invoke('update_setting', { key: 'oath_shown', value: 'true' });
        set({ oathShown: true });
    },
    loadApiKey: async () => {
        set({ isLoadingKey: true });
        try {
            const key = await invoke<string | null>('get_setting', { key: 'openrouter_api_key' });
            set({ apiKey: key, isLoadingKey: false });
        } catch (e) {
            console.error('Failed to load API key:', e);
            set({ apiKey: null, isLoadingKey: false });
        }
    },
    saveApiKey: async (key: string) => {
        try {
            // Basic validation
            if (!key || !key.startsWith('sk-or-v1-')) {
                return false;
            }
            await invoke('update_setting', { key: 'openrouter_api_key', value: key });
            set({ apiKey: key });
            return true;
        } catch (e) {
            console.error('Failed to save API key:', e);
            return false;
        }
    },
    removeApiKey: async () => {
        try {
            await invoke('update_setting', { key: 'openrouter_api_key', value: '' });
            set({ apiKey: null });
        } catch (e) {
            console.error('Failed to remove API key:', e);
        }
    },
    testApiKey: async (key: string) => {
        // TODO: Test connection to OpenRouter API
        // For now, just validate format
        return key.startsWith('sk-or-v1-') && key.length > 20;
    }
}));
