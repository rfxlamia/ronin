import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DevlogHistory } from './DevlogHistory';
import { invoke } from '@tauri-apps/api/core';

// Mock module imports
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock RoninLoader to avoid animation issues
vi.mock('@/components/ui/loader', () => ({
    RoninLoader: ({ className }: { className?: string }) => (
        <div data-testid="ronin-loader" className={className}>Loading</div>
    ),
}));

// Mock store
const mockSetViewMode = vi.fn();
const mockSelectVersion = vi.fn();
const mockSetSelectedVersionContent = vi.fn();
const mockCacheVersion = vi.fn();

// Partial mock of store state
const initialState = {
    activeProjectPath: '/path/to/project',
    setViewMode: mockSetViewMode,
    selectVersion: mockSelectVersion,
    setSelectedVersionContent: mockSetSelectedVersionContent,
    versionCache: {},
    cacheVersion: mockCacheVersion,
    selectedVersionHash: null,
};

// Mock useDevlogStore
vi.mock('@/stores/devlogStore', async () => {
    const actual = await vi.importActual('@/stores/devlogStore');
    return {
        ...actual,
        useDevlogStore: (selector: any) => selector(initialState),
    };
});

describe('DevlogHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading state with RoninLoader', () => {
        // Make invoke return a promise that doesn't resolve immediately
        (invoke as any).mockImplementation(() => new Promise(() => { }));

        render(<DevlogHistory />);
        expect(screen.getByTestId('ronin-loader')).toBeInTheDocument();
        expect(screen.getByText('Analyzing DEVLOG history...')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes on history list', async () => {
        const mockHistory = [
            { hash: '1234567890', date: '2023-01-01T12:00:00Z', author: 'User', message: 'Commit 1' },
        ];
        (invoke as any).mockResolvedValue(mockHistory);

        render(<DevlogHistory />);

        await waitFor(() => {
            const list = screen.getByRole('list');
            expect(list).toHaveAttribute('aria-label', 'DEVLOG commit history');
        });
    });

    it('should have aria-label on each commit item', async () => {
        const mockHistory = [
            { hash: '1234567890', date: '2023-01-01T12:00:00Z', author: 'TestUser', message: 'Test commit' },
        ];
        (invoke as any).mockResolvedValue(mockHistory);

        render(<DevlogHistory />);

        await waitFor(() => {
            const button = screen.getByRole('button');
            expect(button.getAttribute('aria-label')).toContain('Commit by TestUser');
            expect(button.getAttribute('aria-label')).toContain('Test commit');
        });
    });

    it('should fetch and render history', async () => {
        const mockHistory = [
            { hash: '1234567890', date: '2023-01-01T12:00:00Z', author: 'User', message: 'Commit 1' },
            { hash: '0987654321', date: '2023-01-02T12:00:00Z', author: 'User', message: 'Commit 2' },
        ];
        (invoke as any).mockResolvedValue(mockHistory);

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText('Commit 1')).toBeInTheDocument();
            expect(screen.getByText('Commit 2')).toBeInTheDocument();
        });

        expect(invoke).toHaveBeenCalledWith('get_devlog_history', {
            projectPath: '/path/to/project',
        });
    });

    it('should show empathetic message for non-git project', async () => {
        (invoke as any).mockRejectedValue('Failed to retrieve DEVLOG history. Ensure this is a Git repository.');

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText(/DEVLOG history requires Git/)).toBeInTheDocument();
            expect(screen.getByText(/git init/)).toBeInTheDocument();
            expect(screen.getByText(/git add DEVLOG.md/)).toBeInTheDocument();
        });
    });

    it('should show generic error for other errors', async () => {
        (invoke as any).mockRejectedValue('Network error');

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });

    it('should show empty state when no commits', async () => {
        (invoke as any).mockResolvedValue([]);

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText(/No history yet/)).toBeInTheDocument();
            expect(screen.getByText(/commit your DEVLOG/)).toBeInTheDocument();
        });
    });

    it('should handle version click (fetch and update store)', async () => {
        const mockHistory = [
            { hash: '1234567890', date: '2023-01-01T12:00:00Z', author: 'User', message: 'Commit 1' },
        ];
        (invoke as any).mockResolvedValueOnce(mockHistory); // for history
        (invoke as any).mockResolvedValueOnce('Version content'); // for version content

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText('Commit 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Commit 1'));

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('get_devlog_version', {
                projectPath: '/path/to/project',
                commitHash: '1234567890',
            });
            expect(mockSetSelectedVersionContent).toHaveBeenCalledWith('Version content');
            expect(mockSelectVersion).toHaveBeenCalledWith('1234567890');
            expect(mockSetViewMode).toHaveBeenCalledWith('version');
            expect(mockCacheVersion).toHaveBeenCalledWith('1234567890', 'Version content');
        });
    });

    it('should navigate with ArrowDown key', async () => {
        const mockHistory = [
            { hash: '1234567890', date: '2023-01-01T12:00:00Z', author: 'User', message: 'Commit 1' },
            { hash: '0987654321', date: '2023-01-02T12:00:00Z', author: 'User', message: 'Commit 2' },
        ];
        (invoke as any).mockResolvedValue(mockHistory);

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText('Commit 1')).toBeInTheDocument();
        });

        const list = screen.getByRole('list');
        fireEvent.keyDown(list, { key: 'ArrowDown' });

        // First button should get focused
        const buttons = screen.getAllByRole('button');
        expect(buttons[0]).toHaveFocus();
    });

    it('should call onEscapeToEditor when Escape is pressed', async () => {
        const mockOnEscape = vi.fn();
        const mockHistory = [
            { hash: '1234567890', date: '2023-01-01T12:00:00Z', author: 'User', message: 'Commit 1' },
        ];
        (invoke as any).mockResolvedValue(mockHistory);

        render(<DevlogHistory onEscapeToEditor={mockOnEscape} />);

        await waitFor(() => {
            expect(screen.getByText('Commit 1')).toBeInTheDocument();
        });

        const list = screen.getByRole('list');
        fireEvent.keyDown(list, { key: 'Escape' });

        expect(mockOnEscape).toHaveBeenCalled();
        expect(mockSetViewMode).toHaveBeenCalledWith('edit');
    });

    it('should show "50 commits" message when 50+ commits', async () => {
        const mockHistory = Array.from({ length: 50 }, (_, i) => ({
            hash: `hash${i}`,
            date: '2023-01-01T12:00:00Z',
            author: 'User',
            message: `Commit ${i}`,
        }));
        (invoke as any).mockResolvedValue(mockHistory);

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText(/Showing last 50 commits/)).toBeInTheDocument();
        });
    });
});
