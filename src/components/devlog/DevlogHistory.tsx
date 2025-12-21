import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { format } from 'date-fns';
import { useDevlogStore, DevlogCommit } from '@/stores/devlogStore';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, History } from 'lucide-react';

interface DevlogHistoryProps {
    className?: string;
}

export function DevlogHistory({ className }: DevlogHistoryProps) {
    const activeProjectPath = useDevlogStore((state) => state.activeProjectPath);
    const setViewMode = useDevlogStore((state) => state.setViewMode);
    const selectVersion = useDevlogStore((state) => state.selectVersion);
    const setSelectedVersionContent = useDevlogStore((state) => state.setSelectedVersionContent);
    const versionCache = useDevlogStore((state) => state.versionCache);
    const cacheVersion = useDevlogStore((state) => state.cacheVersion);

    const [commits, setCommits] = useState<DevlogCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            if (!activeProjectPath) return;

            setLoading(true);
            setError(null);

            try {
                const history = await invoke<DevlogCommit[]>('get_devlog_history', {
                    projectPath: activeProjectPath,
                });
                setCommits(history);
            } catch (err) {
                console.error('Failed to fetch devlog history:', err);
                setError(typeof err === 'string' ? err : 'Failed to load history');
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [activeProjectPath]);

    const handleVersionClick = async (commit: DevlogCommit) => {
        if (!activeProjectPath) return;

        try {
            setLoading(true);
            // Check cache first
            let content = versionCache[commit.hash];

            if (!content) {
                content = await invoke<string>('get_devlog_version', {
                    projectPath: activeProjectPath,
                    commitHash: commit.hash,
                });
                cacheVersion(commit.hash, content);
            }

            setSelectedVersionContent(content);
            selectVersion(commit.hash);
            setViewMode('version');
        } catch (err) {
            console.error('Failed to fetch version content:', err);
            // Ideally show a toast here
            alert('Failed to load version content');
        } finally {
            setLoading(false);
        }
    };

    if (!activeProjectPath) return null;

    if (loading && commits.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="font-['Work_Sans']">Loading history...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-destructive">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span className="font-['Work_Sans']">{error}</span>
            </div>
        );
    }

    if (commits.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
                <History className="mb-2 h-8 w-8 opacity-50" />
                <span className="font-['Work_Sans']">No history found</span>
            </div>
        );
    }

    return (
        <div className={cn("h-full w-full overflow-y-auto", className)}>
            <div className="flex flex-col gap-1 p-4">
                {commits.map((commit) => (
                    <button
                        key={commit.hash}
                        onClick={() => handleVersionClick(commit)}
                        className="flex flex-col items-start gap-1 rounded-md border border-transparent p-3 text-left transition-colors hover:bg-accent/50 hover:border-border/50 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="font-['JetBrains_Mono'] text-xs text-muted-foreground">
                                {commit.hash.substring(0, 7)}
                            </span>
                            <span className="font-['Work_Sans'] text-xs text-muted-foreground">
                                {format(new Date(commit.date), 'MMM d, yyyy HH:mm')}
                            </span>
                        </div>
                        <p className="font-['Work_Sans'] text-sm font-medium leading-none">
                            {commit.message}
                        </p>
                        <span className="font-['Work_Sans'] text-xs text-muted-foreground/70">
                            by {commit.author}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
