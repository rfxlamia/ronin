import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export interface ObserverSettings {
    enabled: boolean;
    excluded_apps: string[];
    excluded_url_patterns: string[];
}

export function useObserverSettings() {
    const [settings, setSettings] = useState<ObserverSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [daemonRunning, setDaemonRunning] = useState(false);

    useEffect(() => {
        loadSettings();
        checkDaemonStatus();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const result = await invoke<ObserverSettings>('get_observer_settings');
            setSettings(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load settings';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const checkDaemonStatus = async () => {
        try {
            const status = await invoke<boolean>('get_observer_status');
            setDaemonRunning(status);
        } catch (err) {
            console.error('[useObserverSettings] Failed to check daemon status:', err);
        }
    };

    const updateSettings = async (newSettings: ObserverSettings) => {
        try {
            await invoke('update_observer_settings', { settings: newSettings });
            setSettings(newSettings);
            toast.success('Settings updated');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update settings';
            toast.error(message);
            throw err;
        }
    };

    // Story 6.5 Fix: Toggle now controls both daemon lifecycle AND enabled setting
    const toggleObserver = async () => {
        if (!settings) return;

        const newEnabled = !settings.enabled;

        try {
            if (newEnabled) {
                // Enable: Start daemon if not running, then update settings
                if (!daemonRunning) {
                    await invoke('start_observer');
                    setDaemonRunning(true);
                }
                await updateSettings({ ...settings, enabled: true });
                toast.success('Silent Observer enabled');
            } else {
                // Disable: Update settings first, then stop daemon
                await updateSettings({ ...settings, enabled: false });
                if (daemonRunning) {
                    await invoke('stop_observer');
                    setDaemonRunning(false);
                }
                toast.success('Silent Observer disabled');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to toggle observer';
            toast.error(message);
            // Rollback state
            await checkDaemonStatus();
            await loadSettings();
        }
    };

    const addExcludedApp = async (app: string) => {
        if (!settings) return;
        if (!app.trim()) {
            toast.error('Application name cannot be empty');
            return;
        }
        if (settings.excluded_apps.includes(app)) {
            toast.error('Application already excluded');
            return;
        }
        await updateSettings({
            ...settings,
            excluded_apps: [...settings.excluded_apps, app],
        });
    };

    const removeExcludedApp = async (app: string) => {
        if (!settings) return;
        await updateSettings({
            ...settings,
            excluded_apps: settings.excluded_apps.filter((a) => a !== app),
        });
    };

    const addExcludedUrl = async (pattern: string) => {
        if (!settings) return;
        if (!pattern.trim()) {
            toast.error('URL pattern cannot be empty');
            return;
        }
        // Validate regex pattern
        try {
            new RegExp(pattern);
        } catch {
            toast.error('Invalid regex pattern');
            return;
        }
        if (settings.excluded_url_patterns.includes(pattern)) {
            toast.error('Pattern already excluded');
            return;
        }
        await updateSettings({
            ...settings,
            excluded_url_patterns: [...settings.excluded_url_patterns, pattern],
        });
    };

    const removeExcludedUrl = async (pattern: string) => {
        if (!settings) return;
        await updateSettings({
            ...settings,
            excluded_url_patterns: settings.excluded_url_patterns.filter((p) => p !== pattern),
        });
    };

    return {
        settings,
        loading,
        daemonRunning,
        toggleObserver,
        addExcludedApp,
        removeExcludedApp,
        addExcludedUrl,
        removeExcludedUrl,
        refreshSettings: loadSettings,
        refreshDaemonStatus: checkDaemonStatus,
    };
}
