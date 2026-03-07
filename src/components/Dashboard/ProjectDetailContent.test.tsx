import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectDetailContent } from './ProjectDetailContent';
import type { Project } from '@/types/project';

beforeEach(() => {
    // Reset to default state before each test
    mockGitStatus = { uncommittedFiles: 2, unpushedCommits: 0 };
});

// Mock ContextPanel
vi.mock('@/components/ContextPanel', () => ({
    ContextPanel: ({ state, text }: any) => (
        <div data-testid="context-panel" data-state={state}>
            {text}
        </div>
    ),
}));

// Mock GitStatusDisplay
vi.mock('./GitStatusDisplay', () => ({
    GitStatusDisplay: ({ projectPath }: any) => (
        <div data-testid="git-status-display">{projectPath}</div>
    ),
}));

// Mock GitControls
vi.mock('./GitControls', () => ({
    GitControls: () => <div data-testid="git-controls" />,
}));

// Mock useGitStatus - will be overridden per test
let mockGitStatus = { uncommittedFiles: 2, unpushedCommits: 0 };

vi.mock('@/hooks/useGitStatus', () => ({
    useGitStatus: () => ({
        status: mockGitStatus,
        refresh: vi.fn(),
    }),
}));

const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    path: '/home/user/test',
    type: 'git',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    healthStatus: 'active',
    gitBranch: 'main',
    uncommittedCount: 2,
};

const defaultProps = {
    project: mockProject,
    contextState: 'complete' as const,
    contextText: 'Some context',
    attribution: undefined,
    error: null,
    parsedError: null,
    retry: vi.fn(),
    isOpeningIDE: false,
    onOpenInIDE: vi.fn(),
};

describe('ProjectDetailContent', () => {
    it('renders ContextPanel with correct props', () => {
        render(<ProjectDetailContent {...defaultProps} />);
        const panel = screen.getByTestId('context-panel');
        expect(panel).toBeInTheDocument();
        expect(panel).toHaveAttribute('data-state', 'complete');
    });

    it('renders GitStatusDisplay for git projects', () => {
        render(<ProjectDetailContent {...defaultProps} />);
        expect(screen.getByTestId('git-status-display')).toBeInTheDocument();
    });

    it('does not render GitStatusDisplay for folder projects', () => {
        const folderProject = { ...mockProject, type: 'folder' as const };
        render(<ProjectDetailContent {...defaultProps} project={folderProject} />);
        expect(screen.queryByTestId('git-status-display')).not.toBeInTheDocument();
    });

    it('renders Open in IDE button', () => {
        render(<ProjectDetailContent {...defaultProps} />);
        expect(screen.getByText('Open in IDE')).toBeInTheDocument();
    });

    it('shows Opening... when isOpeningIDE is true', () => {
        render(<ProjectDetailContent {...defaultProps} isOpeningIDE={true} />);
        expect(screen.getByText('Opening...')).toBeInTheDocument();
    });

    it('does not render GitControls when there are no uncommitted changes', () => {
        mockGitStatus = { uncommittedFiles: 0, unpushedCommits: 0 };
        render(<ProjectDetailContent {...defaultProps} />);
        expect(screen.queryByTestId('git-controls')).not.toBeInTheDocument();
    });

    it('renders GitControls when there are unpushed commits', () => {
        mockGitStatus = { uncommittedFiles: 0, unpushedCommits: 3 };
        render(<ProjectDetailContent {...defaultProps} />);
        expect(screen.getByTestId('git-controls')).toBeInTheDocument();
    });
});
