import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextPanel } from './ContextPanel';
import type { AttributionData, ParsedError } from '@/types/context';

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

    const mockAttributionWithDevlog: AttributionData = {
        commits: 15,
        files: 3,
        devlogLines: 250,
        sources: ['git', 'devlog'],
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

    // DEVLOG Attribution Tests (Story 3.7)
    describe('DEVLOG Attribution (Story 3.7)', () => {
        it('shows DEVLOG icon when sources includes devlog', () => {
            render(
                <ContextPanel
                    state="complete"
                    text="Context with DEVLOG."
                    attribution={mockAttributionWithDevlog}
                />
            );

            // Should show DEVLOG icon in collapsed view (check via tooltip)
            expect(screen.getByTitle('Based on recent DEVLOG (last ~500 lines)')).toBeInTheDocument();
        });

        it('shows DEVLOG lines count in expanded attribution', async () => {
            render(
                <ContextPanel
                    state="complete"
                    text="Context with DEVLOG."
                    attribution={mockAttributionWithDevlog}
                />
            );

            // Expand attribution
            const trigger = screen.getByRole('button', { name: /based on/i });
            await userEvent.click(trigger);

            // Should show DEVLOG with line count
            expect(screen.getByText(/DEVLOG \(250 lines\)/i)).toBeInTheDocument();
        });

        it('has tooltip for DEVLOG icon', () => {
            render(
                <ContextPanel
                    state="complete"
                    text="Context with DEVLOG."
                    attribution={mockAttributionWithDevlog}
                />
            );

            // Check for title attribute on DEVLOG icon container
            const devlogContainer = screen.getByTitle('Based on recent DEVLOG (last ~500 lines)');
            expect(devlogContainer).toBeInTheDocument();
        });

        it('does not show DEVLOG icon when sources does not include devlog', () => {
            render(
                <ContextPanel
                    state="complete"
                    text="Context without DEVLOG."
                    attribution={mockAttribution}
                />
            );

            // Should not show DEVLOG icon (no tooltip for DEVLOG)
            expect(screen.queryByTitle('Based on recent DEVLOG (last ~500 lines)')).not.toBeInTheDocument();
        });

        it('handles attribution with devlog but no devlogLines gracefully', async () => {
            const attrWithDevlogNoLines: AttributionData = {
                commits: 10,
                files: 2,
                sources: ['git', 'devlog'],
                // devlogLines is undefined
            };

            render(
                <ContextPanel
                    state="complete"
                    text="Context."
                    attribution={attrWithDevlogNoLines}
                />
            );

            // Should still show DEVLOG icon in collapsed view (via tooltip)
            expect(screen.getByTitle('Based on recent DEVLOG (last ~500 lines)')).toBeInTheDocument();

            // Expand attribution
            const trigger = screen.getByRole('button', { name: /based on/i });
            await userEvent.click(trigger);

            // Should NOT show DEVLOG line count in expanded view (since devlogLines is undefined)
            expect(screen.queryByText(/DEVLOG \(/i)).not.toBeInTheDocument();
        });
    });

    // Error state tests for Story 3.6
    describe('Error States (Story 3.6)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('renders offline error with meditation placeholder', () => {
            const parsedError: ParsedError = {
                kind: 'offline',
                message: 'No network connection',
            };

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="OFFLINE:No network connection"
                    parsedError={parsedError}
                />
            );

            expect(screen.getByText(/Offline mode. Local tools ready./i)).toBeInTheDocument();
            // Should have the offline class for styling
            const errorContainer = screen.getByText(/Offline mode/i).closest('div');
            expect(errorContainer?.parentElement).toHaveClass('ronin-error-offline');
        });

        it('renders rate limit error with countdown timer', async () => {
            const parsedError: ParsedError = {
                kind: 'ratelimit',
                message: 'AI resting',
                retryAfter: 30,
            };

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="RATELIMIT:30:AI resting"
                    parsedError={parsedError}
                />
            );

            // Should show countdown starting at 30
            expect(screen.getByText(/AI resting. Try again in 30 seconds./i)).toBeInTheDocument();

            // Advance time by 10 seconds
            await act(async () => {
                vi.advanceTimersByTime(10000);
            });

            // Should now show 20 seconds
            expect(screen.getByText(/AI resting. Try again in 20 seconds./i)).toBeInTheDocument();
        });

        it('disables retry button during rate limit countdown', () => {
            const parsedError: ParsedError = {
                kind: 'ratelimit',
                message: 'AI resting',
                retryAfter: 30,
            };
            const onRetry = vi.fn();

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="RATELIMIT:30:AI resting"
                    parsedError={parsedError}
                    onRetry={onRetry}
                />
            );

            const retryBtn = screen.getByRole('button', { name: /retry/i });
            expect(retryBtn).toBeDisabled();
        });

        it('enables retry button after countdown completes', async () => {
            const parsedError: ParsedError = {
                kind: 'ratelimit',
                message: 'AI resting',
                retryAfter: 2,
            };
            const onRetry = vi.fn();

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="RATELIMIT:2:AI resting"
                    parsedError={parsedError}
                    onRetry={onRetry}
                />
            );

            // Initially disabled
            expect(screen.getByRole('button', { name: /retry/i })).toBeDisabled();

            // Advance past countdown
            await act(async () => {
                vi.advanceTimersByTime(3000);
            });

            // Should now be enabled
            expect(screen.getByRole('button', { name: /retry/i })).not.toBeDisabled();
        });

        it('renders API error with sharpening blade placeholder', () => {
            const parsedError: ParsedError = {
                kind: 'api',
                message: 'Server error',
            };

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="APIERROR:500:Server error"
                    parsedError={parsedError}
                />
            );

            expect(screen.getByText(/AI reconnecting.../i)).toBeInTheDocument();
            expect(screen.getByText(/Your dashboard is ready./i)).toBeInTheDocument();
        });

        it('shows cached content during offline error', () => {
            const parsedError: ParsedError = {
                kind: 'offline',
                message: 'No network connection',
            };
            const cachedAttribution: AttributionData = {
                commits: 10,
                files: 2,
                sources: ['git'],
            };

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="OFFLINE:No network connection"
                    parsedError={parsedError}
                    cachedText="This is cached context from last session."
                    cachedAttribution={cachedAttribution}
                />
            );

            // Should show offline error
            expect(screen.getByText(/Offline mode. Local tools ready./i)).toBeInTheDocument();
            // Should show cached content
            expect(screen.getByText(/This is cached context from last session./i)).toBeInTheDocument();
            // Should show cached indicator
            expect(screen.getByText(/Offline \/ Cached/i)).toBeInTheDocument();
        });

        it('has aria-live for countdown announcements', () => {
            const parsedError: ParsedError = {
                kind: 'ratelimit',
                message: 'AI resting',
                retryAfter: 30,
            };

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="RATELIMIT:30:AI resting"
                    parsedError={parsedError}
                />
            );

            // Check for aria-live attribute
            const liveRegion = screen.getByText(/AI resting. Try again in/).closest('[aria-live]');
            expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        });

        it('retry button click calls onRetry for API errors', async () => {
            vi.useRealTimers(); // Use real timers for userEvent click
            const parsedError: ParsedError = {
                kind: 'api',
                message: 'Server error',
            };
            const onRetry = vi.fn();

            render(
                <ContextPanel
                    state="error"
                    text=""
                    error="APIERROR:500:Server error"
                    parsedError={parsedError}
                    onRetry={onRetry}
                />
            );

            const retryBtn = screen.getByRole('button', { name: /retry/i });
            await userEvent.click(retryBtn);
            expect(onRetry).toHaveBeenCalledTimes(1);
        });
    });
});
