import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextPanel } from './ContextPanel';

describe('ContextPanel', () => {
    it('does not render when closed', () => {
        const { container } = render(
            <ContextPanel isOpen={false} onClose={vi.fn()}>
                <p>Content</p>
            </ContextPanel>
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders when open', () => {
        render(
            <ContextPanel isOpen={true} onClose={vi.fn()}>
                <p>Content</p>
            </ContextPanel>
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('displays custom title', () => {
        render(
            <ContextPanel isOpen={true} onClose={vi.fn()} title="Custom Title">
                <p>Content</p>
            </ContextPanel>
        );

        expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('displays default title when not provided', () => {
        render(
            <ContextPanel isOpen={true} onClose={vi.fn()}>
                <p>Content</p>
            </ContextPanel>
        );

        expect(screen.getByText('Context')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(
            <ContextPanel isOpen={true} onClose={onClose}>
                <p>Content</p>
            </ContextPanel>
        );

        const closeButton = screen.getByLabelText('Close panel');
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        const { container } = render(
            <ContextPanel isOpen={true} onClose={onClose}>
                <p>Content</p>
            </ContextPanel>
        );

        const backdrop = container.querySelector('.bg-black\\/50');
        expect(backdrop).toBeInTheDocument();

        if (backdrop) {
            await user.click(backdrop);
            expect(onClose).toHaveBeenCalled();
        }
    });

    it('renders children content', () => {
        render(
            <ContextPanel isOpen={true} onClose={vi.fn()}>
                <div data-testid="custom-content">
                    <h3>Title</h3>
                    <p>Paragraph</p>
                </div>
            </ContextPanel>
        );

        expect(screen.getByTestId('custom-content')).toBeInTheDocument();
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Paragraph')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <ContextPanel
                isOpen={true}
                onClose={vi.fn()}
                className="custom-panel"
            >
                <p>Content</p>
            </ContextPanel>
        );

        const panel = container.querySelector('.custom-panel');
        expect(panel).toBeInTheDocument();
    });
});
