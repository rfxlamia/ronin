import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('settingsStore', () => {
    beforeEach(() => {
        // Reset the store state before each test
        useSettingsStore.setState({ oathShown: true });
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('initial state', () => {
        it('should default oathShown to true to prevent flash', () => {
            const state = useSettingsStore.getState();
            expect(state.oathShown).toBe(true);
        });
    });

    describe('setOathShown', () => {
        it('should set oathShown to false', () => {
            useSettingsStore.getState().setOathShown(false);
            expect(useSettingsStore.getState().oathShown).toBe(false);
        });

        it('should set oathShown to true', () => {
            useSettingsStore.setState({ oathShown: false });
            useSettingsStore.getState().setOathShown(true);
            expect(useSettingsStore.getState().oathShown).toBe(true);
        });
    });

    describe('checkOathStatus', () => {
        it('should set oathShown to false when setting is null (not set)', async () => {
            vi.mocked(invoke).mockResolvedValueOnce(null);

            await useSettingsStore.getState().checkOathStatus();

            expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'oath_shown' });
            expect(useSettingsStore.getState().oathShown).toBe(false);
        });

        it('should set oathShown to true when setting is "true"', async () => {
            useSettingsStore.setState({ oathShown: false });
            vi.mocked(invoke).mockResolvedValueOnce('true');

            await useSettingsStore.getState().checkOathStatus();

            expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'oath_shown' });
            expect(useSettingsStore.getState().oathShown).toBe(true);
        });

        it('should set oathShown to false when setting is "false"', async () => {
            vi.mocked(invoke).mockResolvedValueOnce('false');

            await useSettingsStore.getState().checkOathStatus();

            expect(useSettingsStore.getState().oathShown).toBe(false);
        });
    });

    describe('markOathShown', () => {
        it('should call update_setting and set oathShown to true', async () => {
            useSettingsStore.setState({ oathShown: false });
            vi.mocked(invoke).mockResolvedValueOnce(undefined);

            await useSettingsStore.getState().markOathShown();

            expect(invoke).toHaveBeenCalledWith('update_setting', {
                key: 'oath_shown',
                value: 'true',
            });
            expect(useSettingsStore.getState().oathShown).toBe(true);
        });
    });
});
