import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingIndicator } from './ThinkingIndicator';
import { useReasoningStore } from '@/stores/reasoningStore';

vi.mock('@/stores/reasoningStore');

describe('ThinkingIndicator', () => {
  const mockProjectId = 'test-project-123';

  it('should not render when no active protocol', () => {
    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue({
      byProject: {},
      setMode: vi.fn(),
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    });

    const { container } = render(<ThinkingIndicator projectId={mockProjectId} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display "Thinking..." when protocol is active but no tool calls', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-01-scan-structure',
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

    render(<ThinkingIndicator projectId={mockProjectId} />);
    expect(screen.getByText(/Thinking\.\.\./i)).toBeInTheDocument();
  });

  it('should parse and display tool calls as user-friendly text', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-02-read-metadata',
          currentToolCalls: ['read_file(package.json)'],
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

    render(<ThinkingIndicator projectId={mockProjectId} />);
    expect(screen.getByText(/Reading package\.json/i)).toBeInTheDocument();
  });

  it('should display the latest tool call when multiple exist', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-03-analyze-git',
          currentToolCalls: ['list_files(.)', 'run_command(git status)', 'run_command(git log)'],
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

    render(<ThinkingIndicator projectId={mockProjectId} />);
    // Should show the latest tool call
    expect(screen.getByText(/git log/i)).toBeInTheDocument();
  });

  it('should include an icon for the activity type', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-02-read-metadata',
          currentToolCalls: ['read_file(package.json)'],
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

    const { container } = render(<ThinkingIndicator projectId={mockProjectId} />);
    // Check for an icon (svg element)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
