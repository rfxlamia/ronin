import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGitStatus } from './useGitStatus';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('useGitStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns null status when projectPath is null', () => {
        const { result } = renderHook(() => useGitStatus(null));

        expect(result.current.status).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('fetches git status on mount', async () => {
        const mockStatus = {
            branch: 'main',
            uncommittedFiles: 5,
            unpushedCommits: 2,
            lastCommitTimestamp: 1703318400,
            hasRemote: true,
        };

        mockInvoke.mockResolvedValueOnce(mockStatus);

        const { result } = renderHook(() => useGitStatus('/path/to/project'));

        // Should start loading
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.status).toEqual(mockStatus);
        expect(result.current.error).toBeNull();
        expect(mockInvoke).toHaveBeenCalledWith('get_git_status', { path: '/path/to/project' });
    });

    it('handles fetch error gracefully', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('Not a git repository'));

        const { result } = renderHook(() => useGitStatus('/path/to/folder'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.status).toBeNull();
        expect(result.current.error).toContain('Not a git repository');
    });

    it('refetches when projectPath changes', async () => {
        const mockStatus1 = {
            branch: 'main',
            uncommittedFiles: 0,
            unpushedCommits: 0,
            lastCommitTimestamp: 1703318400,
            hasRemote: true,
        };
        const mockStatus2 = {
            branch: 'develop',
            uncommittedFiles: 3,
            unpushedCommits: 1,
            lastCommitTimestamp: 1703404800,
            hasRemote: true,
        };

        mockInvoke.mockResolvedValueOnce(mockStatus1);

        const { result, rerender } = renderHook(
            ({ path }) => useGitStatus(path),
            { initialProps: { path: '/project1' } }
        );

        await waitFor(() => {
            expect(result.current.status?.branch).toBe('main');
        });

        mockInvoke.mockResolvedValueOnce(mockStatus2);
        rerender({ path: '/project2' });

        await waitFor(() => {
            expect(result.current.status?.branch).toBe('develop');
        });
    });

    it('refetches on window visibility change', async () => {
        const mockStatus = {
            branch: 'main',
            uncommittedFiles: 0,
            unpushedCommits: 0,
            lastCommitTimestamp: 1703318400,
            hasRemote: false,
        };

        mockInvoke.mockResolvedValue(mockStatus);

        const { result } = renderHook(() => useGitStatus('/path/to/project'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Initial fetch
        expect(mockInvoke).toHaveBeenCalledTimes(1);

        // Simulate visibility change to visible
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            writable: true,
        });

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledTimes(2);
        });
    });

    it('refetches on window focus', async () => {
        const mockStatus = {
            branch: 'feature',
            uncommittedFiles: 1,
            unpushedCommits: 0,
            lastCommitTimestamp: 1703318400,
            hasRemote: true,
        };

        mockInvoke.mockResolvedValue(mockStatus);

        const { result } = renderHook(() => useGitStatus('/path/to/project'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Initial fetch
        expect(mockInvoke).toHaveBeenCalledTimes(1);

        // Simulate window focus
        act(() => {
            window.dispatchEvent(new Event('focus'));
        });

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledTimes(2);
        });
    });
});
