import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RoninLoader } from './RoninLoader';

describe('RoninLoader', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'fonts', {
            value: { ready: Promise.resolve() },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render loader with meditation image and text', async () => {
        const onComplete = vi.fn();
        render(<RoninLoader onComplete={onComplete} />);
        
        expect(screen.getByRole('img', { name: 'Ronin meditation' })).toBeInTheDocument();
        expect(screen.getByText('Analyzing your activity...')).toBeInTheDocument();
        
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1100);
        });
    });

    it('should use Libre Baskerville font for text', async () => {
        const onComplete = vi.fn();
        render(<RoninLoader onComplete={onComplete} />);
        
        const text = screen.getByText('Analyzing your activity...');
        expect(text).toHaveClass('font-serif');
        
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1100);
        });
    });

    it('should have high z-index to overlay content', async () => {
        const onComplete = vi.fn();
        const { container } = render(<RoninLoader onComplete={onComplete} />);
        
        const overlay = container.firstChild as HTMLElement;
        expect(overlay).toHaveClass('z-50');
        
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1100);
        });
    });
});
