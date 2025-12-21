import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DevlogHistory } from './DevlogHistory';
import { useDevlogStore } from '@/stores/devlogStore';
// Mock tauri invoke
import { invoke } from '@tauri-apps/api/core';

// Mock module imports
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
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

    it('should render loading state initially', () => {
        // Make invoke return a promise that doesn't resolve immediately
        (invoke as any).mockImplementation(() => new Promise(() => { }));

        render(<DevlogHistory />);
        expect(screen.getByText('Loading history...')).toBeInTheDocument();
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

    it('should handle fetch error', async () => {
        (invoke as any).mockRejectedValue('Fetch failed');

        render(<DevlogHistory />);

        await waitFor(() => {
            expect(screen.getByText('Fetch failed')).toBeInTheDocument();
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
});
