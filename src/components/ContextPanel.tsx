import { useState } from 'react';
import { ContextPanelProps, AttributionData } from '@/types/context';
import { RoninLoader } from './RoninLoader';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { GitCommitHorizontal, FileText, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

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

export function ContextPanel({ state, text, attribution, error, onRetry, className }: ContextPanelProps) {
    if (state === 'idle') return null;

    return (
        <div className={cn("p-4 bg-card max-h-[400px] overflow-auto", className)}>
            {state === 'streaming' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <RoninLoader variant="inline" />
                        <span className="text-sm animate-pulse">Analyzing your activity...</span>
                    </div>
                    {text && (
                        <div
                            className="text-sm prose prose-sm dark:prose-invert max-w-none"
                            aria-live="polite"
                            aria-atomic="false"
                        >
                            <ReactMarkdown>{text}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}

            {state === 'complete' && (
                <div>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                    <Attribution data={attribution} />
                </div>
            )}

            {state === 'error' && (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-sm text-foreground">
                        {error || "Something went wrong."}
                    </div>
                    {onRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            className="font-serif gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}