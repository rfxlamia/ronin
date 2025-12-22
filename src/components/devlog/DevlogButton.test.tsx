import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevlogButton } from './DevlogButton';
import { useDevlogStore } from '@/stores/devlogStore';
import { useProjectStore } from '@/stores/projectStore';

// Mock the stores
vi.mock('@/stores/devlogStore', () => ({
  useDevlogStore: vi.fn(),
}));

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

describe('DevlogButton', () => {
  const mockOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        open: mockOpen,
        isOpen: false,
      };
      return selector(state);
    });

    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        projects: [
          { id: 1, name: 'Project 1', path: '/path/to/project1', isArchived: false },
          { id: 2, name: 'Project 2', path: '/path/to/project2', isArchived: false },
        ],
      };
      return selector(state);
    });
  });

  it('should render FAB button', () => {
    render(<DevlogButton />);

    const button = screen.getByRole('button', { name: /open devlog editor/i });
    expect(button).toBeInTheDocument();
  });

  it('should call open with first project when clicked', async () => {
    const user = userEvent.setup();
    render(<DevlogButton />);

    const button = screen.getByRole('button', { name: /open devlog editor/i });
    await user.click(button);

    expect(mockOpen).toHaveBeenCalledWith(1, '/path/to/project1');
  });

  it('should not render when modal is open', () => {
    (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        open: mockOpen,
        isOpen: true, // Modal is open
      };
      return selector(state);
    });

    render(<DevlogButton />);

    const button = screen.queryByRole('button', { name: /open devlog editor/i });
    expect(button).not.toBeInTheDocument();
  });

  it('should skip archived projects and use first non-archived', async () => {
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        projects: [
          { id: 1, name: 'Archived Project', path: '/path/to/archived', isArchived: true },
          { id: 2, name: 'Active Project', path: '/path/to/active', isArchived: false },
        ],
      };
      return selector(state);
    });

    const user = userEvent.setup();
    render(<DevlogButton />);

    const button = screen.getByRole('button', { name: /open devlog editor/i });
    await user.click(button);

    expect(mockOpen).toHaveBeenCalledWith(2, '/path/to/active');
  });

  it('should not render when no projects exist', () => {
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        projects: [], // No projects
      };
      return selector(state);
    });

    render(<DevlogButton />);

    const button = screen.queryByRole('button', { name: /open devlog editor/i });
    expect(button).not.toBeInTheDocument();
  });
});
