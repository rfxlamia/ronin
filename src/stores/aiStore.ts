/**
 * AI Provider Store
 * Story 4.25-1: Unified API Client (Vercel SDK)
 *
 * State management for AI provider configuration using Zustand
 * IMPORTANT: Use selective selectors to prevent re-renders
 * Example: useAiStore(s => s.providers) NOT useAiStore()
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ProviderInfo, DemoQuota } from '@/types/ai';

interface AiStore {
  // State
  providers: ProviderInfo[];
  defaultProvider: string | null;
  isLoading: boolean;
  error: string | null;

  // Demo mode state (Story 4.25-2)
  demoQuota: DemoQuota | null;
  upgradePromptDismissed: boolean;

  // Actions
  loadProviders: () => Promise<void>;
  setDefaultProvider: (id: string) => Promise<void>;
  saveApiKey: (providerId: string, apiKey: string) => Promise<void>;
  clearError: () => void;

  // Demo mode actions (Story 4.25-2)
  updateDemoQuota: (headers: Headers) => void;
  dismissUpgradePrompt: () => void;
}

export const useAiStore = create<AiStore>((set, get) => ({
  // Initial state
  providers: [],
  defaultProvider: null,
  isLoading: false,
  error: null,
  demoQuota: null,
  upgradePromptDismissed:
    localStorage.getItem('demo-upgrade-dismissed') === 'true',

  // Load providers from backend
  loadProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const providers = await invoke<ProviderInfo[]>('get_ai_providers');
      const defaultProvider = providers.find((p) => p.is_default)?.id || null;

      set({
        providers,
        defaultProvider,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load providers',
        isLoading: false,
      });
    }
  },

  // Set default provider
  setDefaultProvider: async (id: string) => {
    const { providers } = get();

    // Validate provider exists
    if (!providers.find((p) => p.id === id)) {
      set({ error: `Unknown provider: ${id}` });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      await invoke('set_default_provider', { providerId: id });

      // Update local state
      set({
        defaultProvider: id,
        isLoading: false,
      });

      // Reload to get updated configuration
      await get().loadProviders();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to set default provider',
        isLoading: false,
      });
    }
  },

  // Save API key for a provider
  saveApiKey: async (providerId: string, apiKey: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('save_provider_api_key', {
        providerId,
        apiKey,
      });

      set({ isLoading: false });

      // Reload to update is_configured status
      await get().loadProviders();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save API key. Check your settings.',
        isLoading: false,
      });
    }
  },

  // Clear error state
  clearError: () => set({ error: null }),

  // Update demo quota from response headers (Story 4.25-2)
  updateDemoQuota: (headers: Headers) => {
    const remainingHourly = parseInt(
      headers.get('X-RateLimit-Remaining-Hourly') || '0',
      10
    );
    const remainingDaily = parseInt(
      headers.get('X-RateLimit-Remaining-Daily') || '0',
      10
    );
    const resetTime = parseInt(headers.get('X-RateLimit-Reset') || '0', 10);

    set({
      demoQuota: {
        remainingHourly,
        remainingDaily,
        resetTime: resetTime || null,
      },
    });
  },

  // Dismiss upgrade prompt for 24 hours (Story 4.25-2)
  dismissUpgradePrompt: () => {
    const dismissedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem('demo-upgrade-dismissed', 'true');
    localStorage.setItem('demo-upgrade-dismissed-until', dismissedUntil.toString());
    set({ upgradePromptDismissed: true });
  },
}));

/**
 * Selective selectors (use these to prevent unnecessary re-renders)
 *
 * Example usage:
 * ```tsx
 * const providers = useAiStore(s => s.providers); // ✅ Only re-renders when providers change
 * const store = useAiStore(); // ❌ Re-renders on ANY state change
 * ```
 */
export const selectProviders = (state: AiStore) => state.providers;
export const selectDefaultProvider = (state: AiStore) => state.defaultProvider;
export const selectIsLoading = (state: AiStore) => state.isLoading;
export const selectError = (state: AiStore) => state.error;
export const selectDemoQuota = (state: AiStore) => state.demoQuota;
export const selectUpgradePromptDismissed = (state: AiStore) =>
  state.upgradePromptDismissed;
