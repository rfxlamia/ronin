import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitStatusDisplay } from './GitStatusDisplay';

// Mock the useGitStatus hook
vi.mock('@/hooks/useGitStatus', () => ({
    useGitStatus: vi.fn(),
}));

import { useGitStatus } from '@/hooks/useGitStatus';

const mockUseGitStatus = useGitStatus as ReturnType<typeof vi.fn>;

describe('GitStatusDisplay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when there is an error', () => {
        mockUseGitStatus.mockReturnValue({
            status: null,
            loading: false,
            error: 'Not a git repository',
        });

        const { container } = render(<GitStatusDisplay projectPath="/some/path" />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when status is null', () => {
        mockUseGitStatus.mockReturnValue({
            status: null,
            loading: false,
            error: null,
        });

        const { container } = render(<GitStatusDisplay projectPath="/some/path" />);
        expect(container.firstChild).toBeNull();
    });

    it('returns null when loading with no status (initial state)', () => {
        // Note: Component returns null when status is null, even during loading
        // This is intentional - we don't show skeleton for non-git projects
        mockUseGitStatus.mockReturnValue({
            status: null,
            loading: true,
            error: null,
        });

        const { container } = render(<GitStatusDisplay projectPath="/some/path" />);
        expect(container.firstChild).toBeNull();
    });

    it('renders branch name', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 0,
                unpushedCommits: 0,
                lastCommitTimestamp: 1703318400,
                hasRemote: false,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('renders uncommitted files count when > 0', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 5,
                unpushedCommits: 0,
                lastCommitTimestamp: 1703318400,
                hasRemote: false,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.getByText(/5 uncommitted files/)).toBeInTheDocument();
    });

    it('does not render uncommitted files when count is 0', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 0,
                unpushedCommits: 0,
                lastCommitTimestamp: 1703318400,
                hasRemote: false,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.queryByText(/uncommitted/)).toBeNull();
    });

    it('renders unpushed commits when has remote and count > 0', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 0,
                unpushedCommits: 3,
                lastCommitTimestamp: 1703318400,
                hasRemote: true,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.getByText(/3 unpushed commits/)).toBeInTheDocument();
    });

    it('does not render unpushed commits when no remote', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 0,
                unpushedCommits: 3,
                lastCommitTimestamp: 1703318400,
                hasRemote: false, // No remote
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.queryByText(/unpushed/)).toBeNull();
    });

    it('renders "Last commit Never" when timestamp is 0', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 0,
                unpushedCommits: 0,
                lastCommitTimestamp: 0, // No commits
                hasRemote: false,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.getByText(/Last commit Never/)).toBeInTheDocument();
    });

    it('renders formatted last commit time when timestamp > 0', () => {
        // Use a timestamp from the past
        const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'develop',
                uncommittedFiles: 0,
                unpushedCommits: 0,
                lastCommitTimestamp: pastTimestamp,
                hasRemote: true,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        // Should show "about 1 hour ago" or similar
        expect(screen.getByText(/Last commit/)).toBeInTheDocument();
        expect(screen.queryByText(/Last commit Never/)).toBeNull();
    });

    it('uses singular form for 1 uncommitted file', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 1,
                unpushedCommits: 0,
                lastCommitTimestamp: 1703318400,
                hasRemote: false,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.getByText(/1 uncommitted file$/)).toBeInTheDocument();
    });

    it('uses singular form for 1 unpushed commit', () => {
        mockUseGitStatus.mockReturnValue({
            status: {
                branch: 'main',
                uncommittedFiles: 0,
                unpushedCommits: 1,
                lastCommitTimestamp: 1703318400,
                hasRemote: true,
            },
            loading: false,
            error: null,
        });

        render(<GitStatusDisplay projectPath="/some/path" />);
        expect(screen.getByText(/1 unpushed commit$/)).toBeInTheDocument();
    });
});
