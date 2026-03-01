import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectScanner } from './ProjectScanner';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

// Helper to get the scan button (there's both a title and a button with the same text)
const getScanButton = () => screen.getByRole('button', { name: /Scan for Projects/i });

describe('ProjectScanner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Initial State', () => {
        it('renders scan button and instruction text', () => {
            render(<ProjectScanner />);

            // Use getByRole for button specifically
            expect(getScanButton()).toBeInTheDocument();
            expect(screen.getByText('Automatically discover Git repositories on your system')).toBeInTheDocument();
            expect(screen.getByText(/Click "Scan for Projects"/)).toBeInTheDocument();
        });

        it('does not show scanning state initially', () => {
            render(<ProjectScanner />);

            expect(screen.queryByText('Scanning your system for Git repositories...')).not.toBeInTheDocument();
        });
    });

    describe('Scanning State', () => {
        it('shows RoninLoader during scanning', async () => {
            // Delay the mock resolve to keep scanning state
            mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 1000)));

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            expect(screen.getByText('Scanning your system for Git repositories...')).toBeInTheDocument();
            expect(screen.getByRole('status')).toBeInTheDocument();
        });

        it('disables scan button during scanning', async () => {
            mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 1000)));

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Scanning/i })).toBeDisabled();
            });
        });
    });

    describe('Scan Results', () => {
        const mockProjects = [
            { path: '/home/user/projects/project1', name: 'project1' },
            { path: '/home/user/projects/project2', name: 'project2' },
            { path: '/home/user/code/my-app', name: 'my-app' },
        ];

        it('displays scanned projects with checkboxes', async () => {
            mockInvoke.mockResolvedValue(mockProjects);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
                expect(screen.getByText('project2')).toBeInTheDocument();
                expect(screen.getByText('my-app')).toBeInTheDocument();
            });

            // All projects should be checked by default
            const checkboxes = screen.getAllByRole('checkbox');
            expect(checkboxes).toHaveLength(3);
        });

        it('shows project paths', async () => {
            mockInvoke.mockResolvedValue(mockProjects);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('/home/user/projects/project1')).toBeInTheDocument();
                expect(screen.getByText('/home/user/projects/project2')).toBeInTheDocument();
                expect(screen.getByText('/home/user/code/my-app')).toBeInTheDocument();
            });
        });

        it('selects all projects by default', async () => {
            mockInvoke.mockResolvedValue(mockProjects);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText(/Import Selected \(3\)/)).toBeInTheDocument();
            });
        });

        it('allows toggling project selection', async () => {
            mockInvoke.mockResolvedValue(mockProjects);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
            });

            // Deselect first project
            const firstCheckbox = screen.getAllByRole('checkbox')[0];
            fireEvent.click(firstCheckbox);

            expect(screen.getByText(/Import Selected \(2\)/)).toBeInTheDocument();
        });

        it('shows Cancel button after scanning', async () => {
            mockInvoke.mockResolvedValue(mockProjects);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
            });
        });

        it('resets state on Cancel', async () => {
            mockInvoke.mockResolvedValue(mockProjects);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

            expect(screen.queryByText('project1')).not.toBeInTheDocument();
            expect(screen.getByText(/Click "Scan for Projects"/)).toBeInTheDocument();
        });
    });

    describe('Empty Scan Results', () => {
        it('handles no projects found gracefully', async () => {
            mockInvoke.mockResolvedValue([]);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                // Should return to initial state since no projects were found
                expect(screen.getByText(/Click "Scan for Projects"/)).toBeInTheDocument();
            });
        });
    });

    describe('Import Functionality', () => {
        const mockProjects = [
            { path: '/home/user/projects/project1', name: 'project1' },
            { path: '/home/user/projects/project2', name: 'project2' },
        ];

        it('calls add_project for each selected project', async () => {
            mockInvoke
                .mockResolvedValueOnce(mockProjects) // scan_projects
                .mockResolvedValueOnce({ id: 1, path: '/home/user/projects/project1', name: 'project1', type: 'git', created_at: '', updated_at: '' })
                .mockResolvedValueOnce({ id: 2, path: '/home/user/projects/project2', name: 'project2', type: 'git', created_at: '', updated_at: '' });

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

            await waitFor(() => {
                expect(mockInvoke).toHaveBeenCalledWith('add_project', { path: '/home/user/projects/project1' });
                expect(mockInvoke).toHaveBeenCalledWith('add_project', { path: '/home/user/projects/project2' });
            });
        });

        it('calls onImportComplete callback after importing', async () => {
            const onImportComplete = vi.fn();
            mockInvoke
                .mockResolvedValueOnce(mockProjects) // scan_projects
                .mockResolvedValueOnce({ id: 1, path: '/home/user/projects/project1', name: 'project1', type: 'git', created_at: '', updated_at: '' })
                .mockResolvedValueOnce({ id: 2, path: '/home/user/projects/project2', name: 'project2', type: 'git', created_at: '', updated_at: '' });

            render(<ProjectScanner onImportComplete={onImportComplete} />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

            await waitFor(() => {
                expect(onImportComplete).toHaveBeenCalled();
                expect(onImportComplete).toHaveBeenCalledWith(expect.arrayContaining([
                    expect.objectContaining({ id: 1 }),
                    expect.objectContaining({ id: 2 }),
                ]));
            });
        });

        it('shows Import button with selection count after scanning', async () => {
            mockInvoke.mockResolvedValue([{ path: '/home/user/projects/project1', name: 'project1' }]);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
            });

            // Button shows with current selection count
            expect(screen.getByRole('button', { name: /Import Selected \(1\)/ })).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('shows error message on scan failure', async () => {
            mockInvoke.mockRejectedValue(new Error('Permission denied'));

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('Failed to scan for projects. Please try again.')).toBeInTheDocument();
            });
        });

        it('continues importing other projects if one fails', async () => {
            const mockProjects = [
                { path: '/home/user/projects/project1', name: 'project1' },
                { path: '/home/user/projects/project2', name: 'project2' },
            ];

            mockInvoke
                .mockResolvedValueOnce(mockProjects) // scan_projects
                .mockRejectedValueOnce(new Error('Project 1 failed')) // first add_project fails
                .mockResolvedValueOnce({ id: 2, path: '/home/user/projects/project2', name: 'project2', type: 'git', created_at: '', updated_at: '' });

            const onImportComplete = vi.fn();
            render(<ProjectScanner onImportComplete={onImportComplete} />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                expect(screen.getByText('project1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

            await waitFor(() => {
                expect(onImportComplete).toHaveBeenCalledWith([
                    expect.objectContaining({ id: 2 }),
                ]);
            });
        });

        it('shows error count when some imports fail but others succeed', async () => {
            const mockProjects = [
                { path: '/home/user/projects/p1', name: 'p1' },
                { path: '/home/user/projects/p2', name: 'p2' },
                { path: '/home/user/projects/p3', name: 'p3' },
            ];

            mockInvoke
                .mockResolvedValueOnce(mockProjects) // scan_projects
                .mockRejectedValueOnce(new Error('Disk error'))  // p1 fails
                .mockResolvedValueOnce({ id: 2, path: '/home/user/projects/p2', name: 'p2', type: 'git', created_at: '', updated_at: '' })
                .mockResolvedValueOnce({ id: 3, path: '/home/user/projects/p3', name: 'p3', type: 'git', created_at: '', updated_at: '' });

            render(<ProjectScanner />);
            fireEvent.click(getScanButton());
            await waitFor(() => { expect(screen.getByText('p1')).toBeInTheDocument(); });

            fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

            await waitFor(() => {
                expect(screen.getByText(/1 project\(s\) failed to import/)).toBeInTheDocument();
                expect(screen.getByText(/Disk error/)).toBeInTheDocument();
            });
        });

        it('keeps scanner open when ALL imports fail', async () => {
            const mockProjects = [{ path: '/home/user/projects/p1', name: 'p1' }];

            mockInvoke
                .mockResolvedValueOnce(mockProjects)
                .mockRejectedValueOnce(new Error('Disk error'));

            render(<ProjectScanner />);
            fireEvent.click(getScanButton());
            await waitFor(() => { expect(screen.getByText('p1')).toBeInTheDocument(); });

            fireEvent.click(screen.getByRole('button', { name: /Import Selected/ }));

            await waitFor(() => {
                // Scanner list masih terlihat (tidak direset)
                expect(screen.getByText('p1')).toBeInTheDocument();
                expect(screen.getByText(/failed to import/)).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels on checkboxes', async () => {
            mockInvoke.mockResolvedValue([{ path: '/home/user/project', name: 'project' }]);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).toHaveAttribute('id', 'project-/home/user/project');
            });
        });

        it('associates labels with checkboxes', async () => {
            mockInvoke.mockResolvedValue([{ path: '/home/user/project', name: 'project' }]);

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            await waitFor(() => {
                const label = screen.getByText('project');
                expect(label).toHaveAttribute('for', 'project-/home/user/project');
            });
        });

        it('RoninLoader has status role for screen readers', async () => {
            mockInvoke.mockImplementation(() => new Promise(() => { })); // Never resolves

            render(<ProjectScanner />);

            fireEvent.click(getScanButton());

            expect(screen.getByRole('status')).toBeInTheDocument();
        });
    });
});
