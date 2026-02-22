/**
 * AI Provider Settings Component
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Main settings component for AI provider management
 * - Provider selection
 * - API key management
 * - Connection testing
 * - Demo mode stats
 */

import { useEffect, useCallback, useState } from 'react';
import { Label } from '@/components/ui/label';
import { ProviderSelector } from './ProviderSelector';
import { ApiKeyInput } from './ApiKeyInput';
import { ConnectionStatus } from './ConnectionStatus';
import { DemoModeStats } from './DemoModeStats';
import { ModelSelector } from './ModelSelector';
import {
  useAiStore,
  selectDefaultProvider,
  selectProviders,
  selectIsLoading,
  selectDemoQuota,
  selectApiKeyStatus,
  selectConnectionStatus,
  selectConnectionError,
  selectAvailableModels,
  selectSelectedModelByProvider,
  selectIsLoadingModels,
} from '@/stores/aiStore';

export function AiProviderSettings() {
  const defaultProvider = useAiStore(selectDefaultProvider);
  const providers = useAiStore(selectProviders);
  const isLoading = useAiStore(selectIsLoading);
  const demoQuota = useAiStore(selectDemoQuota);
  const apiKeyStatus = useAiStore(selectApiKeyStatus);
  const connectionStatus = useAiStore(selectConnectionStatus);
  const connectionError = useAiStore(selectConnectionError);
  const availableModels = useAiStore(selectAvailableModels);
  const selectedModelByProvider = useAiStore(selectSelectedModelByProvider);
  const isLoadingModels = useAiStore(selectIsLoadingModels);

  const loadProviders = useAiStore((s) => s.loadProviders);
  const setDefaultProvider = useAiStore((s) => s.setDefaultProvider);
  const saveApiKey = useAiStore((s) => s.saveApiKey);
  const getApiKeyStatus = useAiStore((s) => s.getApiKeyStatus);
  const testConnection = useAiStore((s) => s.testConnection);
  const loadOpenRouterModels = useAiStore((s) => s.loadOpenRouterModels);
  const loadProviderModel = useAiStore((s) => s.loadProviderModel);
  const setProviderModel = useAiStore((s) => s.setProviderModel);

  // Local state for model search query
  const [localModelQuery, setLocalModelQuery] = useState('');

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Load API key status when provider changes
  useEffect(() => {
    if (defaultProvider && defaultProvider !== 'demo') {
      getApiKeyStatus(defaultProvider);
    }
  }, [defaultProvider, getApiKeyStatus]);

  // Load OpenRouter models and selected model when provider is openrouter
  useEffect(() => {
    if (defaultProvider === 'openrouter') {
      void loadProviderModel('openrouter');
      void loadOpenRouterModels(localModelQuery);
    }
  }, [defaultProvider, loadProviderModel, loadOpenRouterModels, localModelQuery]);

  const handleProviderChange = useCallback(
    async (providerId: string) => {
      await setDefaultProvider(providerId);
      if (providerId !== 'demo') {
        await getApiKeyStatus(providerId);
      }
    },
    [setDefaultProvider, getApiKeyStatus]
  );

  const handleSaveKey = useCallback(
    async (key: string) => {
      if (!defaultProvider) return;
      await saveApiKey(defaultProvider, key);
      await getApiKeyStatus(defaultProvider);
    },
    [defaultProvider, saveApiKey, getApiKeyStatus]
  );

  const handleTestConnection = useCallback(async () => {
    if (!defaultProvider) return;
    await testConnection(defaultProvider);
  }, [defaultProvider, testConnection]);

  const handleModelSearch = useCallback(
    async (query: string) => {
      setLocalModelQuery(query);
      await loadOpenRouterModels(query);
    },
    [setLocalModelQuery, loadOpenRouterModels]
  );

  const handleModelSelect = useCallback(
    async (modelId: string) => {
      if (defaultProvider) {
        await setProviderModel(defaultProvider, modelId);
      }
    },
    [defaultProvider, setProviderModel]
  );

  const currentProvider = providers.find((p) => p.id === defaultProvider);
  const currentConnectionStatus = connectionStatus[defaultProvider || ''] || 'idle';
  const currentConnectionError = connectionError[defaultProvider || ''] || null;
  const currentApiKeyStatus = apiKeyStatus[defaultProvider || ''] || null;
  const currentSelectedModel = selectedModelByProvider[defaultProvider || ''] || null;

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label htmlFor="provider-select">AI Provider</Label>
        <ProviderSelector
          value={defaultProvider}
          onChange={handleProviderChange}
          disabled={isLoading}
        />
      </div>

      {/* Demo Mode Stats */}
      {defaultProvider === 'demo' && (
        <DemoModeStats quota={demoQuota} />
      )}

      {/* API Key Input (hidden for demo mode) */}
      {defaultProvider && defaultProvider !== 'demo' && (
        <div className="space-y-2">
          <Label>API Key</Label>
          <ApiKeyInput
            providerId={defaultProvider}
            maskedKey={currentApiKeyStatus}
            onSave={handleSaveKey}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Model Selector (only for OpenRouter) */}
      {defaultProvider === 'openrouter' && (
        <div className="space-y-2">
          <Label>Model</Label>
          <ModelSelector
            value={currentSelectedModel}
            models={availableModels}
            query={localModelQuery}
            onQueryChange={handleModelSearch}
            onSelect={handleModelSelect}
            isLoading={isLoadingModels}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Connection Status */}
      {defaultProvider && (
        <div className="space-y-2">
          <Label>Connection Status</Label>
          <ConnectionStatus
            status={currentConnectionStatus}
            error={currentConnectionError}
            onTest={handleTestConnection}
            disabled={isLoading}
            isConfigured={currentProvider?.is_configured ?? false}
          />
        </div>
      )}
    </div>
  );
}
