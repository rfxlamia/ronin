import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentChat } from './AgentChat';

// Mock the useAgentAnalysis hook
vi.mock('@/hooks/useAgentAnalysis', () => ({
  useAgentAnalysis: () => ({
    state: 'idle',
    messages: [],
    error: null,
    analyze: vi.fn(),
    reset: vi.fn(),
    isAnalyzing: false,
  }),
}));

describe('AgentChat', () => {
  const mockProjectId = 'test-project-123';

  it('should render the analyze button', () => {
    render(<AgentChat projectId={mockProjectId} />);
    expect(screen.getByRole('button', { name: /Analyze Project/i })).toBeInTheDocument();
  });

  it('should display empty state when no messages', () => {
    render(<AgentChat projectId={mockProjectId} />);
    expect(screen.getByText(/Ready for Deep Analysis/i)).toBeInTheDocument();
    expect(screen.queryByText(/Based on:/i)).not.toBeInTheDocument();
  });

  it('should use pulse animation instead of spinner', () => {
    // Verify no Loader2 spinner is used - the button uses Brain icon with animate-pulse
    render(<AgentChat projectId={mockProjectId} />);
    const button = screen.getByRole('button', { name: /Analyze Project/i });
    expect(button).toBeInTheDocument();
    // Button should not contain animate-spin class (spinner)
    expect(button.innerHTML).not.toContain('animate-spin');
  });

  it('should show analyze button with Brain icon', () => {
    render(<AgentChat projectId={mockProjectId} />);
    const button = screen.getByRole('button', { name: /Analyze Project/i });
    expect(button).toBeInTheDocument();
  });
});
