import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GitControls } from './GitControls';
import type { Project } from '@/types/project';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

const mockProject: Project = {
    id: 1,
    name: 'test-project',
    path: '/home/user/test-project',
    type: 'git',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

const mockStatus = {
    branch: 'main',
    uncommittedFiles: 3,
    unpushedCommits: 0,
    lastCommitTimestamp: 1700000000,
    hasRemote: true,
    isDetached: false,
    hasConflicts: false,
    isEmpty: false,
};

describe('GitControls — sparkle button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sparkle button tidak muncul di mode idle', () => {
        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );
        expect(screen.queryByTitle('Generate commit message with AI')).toBeNull();
    });

    it('sparkle button muncul saat mode editing', async () => {
        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));
        expect(screen.getByTitle('Generate commit message with AI')).toBeInTheDocument();
    });

    it('generate sukses mengisi textarea dengan hasil AI', async () => {
        vi.mocked(invoke).mockResolvedValueOnce('feat: add user authentication');

        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));
        fireEvent.click(screen.getByTitle('Generate commit message with AI'));

        await waitFor(() => {
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            expect(textarea.value).toBe('feat: add user authentication');
        });
    });

    it('generate error menampilkan toast error dan tidak clear message', async () => {
        vi.mocked(invoke).mockRejectedValueOnce('No changes detected');

        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));

        // Tulis manual dulu
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'my manual message' } });

        fireEvent.click(screen.getByTitle('Generate commit message with AI'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });

        // Message manual tidak hilang
        expect((textarea as HTMLTextAreaElement).value).toBe('my manual message');
    });

    it('tombol sparkle dan Commit disabled saat generating', async () => {
        // invoke tidak resolve — biarkan pending
        vi.mocked(invoke).mockReturnValueOnce(new Promise(() => {}));

        render(
            <GitControls
                project={mockProject}
                onSuccess={vi.fn()}
                status={mockStatus}
            />
        );

        fireEvent.click(screen.getByText('Commit Changes'));

        await act(async () => {
            fireEvent.click(screen.getByTitle('Generate commit message with AI'));
        });

        // Saat generating — sparkle dan commit harus disabled
        expect(screen.getByTitle('Generate commit message with AI')).toBeDisabled();
        expect(screen.getByText('Commit')).toBeDisabled();
    });
});
