import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextPanel } from './ContextPanel';
import { AttributionData } from '@/types/context';

// Mock RoninLoader to avoid animation issues in tests
vi.mock('./RoninLoader', () => ({
    RoninLoader: ({ variant }: { variant: string }) => (
        <div data-testid="ronin-loader" data-variant={variant}>
            RoninLoader
        </div>
    ),
}));

describe('ContextPanel', () => {
    const mockAttribution: AttributionData = {
        commits: 15,
        searches: 3,
        devlogLines: 0,
        sources: ['git', 'behavior'],
    };

    it('renders nothing in idle state', () => {
        const { container } = render(<ContextPanel state="idle" text="" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders loader and text in streaming state', () => {
        render(<ContextPanel state="streaming" text="Analyzing..." />);
        
        expect(screen.getByTestId('ronin-loader')).toBeInTheDocument();
        expect(screen.getByTestId('ronin-loader')).toHaveAttribute('data-variant', 'inline');
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
        expect(screen.getByText(/analyzing your activity/i)).toBeInTheDocument(); // Pulse text
    });

    it('renders text and attribution in complete state', () => {
        render(
            <ContextPanel 
                state="complete" 
                text="Final context." 
                attribution={mockAttribution} 
            />
        );

        expect(screen.queryByTestId('ronin-loader')).not.toBeInTheDocument();
        expect(screen.getByText('Final context.')).toBeInTheDocument();
        
        // Attribution check
        expect(screen.getByText(/Based on:/)).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument(); // commits
        expect(screen.getByText('3')).toBeInTheDocument(); // searches
    });

    it('renders error message and retry button in error state', async () => {
        const onRetry = vi.fn();
        render(
            <ContextPanel 
                state="error" 
                text="" 
                error="Network failure" 
                onRetry={onRetry} 
            />
        );

        expect(screen.getByText('Network failure')).toBeInTheDocument();
        const retryBtn = screen.getByRole('button', { name: /retry/i });
        expect(retryBtn).toBeInTheDocument();

        await userEvent.click(retryBtn);
        expect(onRetry).toHaveBeenCalled();
    });

    it('handles empty attribution data gracefully', () => {
        render(
            <ContextPanel 
                state="complete" 
                text="Context." 
                attribution={{ sources: [] }} 
            />
        );

        expect(screen.getByText('Based on:')).toBeInTheDocument();
        expect(screen.getByText('Git history only')).toBeInTheDocument();
    });
});
