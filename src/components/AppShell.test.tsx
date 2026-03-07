import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
    }),
}));

const renderWithRouter = (children: React.ReactNode) => {
    return render(<BrowserRouter>{children}</BrowserRouter>);
};

describe('AppShell', () => {
    it('should render Ronin logo in Libre Baskerville', () => {
        renderWithRouter(<AppShell><div>Test Content</div></AppShell>);
        const logo = screen.getByText('Ronin');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveClass('font-serif');
    });

    it('should have data-tauri-drag-region on header', () => {
        const { container } = renderWithRouter(<AppShell><div>Test Content</div></AppShell>);
        const header = container.querySelector('[data-tauri-drag-region]');
        expect(header).toBeInTheDocument();
        expect(header?.tagName).toBe('HEADER');
    });

    it('should render theme toggle', () => {
        renderWithRouter(<AppShell><div>Test Content</div></AppShell>);
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render children content', () => {
        renderWithRouter(<AppShell><div data-testid="test-content">Test Content</div></AppShell>);
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
        const { container } = renderWithRouter(<AppShell><div>Test Content</div></AppShell>);
        expect(container.querySelector('header')).toBeInTheDocument();
        expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('should have Settings navigation link', () => {
        renderWithRouter(<AppShell><div>Test Content</div></AppShell>);
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });
});
