import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AiProviderSettings } from './AiProviderSettings';
import { useAiStore } from '@/stores/aiStore';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock the child components
vi.mock('./ProviderSelector', () => ({
  ProviderSelector: ({ value, onChange }: { value: string | null; onChange: (id: string) => void }) => (
    <select
      data-testid="provider-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="openrouter">OpenRouter</option>
      <option value="demo">Demo</option>
    </select>
  ),
}));

vi.mock('./ApiKeyInput', () => ({
  ApiKeyInput: () => <div data-testid="api-key-input">API Key Input</div>,
}));

vi.mock('./ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connection Status</div>,
}));

vi.mock('./DemoModeStats', () => ({
  DemoModeStats: () => <div data-testid="demo-mode-stats">Demo Stats</div>,
}));

vi.mock('./ModelSelector', () => ({
  ModelSelector: ({ onQueryChange }: { onQueryChange: (q: string) => void }) => (
    <div data-testid="model-selector">
      <input
        data-testid="model-search"
        placeholder="Search model"
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </div>
  ),
}));

describe('AiProviderSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAiStore.setState({
      providers: [
        { id: 'openrouter', name: 'OpenRouter', is_configured: true, is_default: true },
        { id: 'demo', name: 'Demo', is_configured: true, is_default: false },
      ],
      defaultProvider: 'openrouter',
      isLoading: false,
      error: null,
      availableModels: [],
      selectedModelByProvider: {},
      modelQuery: '',
      isLoadingModels: false,
      modelError: null,
      apiKeyStatus: {},
      connectionStatus: {},
      connectionError: {},
    });
  });

  it('loads provider model + models when openrouter selected', async () => {
    const loadProviders = vi.fn().mockResolvedValue(undefined);
    const loadProviderModel = vi.fn().mockResolvedValue(undefined);
    const loadOpenRouterModels = vi.fn().mockResolvedValue(undefined);

    // Override store actions with mocks
    useAiStore.setState({
      loadProviders,
      loadProviderModel,
      loadOpenRouterModels,
    });

    render(<AiProviderSettings />);

    // Wait for the effects to run
    await waitFor(() => {
      expect(loadProviders).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(loadProviderModel).toHaveBeenCalledWith('openrouter');
    });

    await waitFor(() => {
      expect(loadOpenRouterModels).toHaveBeenCalled();
    });
  });

  it('renders model selector for openrouter provider', async () => {
    render(<AiProviderSettings />);

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    });
  });

  it('does not render model selector for demo provider', async () => {
    useAiStore.setState({
      defaultProvider: 'demo',
    });

    render(<AiProviderSettings />);

    await waitFor(() => {
      expect(screen.queryByTestId('model-selector')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('demo-mode-stats')).toBeInTheDocument();
  });
});
