import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
    oathShown: boolean;
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
            await invoke<string | null>('get_api_key');  // SECURE: Decrypts from database
            set({ isLoadingKey: false });
        } catch (e) {
            console.error('Failed to load API key:', e);
            set({ isLoadingKey: false });
        }
    },
    saveApiKey: async (key: string) => {
        try {
            if (!key?.trim()) return false;
            await invoke('set_api_key', { key });  // SECURE: Encrypts before storing
            return true;
        } catch (e) {
            console.error('Failed to save API key:', e);
            return false;
        }
    },
    removeApiKey: async () => {
        try {
            await invoke('delete_api_key');  // SECURE: Deletes encrypted key
        } catch (e) {
            console.error('Failed to remove API key:', e);
        }
    },
    testApiKey: async (key: string) => {
        try {
            const isValid = await invoke<boolean>('test_api_connection', { apiKey: key });
            return isValid;
        } catch (e) {
            // Re-throw with the error message from backend
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error('API connection test failed:', errorMsg);
            throw new Error(errorMsg);
        }
    }
}));
