import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictDialog } from './ConflictDialog';

describe('ConflictDialog', () => {
    const mockOnReload = vi.fn();
    const mockOnKeepMine = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render when open', () => {
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        expect(screen.getByText('DEVLOG Changed Externally')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(
            <ConflictDialog
                isOpen={false}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        expect(screen.queryByText('DEVLOG Changed Externally')).not.toBeInTheDocument();
    });

    it('should display conflict description', () => {
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        expect(screen.getByText(/DEVLOG.md was modified outside Ronin/)).toBeInTheDocument();
    });

    it('should call onReload when Reload button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        const reloadButton = screen.getByRole('button', { name: /Reload/i });
        await user.click(reloadButton);

        expect(mockOnReload).toHaveBeenCalledTimes(1);
    });

    it('should call onKeepMine when Keep Mine button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        const keepMineButton = screen.getByRole('button', { name: /Keep your changes/i });
        await user.click(keepMineButton);

        expect(mockOnKeepMine).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should have disabled Merge button with coming soon text', () => {
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        const mergeButton = screen.getByRole('button', { name: /Merge/i });
        expect(mergeButton).toBeDisabled();
        expect(screen.getByText(/Coming in v0.3/)).toBeInTheDocument();
    });

    it('should display warning icon', () => {
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        // AlertTriangle icon adds the warning visual
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
    });

    it('should display descriptions for each option', () => {
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        expect(screen.getByText(/Discard your changes and load the external version/)).toBeInTheDocument();
        expect(screen.getByText(/Overwrite the external changes with your current edits/)).toBeInTheDocument();
        expect(screen.getByText(/View both versions side-by-side/)).toBeInTheDocument();
    });

    it('should call onReload when R key is pressed', async () => {
        const user = userEvent.setup();
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        await user.keyboard('r');
        expect(mockOnReload).toHaveBeenCalledTimes(1);
    });

    it('should call onKeepMine when K key is pressed', async () => {
        const user = userEvent.setup();
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={null}
            />
        );

        await user.keyboard('k');
        expect(mockOnKeepMine).toHaveBeenCalledTimes(1);
    });

    it('should display line counts when externalFileInfo is provided', () => {
        render(
            <ConflictDialog
                isOpen={true}
                onReload={mockOnReload}
                onKeepMine={mockOnKeepMine}
                onCancel={mockOnCancel}
                externalFileInfo={{ lineCount: 50, userLineCount: 25 }}
            />
        );

        expect(screen.getByText(/External file has 50 lines.*yours has 25 lines/)).toBeInTheDocument();
    });
});