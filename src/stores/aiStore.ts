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
import type { ProviderInfo, DemoQuota, OpenRouterModelSummary } from '@/types/ai';

function getInitialUpgradePromptDismissed(): boolean {
  try {
    const dismissedUntil = localStorage.getItem('demo-upgrade-dismissed-until');
    if (!dismissedUntil) return false;
    return Date.now() < parseInt(dismissedUntil, 10);
  } catch {
    return false;
  }
}

interface AiStore {
  // State
  providers: ProviderInfo[];
  defaultProvider: string | null;
  isLoading: boolean;
  error: string | null;

  // Demo mode state (Story 4.25-2)
  demoQuota: DemoQuota | null;
  upgradePromptDismissed: boolean;

  // Settings state (Story 4.25-3)
  apiKeyStatus: Record<string, string | null>; // providerId -> masked key or null
  connectionStatus: Record<string, 'idle' | 'testing' | 'connected' | 'error'>;
  connectionError: Record<string, string | null>;

  // Model selection state
  availableModels: OpenRouterModelSummary[];
  selectedModelByProvider: Record<string, string | null>; // providerId -> modelId
  modelQuery: string;
  isLoadingModels: boolean;
  modelError: string | null;

  // Actions
  loadProviders: () => Promise<void>;
  setDefaultProvider: (id: string) => Promise<void>;
  saveApiKey: (providerId: string, apiKey: string) => Promise<void>;
  clearError: () => void;

  // Demo mode actions (Story 4.25-2)
  updateDemoQuota: (headers: Headers) => void;
  dismissUpgradePrompt: () => void;

  // Settings actions (Story 4.25-3)
  getApiKeyStatus: (providerId: string) => Promise<string | null>;
  testConnection: (providerId: string) => Promise<boolean>;

  // Model selection actions
  loadOpenRouterModels: (query?: string) => Promise<void>;
  loadProviderModel: (providerId: string) => Promise<void>;
  setProviderModel: (providerId: string, modelId: string) => Promise<void>;
}

export const useAiStore = create<AiStore>((set, get) => ({
  // Initial state
  providers: [],
  defaultProvider: null,
  isLoading: false,
  error: null,
  demoQuota: null,
  upgradePromptDismissed: getInitialUpgradePromptDismissed(),

  // Settings state (Story 4.25-3)
  apiKeyStatus: {},
  connectionStatus: {},
  connectionError: {},

  // Model selection state
  availableModels: [],
  selectedModelByProvider: {},
  modelQuery: '',
  isLoadingModels: false,
  modelError: null,

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
    localStorage.setItem('demo-upgrade-dismissed-until', dismissedUntil.toString());
    set({ upgradePromptDismissed: true });
  },

  // Get masked API key status for display (Story 4.25-3)
  getApiKeyStatus: async (providerId: string) => {
    try {
      // reveal=false returns masked key
      const maskedKey = await invoke<string | null>('get_provider_api_key', {
        providerId,
        reveal: false,
      });

      set((state) => ({
        apiKeyStatus: { ...state.apiKeyStatus, [providerId]: maskedKey },
      }));

      return maskedKey;
    } catch (error) {
      console.error('Failed to get API key status:', error);
      return null;
    }
  },

  // Test connection to a provider (Story 4.25-3)
  testConnection: async (providerId: string) => {
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [providerId]: 'testing' },
      connectionError: { ...state.connectionError, [providerId]: null },
    }));

    try {
      const success = await invoke<boolean>('test_provider_connection', {
        providerId,
      });

      set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          [providerId]: success ? 'connected' : 'error',
        },
      }));

      return success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      set((state) => ({
        connectionStatus: { ...state.connectionStatus, [providerId]: 'error' },
        connectionError: { ...state.connectionError, [providerId]: errorMessage },
      }));

      return false;
    }
  },

  // Load OpenRouter models with optional query filtering
  loadOpenRouterModels: async (query = '') => {
    set({ isLoadingModels: true, modelError: null, modelQuery: query });
    try {
      const models = await invoke<OpenRouterModelSummary[]>('get_openrouter_models', {
        query: query || null,
        limit: 200,
      });
      set({ availableModels: models, isLoadingModels: false });
    } catch (error) {
      set({
        modelError: error instanceof Error ? error.message : 'Failed to load models',
        isLoadingModels: false,
      });
    }
  },

  // Load selected model for a provider
  loadProviderModel: async (providerId: string) => {
    try {
      const selected = await invoke<string>('get_provider_model', { providerId });
      set((state) => ({
        selectedModelByProvider: { ...state.selectedModelByProvider, [providerId]: selected },
      }));
    } catch (error) {
      console.error('Failed to load provider model:', error);
    }
  },

  // Set selected model for a provider
  setProviderModel: async (providerId: string, modelId: string) => {
    try {
      await invoke('set_provider_model', { providerId, modelId });
      set((state) => ({
        selectedModelByProvider: { ...state.selectedModelByProvider, [providerId]: modelId },
      }));
    } catch (error) {
      set({
        modelError: error instanceof Error ? error.message : 'Failed to set model',
      });
    }
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
export const selectApiKeyStatus = (state: AiStore) => state.apiKeyStatus;
export const selectConnectionStatus = (state: AiStore) => state.connectionStatus;
export const selectConnectionError = (state: AiStore) => state.connectionError;
export const selectAvailableModels = (state: AiStore) => state.availableModels;
export const selectSelectedModelByProvider = (state: AiStore) =>
  state.selectedModelByProvider;
export const selectModelQuery = (state: AiStore) => state.modelQuery;
export const selectIsLoadingModels = (state: AiStore) => state.isLoadingModels;
export const selectModelError = (state: AiStore) => state.modelError;
