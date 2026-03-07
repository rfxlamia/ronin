import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectDetailDialog } from './ProjectDetailDialog';
import type { Project } from '@/types/project';

// Mock ProjectDetailContent and GitControlsWrapper
vi.mock('./ProjectDetailContent', () => ({
    ProjectDetailContent: (props: any) => (
        <div data-testid="project-detail-content" data-project={props.project.name} />
    ),
    GitControlsWrapper: () => <div data-testid="git-controls-wrapper" />,
}));

// Mock ContextPanel for two-column layout
vi.mock('@/components/ContextPanel', () => ({
    ContextPanel: ({ state }: any) => (
        <div data-testid="context-panel" data-state={state} />
    ),
}));

// Mock GitStatusDisplay
vi.mock('./GitStatusDisplay', () => ({
    GitStatusDisplay: ({ projectPath }: any) => (
        <div data-testid="git-status-display">{projectPath}</div>
    ),
}));

// Mock useGitStatus
vi.mock('@/hooks/useGitStatus', () => ({
    useGitStatus: () => ({
        status: { uncommittedFiles: 2, unpushedCommits: 0 },
        refresh: vi.fn(),
    }),
}));

// Mock HealthBadge
vi.mock('./HealthBadge', () => ({
    HealthBadge: ({ status }: any) => (
        <span data-testid="health-badge">{status}</span>
    ),
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
    open: true,
    onOpenChange: vi.fn(),
    contextState: 'complete' as const,
    contextText: 'Some context',
    attribution: undefined,
    error: null,
    parsedError: null,
    retry: vi.fn(),
    isOpeningIDE: false,
    onOpenInIDE: vi.fn(),
};

describe('ProjectDetailDialog', () => {
    it('renders project name in dialog header when open', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('renders content when open', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        expect(screen.getByTestId('context-panel')).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
        render(<ProjectDetailDialog {...defaultProps} open={false} />);
        expect(screen.queryByTestId('context-panel')).not.toBeInTheDocument();
    });

    it('renders health badge in header', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        expect(screen.getByTestId('health-badge')).toBeInTheDocument();
    });

    it('renders GitStatusDisplay for git projects', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        expect(screen.getByTestId('git-status-display')).toBeInTheDocument();
    });
});
