import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/stores/projectStore';

describe('ProjectCard', () => {
    const mockGitProject: Project = {
        id: 1,
        name: 'Test Project',
        path: '/home/user/test-project',
        type: 'git',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-12-15T00:00:00Z',
        lastActivityAt: '2024-12-15T00:00:00Z',
        healthStatus: 'Active',
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
        healthStatus: 'Dormant',
    };

    describe('Collapsed State', () => {
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
            expect(screen.getByLabelText(/Project status: Active/i)).toBeInTheDocument();
        });

        it('shows GitBranch icon for git projects', () => {
            const { container } = render(<ProjectCard project={mockGitProject} />);
            // lucide-react renders SVG with specific class
            const icon = container.querySelector('[data-icon="git-branch"]');
            expect(icon).toBeInTheDocument();
        });

        it('shows Folder icon for folder projects', () => {
            const { container } = render(<ProjectCard project={mockFolderProject} />);
            const icon = container.querySelector('[data-icon="folder"]');
            expect(icon).toBeInTheDocument();
        });

        it('has proper ARIA attributes when collapsed', () => {
            render(<ProjectCard project={mockGitProject} />);
            const trigger = screen.getByRole('button');
            expect(trigger).toHaveAttribute('aria-expanded', 'false');
        });
    });

    describe('Interaction', () => {
        it('expands card when clicked', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByRole('button');
            expect(trigger).toHaveAttribute('aria-expanded', 'false');

            await user.click(trigger);

            expect(trigger).toHaveAttribute('aria-expanded', 'true');
        });

        it('toggles expansion with Enter key', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByRole('button');
            trigger.focus();

            await user.keyboard('{Enter}');
            expect(trigger).toHaveAttribute('aria-expanded', 'true');

            await user.keyboard('{Enter}');
            expect(trigger).toHaveAttribute('aria-expanded', 'false');
        });

        it('toggles expansion with Space key', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByRole('button');
            trigger.focus();

            await user.keyboard(' ');
            expect(trigger).toHaveAttribute('aria-expanded', 'true');
        });

        it('shows focus ring (Antique Brass) when focused', () => {
            render(<ProjectCard project={mockGitProject} />);
            const trigger = screen.getByRole('button');
            trigger.focus();

            // Check for focus-visible class (Tailwind) or custom focus styles
            expect(trigger).toHaveClass(/focus-visible/);
        });
    });

    describe('Expanded State', () => {
        it('shows git branch name for git projects in monospace font', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(screen.getByRole('button'));

            const branch = screen.getByText(/main/i);
            expect(branch).toBeInTheDocument();
            expect(branch).toHaveClass('font-mono');
        });

        it('shows uncommitted files count when available', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(screen.getByRole('button'));

            expect(screen.getByText(/3.*uncommitted/i)).toBeInTheDocument();
        });

        it('shows "Open in IDE" button with serif font', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            await user.click(screen.getByRole('button'));

            const button = screen.getByRole('button', { name: /Open in IDE/i });
            expect(button).toBeInTheDocument();
            expect(button).toHaveClass('font-serif');
        });

        it('does not show git-specific fields for folder projects', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockFolderProject} />);

            await user.click(screen.getByRole('button'));

            expect(screen.queryByText(/branch/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/uncommitted/i)).not.toBeInTheDocument();
        });

        it('shows "Open in IDE" button for folder projects', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockFolderProject} />);

            await user.click(screen.getByRole('button'));

            expect(screen.getByRole('button', { name: /Open in IDE/i })).toBeInTheDocument();
        });

        it('handles missing optional git fields gracefully', async () => {
            const projectWithoutGitFields: Project = {
                ...mockGitProject,
                gitBranch: undefined,
                uncommittedCount: undefined,
            };

            const user = userEvent.setup();
            render(<ProjectCard project={projectWithoutGitFields} />);

            await user.click(screen.getByRole('button'));

            // Should not crash and should still show Open IDE button
            expect(screen.getByRole('button', { name: /Open in IDE/i })).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('maintains proper focus management', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByRole('button');

            await user.tab();
            expect(trigger).toHaveFocus();
        });

        it('has correct ARIA expanded state', async () => {
            const user = userEvent.setup();
            render(<ProjectCard project={mockGitProject} />);

            const trigger = screen.getByRole('button');

            expect(trigger).toHaveAttribute('aria-expanded', 'false');

            await user.click(trigger);
            expect(trigger).toHaveAttribute('aria-expanded', 'true');
        });
    });
});
