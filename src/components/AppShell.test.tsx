import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../AppShell';

describe('AppShell', () => {
    it('should render Ronin logo in Libre Baskerville', () => {
        render(\u003cAppShell\u003e\u003cdiv\u003eTest Content\u003c / div\u003e\u003c / AppShell\u003e);

        const logo = screen.getByText('Ronin');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveClass('font-serif');
    });

    it('should have data-tauri-drag-region on header', () => {
        const { container } = render(
        \u003cAppShell\u003e\u003cdiv\u003eTest Content\u003c / div\u003e\u003c / AppShell\u003e
    );

    const header = container.querySelector('[data-tauri-drag-region]');
    expect(header).toBeInTheDocument();
    expect(header?.tagName).toBe('HEADER');
});

it('should render theme toggle', () => {
    render(\u003cAppShell\u003e\u003cdiv\u003eTest Content\u003c / div\u003e\u003c / AppShell\u003e);

    // Theme toggle button should be present
    const themeButton = screen.getByRole('button');
    expect(themeButton).toBeInTheDocument();
});

it('should render children content', () => {
    render(
        \u003cAppShell\u003e
        \u003cdiv data - testid=\"test-content\"\u003eTest Content\u003c/div\u003e
        \u003c / AppShell\u003e
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
});

it('should use semantic HTML structure', () => {
    const { container } = render(
    \u003cAppShell\u003e\u003cdiv\u003eTest Content\u003c / div\u003e\u003c / AppShell\u003e
    );

expect(container.querySelector('header')).toBeInTheDocument();
expect(container.querySelector('main')).toBeInTheDocument();
  });
});
