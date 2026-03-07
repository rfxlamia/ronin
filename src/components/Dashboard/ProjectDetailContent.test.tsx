import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectDetailContent } from './ProjectDetailContent';
import type { Project } from '@/types/project';

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

// Mock useGitStatus
vi.mock('@/hooks/useGitStatus', () => ({
    useGitStatus: () => ({
        status: { uncommittedFiles: 2, unpushedCommits: 0 },
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
});
