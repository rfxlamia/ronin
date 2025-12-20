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
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should render fullscreen variant by default', async () => {
        const onComplete = vi.fn();
        const { container } = render(<RoninLoader onComplete={onComplete} />);
        
        const overlay = container.firstChild as HTMLElement;
        expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-background');
        
        const img = screen.getByRole('img', { name: 'Ronin meditation' });
        expect(img).toHaveClass('w-48', 'h-48');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1100);
        });
    });

    it('should render inline variant correctly', async () => {
        const onComplete = vi.fn();
        await act(async () => {
            render(<RoninLoader onComplete={onComplete} variant="inline" />);
        });
        
        const img = screen.getByRole('img', { name: 'Ronin meditation' });
        expect(img).toHaveClass('w-6', 'h-6');
        
        const wrapper = img.closest('div')?.parentElement;
        expect(wrapper).toHaveClass('inline-block');
        expect(wrapper).not.toHaveClass('fixed', 'inset-0', 'bg-background');
    });

    it('should respect prefers-reduced-motion', async () => {
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const onComplete = vi.fn();
        await act(async () => {
             render(<RoninLoader onComplete={onComplete} />);
        });
        
        const img = screen.getByRole('img', { name: 'Ronin meditation' });
        expect(img).not.toHaveClass('animate-ronin-pulse');
        expect(img).toHaveClass('opacity-70');
    });
});
