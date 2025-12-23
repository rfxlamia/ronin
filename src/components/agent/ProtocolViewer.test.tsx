import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtocolViewer } from './ProtocolViewer';
import { useReasoningStore } from '@/stores/reasoningStore';
import { PROJECT_RESURRECTION_PROTOCOL } from '@/lib/ai/protocols/project-resurrection';

vi.mock('@/stores/reasoningStore');

describe('ProtocolViewer', () => {
  const mockProjectId = 'test-project-123';

  it('should render all protocol steps', () => {
    // @ts-expect-error - Mocking zustand store
    vi.mocked(useReasoningStore).mockReturnValue({
      byProject: {},
      setMode: vi.fn(),
      startProtocol: vi.fn(),
      appendToolCall: vi.fn(),
      completeStep: vi.fn(),
      reset: vi.fn(),
    });

    render(<ProtocolViewer projectId={mockProjectId} />);

    // Check that all 5 steps are rendered
    expect(screen.getByText(/Scan Project Structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Read Project Metadata/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyze Git History/i)).toBeInTheDocument();
    expect(screen.getByText(/Review Developer Log/i)).toBeInTheDocument();
    expect(screen.getByText(/Synthesize Context/i)).toBeInTheDocument();
  });

  it('should highlight the current step', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-02-read-metadata',
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

    const { container } = render(<ProtocolViewer projectId={mockProjectId} />);

    // Step 2 should be highlighted
    const step2 = screen.getByText(/Read Project Metadata/i).closest('[data-step-id]');
    expect(step2).toHaveAttribute('data-state', 'active');
  });

  it('should mark completed steps', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-03-analyze-git',
          currentToolCalls: [],
          stepHistory: [
            {
              stepId: 'step-01-scan-structure',
              output: 'Found package.json',
              timestamp: Date.now(),
              toolCallsMade: ['list_files'],
            },
            {
              stepId: 'step-02-read-metadata',
              output: 'Read package.json',
              timestamp: Date.now(),
              toolCallsMade: ['read_file'],
            },
          ],
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

    render(<ProtocolViewer projectId={mockProjectId} />);

    // Steps 1 and 2 should be marked complete
    const step1 = screen.getByText(/Scan Project Structure/i).closest('[data-step-id]');
    const step2 = screen.getByText(/Read Project Metadata/i).closest('[data-step-id]');

    expect(step1).toHaveAttribute('data-state', 'done');
    expect(step2).toHaveAttribute('data-state', 'done');
  });

  it('should show pending state for future steps', () => {
    const mockStore = {
      byProject: {
        [mockProjectId]: {
          activeMode: 'ronin-thinking' as const,
          activeProtocol: 'project-resurrection',
          currentStepId: 'step-02-read-metadata',
          currentToolCalls: [],
          stepHistory: [
            {
              stepId: 'step-01-scan-structure',
              output: 'Found package.json',
              timestamp: Date.now(),
              toolCallsMade: ['list_files'],
            },
          ],
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

    render(<ProtocolViewer projectId={mockProjectId} />);

    // Step 4 should be pending
    const step4 = screen.getByText(/Review Developer Log/i).closest('[data-step-id]');
    expect(step4).toHaveAttribute('data-state', 'pending');
  });
});
