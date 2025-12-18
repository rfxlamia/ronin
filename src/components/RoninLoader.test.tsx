import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RoninLoader } from '../RoninLoader';

describe('RoninLoader', () => {
    beforeEach(() => {
        // Mock document.fonts.ready
        Object.defineProperty(document, 'fonts', {
            value: {
                ready: Promise.resolve(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('should render loader with meditation image and text', () => {
        const onComplete = vi.fn();
        render(\u003cRoninLoader onComplete = { onComplete } /\u003e);

        expect(screen.getByAlt('Ronin meditation')).toBeInTheDocument();
        expect(screen.getByText('Analyzing your activity...')).toBeInTheDocument();
    });

    it('should respect 1-second minimum duration', async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();

        render(\u003cRoninLoader onComplete = { onComplete } /\u003e);

        // Even if fonts load immediately, onComplete should not be called until 1s
        await vi.advanceTimersByTimeAsync(500);
        expect(onComplete).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(500);
        await waitFor(() => expect(onComplete).toHaveBeenCalled());
    });

    it('should wait for fonts to load', async () => {
        vi.useFakeTimers();
        let resolveFonts: () => void;
        const fontsPromise = new Promise\u003cvoid\u003e((resolve) => {
            resolveFonts = resolve;
        });

        Object.defineProperty(document, 'fonts', {
            value: {
                ready: fontsPromise,
            },
            writable: true,
        });

        const onComplete = vi.fn();
        render(\u003cRoninLoader onComplete = { onComplete } /\u003e);

        // Advance time past 1s, but fonts not ready yet
        await vi.advanceTimersByTimeAsync(1100);
        expect(onComplete).not.toHaveBeenCalled();

        // Now resolve fonts
        resolveFonts!();
        await waitFor(() => expect(onComplete).toHaveBeenCalled());
    });

    it('should use Libre Baskerville font for text', () => {
        const onComplete = vi.fn();
        render(\u003cRoninLoader onComplete = { onComplete } /\u003e);

        const text = screen.getByText('Analyzing your activity...');
        expect(text).toHaveClass('font-serif');
    });

    it('should have high z-index to overlay content', () => {
        const onComplete = vi.fn();
        const { container } = render(\u003cRoninLoader onComplete = { onComplete } /\u003e);

        const overlay = container.firstChild as HTMLElement;
        expect(overlay).toHaveClass('z-50');
    });
});
