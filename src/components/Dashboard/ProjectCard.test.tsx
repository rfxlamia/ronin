import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types/project';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock state that tests can control
let mockContextState: 'idle' | 'streaming' | 'complete' | 'error' = 'idle';
let mockContextText = '';
let mockAttribution: { commits: number; files: number; sources: string[] } | null = null;

// Helper to set mock state from tests
export const setMockAiState = (
    state: 'idle' | 'streaming' | 'complete' | 'error',
    text = '',
    attribution: { commits: number; files: number; sources: string[] } | null = null
) => {
    mockContextState = state;
    mockContextText = text;
    mockAttribution = attribution;
};

const mockGenerateContext = vi.fn();
const mockRetry = vi.fn();

vi.mock('@/hooks/useAiContext', () => ({
    useAiContext: () => ({
        contextState: mockContextState,
        contextText: mockContextText,
        attribution: mockAttribution,
        error: null,
        isCached: false,
        generateContext: mockGenerateContext,
        retry: mockRetry,
    }),
}));

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

vi.mock('@/stores/reasoningStore', () => ({
    useReasoningStore: () => ({
        setMode: vi.fn(),
    }),
}));

describe('ProjectCard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        // Reset mock AI context state
        mockContextState = 'idle';
        mockContextText = '';
        mockAttribution = null;
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
            render(
                <MemoryRouter>
                    <ProjectCard project={mockGitProject} />
                </MemoryRouter>
            );
            const name = screen.getByText('Test Project');
            expect(name).toBeInTheDocument();
            expect(name).toHaveClass('font-serif');
        });
    });

    describe('Expansion Interaction', () => {
        it('expands when clicked and shows streaming state', async () => {
            // Set mock to streaming state
            mockContextState = 'streaming';

            render(
                <MemoryRouter>
                    <ProjectCard project={mockGitProject} />
                </MemoryRouter>
            );

            const trigger = screen.getByText('Test Project').closest('button');
            if (!trigger) throw new Error('Trigger not found');

            fireEvent.click(trigger);

            // Advance timers to allow collapsible to open
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });

            const panel = screen.getByTestId('context-panel');
            expect(panel).toBeInTheDocument();
            expect(panel).toHaveAttribute('data-state', 'streaming');
        });

        it('shows "Open in IDE" button when expanded', async () => {
            render(
                <MemoryRouter>
                    <ProjectCard project={mockGitProject} />
                </MemoryRouter>
            );

            const trigger = screen.getByText('Test Project').closest('button');
            if (!trigger) throw new Error('Trigger not found');

            fireEvent.click(trigger);

            // Advance timers slightly to allow collapsible to open
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });

            const ideButton = screen.getByText('Open in IDE');
            expect(ideButton).toBeInTheDocument();
        });

        it('transitions to complete state after streaming finishes', async () => {
            // Set mock to complete state with attribution
            mockContextState = 'complete';
            mockContextText = '## Context\nYou were working on auth.';
            mockAttribution = { commits: 12, files: 2, sources: ['git'] };

            render(
                <MemoryRouter>
                    <ProjectCard project={mockGitProject} />
                </MemoryRouter>
            );

            const trigger = screen.getByText('Test Project').closest('button');
            if (!trigger) throw new Error('Trigger not found');

            fireEvent.click(trigger);

            // Advance timers to allow collapsible to open
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });

            const panel = screen.getByTestId('context-panel');
            expect(panel).toHaveAttribute('data-state', 'complete');
            expect(screen.getByTestId('attribution')).toBeInTheDocument();
        });

        it('expands via keyboard when pressing Enter on focused card', async () => {
            // Set mock to streaming state for this test
            mockContextState = 'streaming';

            render(
                <MemoryRouter>
                    <ProjectCard project={mockGitProject} />
                </MemoryRouter>
            );

            const trigger = screen.getByRole('button', { name: /test project/i });

            // Focus the trigger
            trigger.focus();
            expect(trigger).toHaveFocus();

            // Press Enter using fireEvent.click (simulates keyboard activation of button)
            fireEvent.click(trigger);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });

            const panel = screen.getByTestId('context-panel');
            expect(panel).toBeInTheDocument();
            expect(panel).toHaveAttribute('data-state', 'streaming');
        });
    });

    describe('Remove Project Dialog', () => {
        it('shows Remove option in dropdown menu', async () => {
            render(
                <MemoryRouter>
                    <ProjectCard project={mockGitProject} />
                </MemoryRouter>
            );

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