import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StreamingText } from './streaming-text';

describe('StreamingText', () => {
    it('displays full text instantly when not streaming', () => {
        render(
            <StreamingText
                text="Hello, World!"
                isStreaming={false}
            />
        );

        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    });

    it('shows cursor animation during streaming', () => {
        const { container } = render(
            <StreamingText
                text="Hello"
                isStreaming={true}
                speed={10}
            />
        );

        const cursor = container.querySelector('.animate-pulse');
        expect(cursor).toBeInTheDocument();
    });

    it('streams text character by character', async () => {
        const { container } = render(
            <StreamingText
                text="Hi"
                isStreaming={true}
                speed={10}
            />
        );

        // Wait for streaming to complete
        await waitFor(
            () => {
                expect(container.textContent).toBe('Hi');
            },
            { timeout: 500 }
        );
    });

    it('calls onComplete when streaming finishes', async () => {
        const onComplete = vi.fn();

        render(
            <StreamingText
                text="Done"
                isStreaming={true}
                speed={10}
                onComplete={onComplete}
            />
        );

        await waitFor(
            () => {
                expect(onComplete).toHaveBeenCalled();
            },
            { timeout: 500 }
        );
    });

    it('applies custom className', () => {
        const { container } = render(
            <StreamingText
                text="Test"
                isStreaming={false}
                className="custom-class"
            />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('resets when text changes', async () => {
        const { rerender, container } = render(
            <StreamingText text="First" isStreaming={false} />
        );

        expect(container.textContent).toBe('First');

        rerender(<StreamingText text="Second" isStreaming={false} />);

        await waitFor(() => {
            expect(container.textContent).toBe('Second');
        });
    });
});
