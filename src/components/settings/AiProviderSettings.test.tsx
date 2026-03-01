import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
        placeholder="Search OpenRouter model (e.g. glm, qwen, gemini)"
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

describe('AiProviderSettings model search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce model search API calls', () => {
    const loadOpenRouterModels = vi.fn().mockResolvedValue(undefined);
    const loadProviders = vi.fn().mockResolvedValue(undefined);
    const loadProviderModel = vi.fn().mockResolvedValue(undefined);

    useAiStore.setState({
      loadProviders,
      loadProviderModel,
      loadOpenRouterModels,
    });

    render(<AiProviderSettings />);

    // Initial load triggers once
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(loadProviders).toHaveBeenCalled();

    const searchInput = screen.getByPlaceholderText('Search OpenRouter model (e.g. glm, qwen, gemini)');

    // Clear initial call count
    loadOpenRouterModels.mockClear();

    // Type rapidly (simulating typing)
    fireEvent.change(searchInput, { target: { value: 'gpt' } });

    // Should not call API immediately after typing (debounce hasn't fired)
    expect(loadOpenRouterModels).not.toHaveBeenCalled();

    // Advance timers by 300ms (debounce delay)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now API should be called once with final value
    expect(loadOpenRouterModels).toHaveBeenCalledTimes(1);
    expect(loadOpenRouterModels).toHaveBeenCalledWith('gpt');
  });

  it('does NOT call loadProviderModel when model search query changes', async () => {
    const loadProviderModel = vi.fn().mockResolvedValue(undefined);
    const loadOpenRouterModels = vi.fn().mockResolvedValue(undefined);
    const loadProviders = vi.fn().mockResolvedValue(undefined);

    useAiStore.setState({
      loadProviders,
      loadProviderModel,
      loadOpenRouterModels,
      defaultProvider: 'openrouter',
    });

    render(<AiProviderSettings />);

    // Advance timers to let initial effects run
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Clear call count after initial mount
    loadProviderModel.mockClear();

    // Simulate typing in model search (triggers debouncedModelQuery change)
    const searchInput = screen.getByTestId('model-search');
    fireEvent.change(searchInput, { target: { value: 'gpt' } });

    // After debounce, loadOpenRouterModels should be called but NOT loadProviderModel
    act(() => {
      vi.advanceTimersByTime(400); // wait for debounce (300ms)
    });

    expect(loadProviderModel).not.toHaveBeenCalled(); // not called on search
    expect(loadOpenRouterModels).toHaveBeenCalledWith('gpt');
  });
});
