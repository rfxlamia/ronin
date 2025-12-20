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
        files: 3,
        searches: 0,
        devlogLines: 0,
        sources: ['git'],
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
        expect(screen.getByText('3')).toBeInTheDocument(); // files
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
                attribution={{ commits: 0, files: 0, sources: [] }} 
            />
        );

        expect(screen.getByText('Based on:')).toBeInTheDocument();
        expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('handles empty repository (0 commits, 0 files)', () => {
        render(
            <ContextPanel 
                state="complete" 
                text="Context." 
                attribution={{ commits: 0, files: 0, sources: ['git'] }} 
            />
        );

        expect(screen.getByText('Based on:')).toBeInTheDocument();
        expect(screen.getByText('Empty repository')).toBeInTheDocument();
    });

    it('shows expandable attribution bar with keyboard accessibility', async () => {
        render(
            <ContextPanel 
                state="complete" 
                text="Context." 
                attribution={mockAttribution} 
            />
        );

        // Find the collapsible trigger
        const trigger = screen.getByRole('button', { name: /based on/i });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        // Click to expand
        await userEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        // Should show detailed view
        expect(screen.getByText(/Git History/i)).toBeInTheDocument();
    });
});
