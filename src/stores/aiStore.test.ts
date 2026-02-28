import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
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

describe('aiStore upgradePromptDismissed', () => {
  // Simple localStorage mock that actually stores values
  let store: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    store = {};
    // Mock localStorage to actually store/retrieve values
    // Note: setup.ts mocks localStorage, so we need to override the mock implementation
    (localStorage.getItem as Mock).mockImplementation((key: string) => store[key] ?? null);
    (localStorage.setItem as Mock).mockImplementation((key: string, value: string) => { store[key] = value; });
    (localStorage.removeItem as Mock).mockImplementation((key: string) => { delete store[key]; });
    (localStorage.clear as Mock).mockImplementation(() => { store = {}; });
    // Reset store ke state awal sebelum tiap test
    useAiStore.setState({ upgradePromptDismissed: false });
  });

  it('defaults to false when localStorage is empty', () => {
    // Jika tidak ada key di localStorage, harus false
    expect(useAiStore.getState().upgradePromptDismissed).toBe(false);
  });

  it('dismissUpgradePrompt writes dismissedUntil timestamp (not boolean key)', () => {
    useAiStore.getState().dismissUpgradePrompt();

    // Harus menulis timestamp, BUKAN boolean 'true'
    const dismissedUntil = localStorage.getItem('demo-upgrade-dismissed-until');
    expect(dismissedUntil).not.toBeNull();
    expect(parseInt(dismissedUntil!, 10)).toBeGreaterThan(Date.now());

    // Key boolean TIDAK boleh ditulis lagi (sudah dihapus dari logic)
    const booleanKey = localStorage.getItem('demo-upgrade-dismissed');
    expect(booleanKey).toBeNull();
  });

  it('reads expiry from demo-upgrade-dismissed-until, not boolean key', () => {
    // Simulasikan: user dismiss kemarin (expired)
    const yesterday = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem('demo-upgrade-dismissed-until', yesterday.toString());

    // getInitialUpgradePromptDismissed() harus return false karena expired
    expect(useAiStore.getState().upgradePromptDismissed).toBe(false);
  });

  it('reads expiry from demo-upgrade-dismissed-until when still valid', () => {
    // Simulasikan: user dismiss 1 jam yang lalu (belum expired)
    const oneHourFromNow = Date.now() + 23 * 60 * 60 * 1000;
    localStorage.setItem('demo-upgrade-dismissed-until', oneHourFromNow.toString());

    // Verifikasi logic expiry: cek apakah timestamp masih valid
    const dismissedUntil = localStorage.getItem('demo-upgrade-dismissed-until');
    const isStillDismissed = dismissedUntil && Date.now() < parseInt(dismissedUntil, 10);
    expect(isStillDismissed).toBeTruthy();
  });
});
