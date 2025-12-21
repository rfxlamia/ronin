import { useState, useMemo, useEffect } from 'react';
import type { ContextPanelProps, AttributionData, ParsedError, ErrorKind } from '@/types/context';
import { RoninLoader } from './RoninLoader';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { GitCommitHorizontal, FileText, ChevronDown, AlertTriangle, RefreshCw, WifiOff, ServerCrash, Hourglass, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useCountdown } from '@/hooks/useCountdown';

function Attribution({ data }: { data?: AttributionData }) {
    const [isOpen, setIsOpen] = useState(false);

    // Handle empty repository or missing attribution
    if (!data || !data.sources.length) {
        return (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-4 pt-2 border-t border-border">
                <span className="font-semibold">Based on:</span>
                <span>No data available</span>
            </div>
        );
    }

    // Handle empty repository (0 commits)
    if (data.commits === 0 && data.files === 0) {
        return (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-4 pt-2 border-t border-border">
                <span className="font-semibold">Based on:</span>
                <span>Empty repository</span>
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4 pt-2 border-t border-border">
            <CollapsibleTrigger
                className="flex items-center justify-between w-full text-xs font-mono text-muted-foreground hover:bg-muted/50 rounded px-1 py-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ronin-brass focus:ring-offset-1"
                aria-expanded={isOpen}
                aria-controls="attribution-details"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Based on:</span>
                    <div className="flex items-center gap-3">
                        {data.sources.includes('git') && data.commits > 0 && (
                            <div className="flex items-center gap-1" title="Git Commits Analyzed">
                                <GitCommitHorizontal className="w-3 h-3" />
                                <span>{data.commits}</span>
                            </div>
                        )}
                        {data.files > 0 && (
                            <div className="flex items-center gap-1" title="Uncommitted Files">
                                <FileText className="w-3 h-3" />
                                <span>{data.files}</span>
                            </div>
                        )}
                    </div>
                </div>
                <ChevronDown
                    className={cn(
                        "w-3 h-3 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </CollapsibleTrigger>
            <CollapsibleContent id="attribution-details" className="text-xs font-mono text-muted-foreground">
                <div className="pt-2 pl-1 space-y-1">
                    {data.sources.includes('git') && (
                        <div className="flex items-center gap-2">
                            <GitCommitHorizontal className="w-3 h-3" />
                            <span>Git History (Last {data.commits} commits)</span>
                        </div>
                    )}
                    {data.files > 0 && (
                        <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span>{data.files} uncommitted file{data.files !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                    {data.sources.includes('devlog') && data.devlogLines && data.devlogLines > 0 && (
                        <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span>DEVLOG ({data.devlogLines} lines)</span>
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

interface ErrorDisplayProps {
    parsedError: ParsedError;
    onRetry?: () => void;
    cachedText?: string;
    cachedAttribution?: AttributionData;
}

function ErrorDisplay({ parsedError, onRetry, cachedText, cachedAttribution }: ErrorDisplayProps) {
    const initialSeconds = parsedError.kind === 'ratelimit' ? (parsedError.retryAfter || 30) : 0;
    const countdown = useCountdown(initialSeconds);
    const [lastAnnounced, setLastAnnounced] = useState<number>(initialSeconds);

    // Track if we should announce (at 10-second intervals for screen readers)
    useEffect(() => {
        if (!countdown.isActive || countdown.secondsRemaining <= 0) return;

        const currentBucket = Math.floor(countdown.secondsRemaining / 10);
        const lastBucket = Math.floor(lastAnnounced / 10);

        if (currentBucket !== lastBucket) {
            setLastAnnounced(countdown.secondsRemaining);
        }
    }, [countdown.isActive, countdown.secondsRemaining, lastAnnounced]);

    const getErrorIcon = (kind: ErrorKind) => {
        switch (kind) {
            case 'offline':
                return <WifiOff className="w-6 h-6" />;
            case 'ratelimit':
                return <Hourglass className="w-6 h-6" />;
            case 'api':
                return <ServerCrash className="w-6 h-6" />;
            default:
                return <AlertTriangle className="w-6 h-6" />;
        }
    };

    const getErrorClass = (kind: ErrorKind) => {
        switch (kind) {
            case 'offline':
                return 'ronin-error-offline';
            case 'ratelimit':
                return 'ronin-error-ratelimit';
            case 'api':
                return 'ronin-error-api';
            default:
                return '';
        }
    };

    const getErrorMessage = () => {
        switch (parsedError.kind) {
            case 'offline':
                return 'Offline mode. Local tools ready.';
            case 'ratelimit':
                return countdown.isActive && countdown.secondsRemaining > 0
                    ? `AI resting. Try again in ${countdown.secondsRemaining} seconds.`
                    : 'AI resting. Ready to retry.';
            case 'api':
                return (
                    <>
                        AI reconnecting...
                        <br />
                        Your dashboard is ready.
                    </>
                );
            default:
                return parsedError.message || 'Something went wrong.';
        }
    };

    const isRetryDisabled = parsedError.kind === 'ratelimit' && countdown.isActive;

    return (
        <div className="flex flex-col gap-4">
            {/* Error State Display */}
            <div className={cn(
                "flex flex-col items-center gap-3 py-4 text-center border-2 border-dashed rounded-lg",
                getErrorClass(parsedError.kind),
                parsedError.kind === 'offline' && "border-muted-foreground/30 bg-muted/20",
                parsedError.kind === 'ratelimit' && "border-ronin-brass/50 bg-ronin-brass/5",
                parsedError.kind === 'api' && "border-amber-500/50 bg-amber-500/5",
                !['offline', 'ratelimit', 'api'].includes(parsedError.kind) && "border-destructive/30 bg-destructive/5"
            )}>
                <div className={cn(
                    "p-3 rounded-full",
                    parsedError.kind === 'offline' && "bg-muted text-muted-foreground",
                    parsedError.kind === 'ratelimit' && "bg-ronin-brass/10 text-ronin-brass",
                    parsedError.kind === 'api' && "bg-amber-500/10 text-amber-600",
                    !['offline', 'ratelimit', 'api'].includes(parsedError.kind) && "bg-destructive/10 text-destructive"
                )}>
                    {getErrorIcon(parsedError.kind)}
                </div>

                <div
                    className="text-sm text-foreground font-mono"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {getErrorMessage()}
                </div>

                {onRetry && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        disabled={isRetryDisabled}
                        className="font-sans gap-2"
                        aria-label={isRetryDisabled ? `Retry disabled, wait ${countdown.secondsRemaining} seconds` : 'Retry'}
                    >
                        <RefreshCw className={cn("w-3 h-3", isRetryDisabled && "opacity-50")} />
                        Retry
                    </Button>
                )}
            </div>

            {/* Show cached content if available */}
            {cachedText && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <CloudOff className="w-3 h-3" />
                        <span className="px-1.5 py-0.5 rounded bg-muted">Offline / Cached</span>
                    </div>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none opacity-80">
                        <ReactMarkdown>{cachedText}</ReactMarkdown>
                    </div>
                    {cachedAttribution && <Attribution data={cachedAttribution} />}
                </div>
            )}
        </div>
    );
}

export function ContextPanel({ state, text, attribution, error, parsedError, onRetry, cachedText, cachedAttribution, className }: ContextPanelProps) {
    if (state === 'idle') return null;

    // Show error state with enhanced UI
    if (state === 'error') {
        // Use parsed error if available, otherwise create a basic one
        const errorInfo: ParsedError = parsedError || {
            kind: 'unknown',
            message: error || 'Something went wrong',
        };

        return (
            <div className={cn("p-4 bg-card max-h-[400px] overflow-auto", className)}>
                <ErrorDisplay
                    parsedError={errorInfo}
                    onRetry={onRetry}
                    cachedText={cachedText}
                    cachedAttribution={cachedAttribution}
                />
            </div>
        );
    }

    // Streaming and complete states share the same DOM structure to prevent remounting
    // Memoize markdown rendering to prevent re-parsing on state changes
    const markdownContent = useMemo(() => {
        if (!text) return null;
        return <ReactMarkdown>{text}</ReactMarkdown>;
    }, [text]);

    return (
        <div className={cn("p-4 bg-card max-h-[400px] overflow-auto will-change-scroll", className)}>
            {/* Loader - only visible during streaming */}
            {state === 'streaming' && (
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <RoninLoader variant="inline" />
                    <span className="text-sm animate-pulse">Analyzing your activity...</span>
                </div>
            )}

            {/* Content - stable container, no remount on state change */}
            {text && (
                <div
                    className="text-sm prose prose-sm dark:prose-invert max-w-none"
                    aria-live="polite"
                    aria-atomic="false"
                >
                    {markdownContent}
                </div>
            )}

            {/* Attribution - only visible when complete */}
            {state === 'complete' && <Attribution data={attribution} />}
        </div>
    );
}