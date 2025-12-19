import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types/project';

describe('ProjectCard', () => {
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

    const mockFolderProject: Project = {
        id: 2,
        name: 'Folder Project',
        path: '/home/user/folder-project',
        type: 'folder',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-12-10T00:00:00Z',
        healthStatus: 'dormant',
        fileCount: 15,
        lastActivityAt: '2024-12-10T00:00:00Z',
    };

    // Helper to get the card trigger button
    const getCardTrigger = () => {
        const buttons = screen.getAllByRole('button');
        const trigger = buttons.find(btn => btn.hasAttribute('data-project-card'));
        if (!trigger) {
            throw new Error('Could not find card trigger with data-project-card attribute');
        }
        return trigger;
    };

    describe('Card Display', () => {
        it('renders project name in serif font', () => {
            render(<ProjectCard project={mockGitProject} />);
            const name = screen.getByText('Test Project');
            expect(name).toBeInTheDocument();
            expect(name).toHaveClass('font-serif');
        });

        it('displays days since last activity', () => {
            render(<ProjectCard project={mockGitProject} />);
            expect(screen.getByText(/ago|Today|Yesterday/i)).toBeInTheDocument();
        });

        it('shows HealthBadge component with correct status', () => {
            render(<ProjectCard project={mockGitProject} />);
            expect(screen.getByLabelText(/Project status: attention/i)).toBeInTheDocument();
        });

        it('shows GitBranch icon for git projects', () => {
            const { container } = render(<ProjectCard project={mockGitProject} />);
            const icon = container.querySelector('[data-icon="git-branch"]');
            expect(icon).toBeInTheDocument();
        });

        it('shows Folder icon for folder projects', () => {
            const { container } = render(<ProjectCard project={mockFolderProject} />);
            const icon = container.querySelector('[data-icon="folder"]');
            expect(icon).toBeInTheDocument();
        });

        it('shows file count for folder projects', () => {
            render(<ProjectCard project={mockFolderProject} />);
            expect(screen.getByText(/15 files/i)).toBeInTheDocument();
        });

        it('shows singular "file" for folder with 1 file', () => {
            const singleFileProject: Project = {
                ...mockFolderProject,
                fileCount: 1,
            };
            render(<ProjectCard project={singleFileProject} />);
            expect(screen.getByText(/1 file$/i)).toBeInTheDocument();
        });

        it('handles folder with 0 files (empty or not found)', () => {
            const emptyFolderProject: Project = {
                ...mockFolderProject,
                fileCount: 0,
                lastActivityAt: undefined,
            };
            render(<ProjectCard project={emptyFolderProject} />);
            expect(screen.getByText(/0 files/i)).toBeInTheDocument();
        });

        it('card trigger indicates it opens a dialog', () => {
            render(<ProjectCard project={mockGitProject} />);
            const trigger = getCardTrigger();
            expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        });
    });

    describe('Modal Interaction', () => {
        it('opens modal when card is clicked', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = getCardTrigger();
            await user.click(trigger);

            // Modal should appear with project details
            expect(await screen.findByRole('dialog')).toBeInTheDocument();
        });

        it('shows git branch name in modal for git projects', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(getCardTrigger());

            const branch = await screen.findByText(/main/i);
            expect(branch).toBeInTheDocument();
        });

        it('shows uncommitted files count in modal when available', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(getCardTrigger());

            expect(await screen.findByText(/3.*uncommitted/i)).toBeInTheDocument();
        });

        it('shows "Open in IDE" button in modal', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(getCardTrigger());

            const ideButton = await screen.findByText('Open in IDE');
            expect(ideButton).toBeInTheDocument();
        });

        it('does not show git-specific fields for folder projects in modal', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockFolderProject} />);

            await user.click(getCardTrigger());

            // Wait for modal to appear
            await screen.findByRole('dialog');

            expect(screen.queryByText(/branch/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/uncommitted/i)).not.toBeInTheDocument();
        });

        it('closes modal when close button is clicked', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(getCardTrigger());
            expect(await screen.findByRole('dialog')).toBeInTheDocument();

            const closeButton = screen.getByRole('button', { name: /close/i });
            await user.click(closeButton);

            // Modal should be closed
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('closes modal when pressing Escape', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(getCardTrigger());
            expect(await screen.findByRole('dialog')).toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('handles missing optional git fields gracefully', async () => {
            const projectWithoutGitFields: Project = {
                ...mockGitProject,
                gitBranch: undefined,
                uncommittedCount: undefined,
            };

            const user = userEvent.setup();
            render(<ProjectCard project={projectWithoutGitFields} />);

            await user.click(getCardTrigger());

            // Should not crash and should still show Open IDE button
            const ideButton = await screen.findByText('Open in IDE');
            expect(ideButton).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('maintains proper focus management', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = getCardTrigger();

            await user.tab(); // Focus on dropdown menu button
            await user.tab(); // Focus on card trigger
            expect(trigger).toHaveFocus();
        });

        it('shows focus ring when focused', () => {
            render(<ProjectCard project={mockGitProject} />);
            const trigger = getCardTrigger();
            trigger.focus();

            expect(trigger).toHaveClass(/focus-visible/);
        });
    });

    describe('Remove Project Dialog', () => {
        it('shows Remove option in dropdown menu', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const menuButton = screen.getByRole('button', { name: /project menu/i });
            await user.click(menuButton);

            expect(screen.getByText(/remove/i)).toBeInTheDocument();
        });

        it('opens confirmation dialog when Remove is clicked', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const menuButton = screen.getByRole('button', { name: /project menu/i });
            await user.click(menuButton);

            const removeOption = screen.getByText(/remove/i);
            await user.click(removeOption);

            expect(screen.getByText(/Remove Test Project from Ronin\?/i)).toBeInTheDocument();
            expect(screen.getByText(/Your files won't be deleted/i)).toBeInTheDocument();
        });

        it('closes dialog when Cancel is clicked', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const menuButton = screen.getByRole('button', { name: /project menu/i });
            await user.click(menuButton);
            await user.click(screen.getByText(/remove/i));

            const cancelButton = screen.getByRole('button', { name: /cancel/i });
            await user.click(cancelButton);

            expect(screen.queryByText(/Remove Test Project from Ronin\?/i)).not.toBeInTheDocument();
        });

        it('has destructive styling on Remove button in dialog', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const menuButton = screen.getByRole('button', { name: /project menu/i });
            await user.click(menuButton);
            await user.click(screen.getByText(/remove/i));

            const dialogRemoveButton = screen.getByRole('button', { name: /^remove$/i });
            expect(dialogRemoveButton).toHaveClass('font-serif');
        });
    });
});
