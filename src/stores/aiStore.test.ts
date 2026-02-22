import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useAiStore } from './aiStore';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('aiStore model settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiStore.setState({
      availableModels: [],
      selectedModelByProvider: {},
      modelQuery: '',
      isLoadingModels: false,
      modelError: null,
    } as Partial<ReturnType<typeof useAiStore.getState>>);
  });

  it('loads openrouter models and selected model', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce([
        { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air' },
      ])
      .mockResolvedValueOnce('z-ai/glm-4.5-air:free');

    await useAiStore.getState().loadOpenRouterModels('glm');
    await useAiStore.getState().loadProviderModel('openrouter');

    expect(invoke).toHaveBeenCalledWith('get_openrouter_models', {
      query: 'glm',
      limit: 200,
    });
    expect(invoke).toHaveBeenCalledWith('get_provider_model', {
      providerId: 'openrouter',
    });
  });
});
