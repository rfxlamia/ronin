import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types/project';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mocks
vi.mock('@/components/ContextPanel', () => ({
    ContextPanel: ({ state, text, attribution }: any) => (
        <div data-testid="context-panel" data-state={state}>
            {text}
            {attribution && <div data-testid="attribution">Attribution Present</div>}
        </div>
    )
}));

const mockArchiveProject = vi.fn();
const mockRestoreProject = vi.fn();
const mockRemoveProject = vi.fn();

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: (selector: any) => {
        const state = {
            archiveProject: mockArchiveProject,
            restoreProject: mockRestoreProject,
            removeProject: mockRemoveProject,
        };
        return selector(state);
    }
}));

describe('ProjectCard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mockGitProject: Project = {
        id: 1,
        name: 'Test Project',
        path: '/home/user/test-project',
        type: 'git',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        healthStatus: 'active',
        gitBranch: 'main',
        uncommittedCount: 3,
    };

    describe('Card Display', () => {
        it('renders project name in serif font', () => {
            render(<ProjectCard project={mockGitProject} />);
            const name = screen.getByText('Test Project');
            expect(name).toBeInTheDocument();
            expect(name).toHaveClass('font-serif');
        });
    });

    describe('Expansion Interaction', () => {
        it('expands when clicked and shows streaming state', async () => {
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByText('Test Project').closest('button');
            if (!trigger) throw new Error('Trigger not found');
            
            fireEvent.click(trigger);

            // Advance timers past the 500ms initial delay
            await act(async () => {
                await vi.advanceTimersByTimeAsync(600);
            });

            // Use getBy instead of findBy to avoid timeout issues with fake timers
            const panel = screen.getByTestId('context-panel');
            expect(panel).toBeInTheDocument();
            expect(panel).toHaveAttribute('data-state', 'streaming');
        });

        it('shows "Open in IDE" button when expanded', async () => {
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByText('Test Project').closest('button');
            if (!trigger) throw new Error('Trigger not found');
            
            fireEvent.click(trigger);

            // Advance timers slightly to allow rendering
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });

            const ideButton = screen.getByText('Open in IDE');
            expect(ideButton).toBeInTheDocument();
        });

        it('transitions to complete state after streaming finishes', async () => {
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByText('Test Project').closest('button');
            if (!trigger) throw new Error('Trigger not found');
            
            fireEvent.click(trigger);

            // Fast forward time (500ms start + 5 chunks * 200ms = 1500ms + buffer)
            await act(async () => {
                await vi.advanceTimersByTimeAsync(2000);
            });

            const panel = screen.getByTestId('context-panel');
            expect(panel).toHaveAttribute('data-state', 'complete');
            expect(screen.getByTestId('attribution')).toBeInTheDocument();
        });
    });

    describe('Remove Project Dialog', () => {
        it('shows Remove option in dropdown menu', async () => {
            render(<ProjectCard project={mockGitProject} />);

            const menuButton = screen.getByRole('button', { name: /project menu/i });
            
            // Trigger dropdown
            fireEvent.pointerDown(menuButton);
            fireEvent.click(menuButton);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(200);
            });

            // Look for the item
            expect(screen.getByText(/remove/i)).toBeInTheDocument();
        });
    });
});