import { ContextPanelProps, AttributionData } from '@/types/context';
import { RoninLoader } from './RoninLoader';
import { Button } from '@/components/ui/button';
import { GitBranch, Search, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function Attribution({ data }: { data?: AttributionData }) {
    if (!data || !data.sources.length || (
        (data.commits || 0) === 0 && 
        (data.searches || 0) === 0 && 
        (data.devlogLines || 0) === 0
    )) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-2 border-t border-border">
                <span className="font-medium">Based on:</span>
                <span>Git history only</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-4 pt-2 border-t border-border">
            <span className="font-medium">Based on:</span>
            
            <div className="flex items-center gap-3">
                {data.sources.includes('git') && (
                    <div className="flex items-center gap-1" title="Git Commits">
                        <GitBranch className="w-3 h-3" />
                        <span>{data.commits || 0}</span>
                    </div>
                )}
                
                {data.sources.includes('behavior') && (
                    <div className="flex items-center gap-1" title="Behavioral Patterns">
                        <Search className="w-3 h-3" />
                        <span>{data.searches || 0}</span>
                    </div>
                )}
                
                {data.sources.includes('devlog') && (
                    <div className="flex items-center gap-1" title="DEVLOG Entries">
                        <FileText className="w-3 h-3" />
                        <span>{data.devlogLines || 0}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ContextPanel({ state, text, attribution, error, onRetry, className }: ContextPanelProps) {
    if (state === 'idle') return null;

    return (
        <div className={cn("p-4 bg-card", className)}>
            {state === 'streaming' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <RoninLoader variant="inline" />
                        <span className="text-sm animate-pulse">Analyzing your activity...</span>
                    </div>
                    {text && (
                        <div className="text-sm font-mono text-foreground whitespace-pre-wrap animate-fade-in">
                            {text}
                        </div>
                    )}
                </div>
            )}

            {state === 'complete' && (
                <div className="animate-fade-in">
                    <div className="text-sm font-mono text-foreground whitespace-pre-wrap">
                        {text}
                    </div>
                    <Attribution data={attribution} />
                </div>
            )}

            {state === 'error' && (
                <div className="flex flex-col items-center gap-3 py-2 text-center animate-fade-in">
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