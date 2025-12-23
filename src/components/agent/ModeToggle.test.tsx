import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ModeToggle } from './ModeToggle';
import { useReasoningStore } from '@/stores/reasoningStore';

// Mock the reasoning store
vi.mock('@/stores/reasoningStore');

describe('ModeToggle', () => {
  const mockProjectId = 'test-project-123';

  it('should render both Flash and Thinking mode options', () => {
    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue({
      byProject: {},
      setMode: vi.fn(),
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    });

    render(<ModeToggle projectId={mockProjectId} />);

    expect(screen.getByText(/Flash/i)).toBeInTheDocument();
    expect(screen.getByText(/Thinking/i)).toBeInTheDocument();
  });

  it('should display Flash mode as active by default', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-flash' as const,
          activeProtocol: null,
          currentStepId: null,
          currentToolCalls: [],
          stepHistory: [],
        },
      },
      setMode: vi.fn(),
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    };

    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue(mockStore);

    render(<ModeToggle projectId={mockProjectId} />);

    const flashButton = screen.getByLabelText('Flash Mode');
    expect(flashButton).toHaveAttribute('data-state', 'on');
  });

  it('should call setMode when switching to Thinking mode', async () => {
    const user = userEvent.setup();
    const mockSetMode = vi.fn();

    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-flash' as const,
          activeProtocol: null,
          currentStepId: null,
          currentToolCalls: [],
          stepHistory: [],
        },
      },
      setMode: mockSetMode,
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    };

    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue(mockStore);

    render(<ModeToggle projectId={mockProjectId} />);

    const thinkingButton = screen.getByLabelText('Thinking Mode');
    await user.click(thinkingButton);

    expect(mockSetMode).toHaveBeenCalledWith(mockProjectId, 'ronin-thinking');
  });

  it('should show Flash mode with green/blue accent when active', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-flash' as const,
          activeProtocol: null,
          currentStepId: null,
          currentToolCalls: [],
          stepHistory: [],
        },
      },
      setMode: vi.fn(),
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    };

    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue(mockStore);

    const { container } = render(<ModeToggle projectId={mockProjectId} />);

    // Check for flash mode styling (this will depend on implementation)
    const flashButton = screen.getByLabelText('Flash Mode');
    expect(flashButton).toBeInTheDocument();
    expect(flashButton).toHaveClass('data-[state=on]:bg-emerald-500/10');
  });

  it('should show Thinking mode with purple/gold accent when active', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: null,
          currentStepId: null,
          currentToolCalls: [],
          stepHistory: [],
        },
      },
      setMode: vi.fn(),
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    };

    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue(mockStore);

    const { container } = render(<ModeToggle projectId={mockProjectId} />);

    const thinkingButton = screen.getByLabelText('Thinking Mode');
    expect(thinkingButton).toHaveAttribute('data-state', 'on');
    expect(thinkingButton).toHaveClass('data-[state=on]:bg-amber-500/10');
  });
});
