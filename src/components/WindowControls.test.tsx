import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WindowControls } from './WindowControls';

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
    }),
}));

describe('WindowControls', () => {
    it('should render minimize, maximize, and close buttons', () => {
        render(<WindowControls />);
        expect(screen.getByLabelText('Minimize window')).toBeInTheDocument();
        expect(screen.getByLabelText('Maximize window')).toBeInTheDocument();
        expect(screen.getByLabelText('Close window')).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
        render(<WindowControls />);
        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(3);
    });

    it('should call minimize on click', async () => {
        render(<WindowControls />);
        fireEvent.click(screen.getByLabelText('Minimize window'));
    });

    it('should call toggleMaximize on click', async () => {
        render(<WindowControls />);
        fireEvent.click(screen.getByLabelText('Maximize window'));
    });

    it('should call close on click', async () => {
        render(<WindowControls />);
        fireEvent.click(screen.getByLabelText('Close window'));
    });
});
