import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { formatDistanceToNow } from 'date-fns';
import { useDevlogStore, DevlogCommit } from '@/stores/devlogStore';
import { cn } from '@/lib/utils';
import { RoninLoader } from '@/components/ui/loader';
import { AlertCircle, History } from 'lucide-react';

interface DevlogHistoryProps {
    className?: string;
    onEscapeToEditor?: () => void;
}

export function DevlogHistory({ className, onEscapeToEditor }: DevlogHistoryProps) {
    const activeProjectPath = useDevlogStore((state) => state.activeProjectPath);
    const setViewMode = useDevlogStore((state) => state.setViewMode);
    const selectVersion = useDevlogStore((state) => state.selectVersion);
    const setSelectedVersionContent = useDevlogStore((state) => state.setSelectedVersionContent);
    const versionCache = useDevlogStore((state) => state.versionCache);
    const cacheVersion = useDevlogStore((state) => state.cacheVersion);
    const selectedVersionHash = useDevlogStore((state) => state.selectedVersionHash);

    const [commits, setCommits] = useState<DevlogCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

    const handleVersionClick = useCallback(async (commit: DevlogCommit) => {
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
    }, [activeProjectPath, versionCache, cacheVersion, setSelectedVersionContent, selectVersion, setViewMode]);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (commits.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
            case 'Tab':
                if (!e.shiftKey) {
                    e.preventDefault();
                    const nextIndex = focusedIndex < commits.length - 1 ? focusedIndex + 1 : 0;
                    setFocusedIndex(nextIndex);
                    itemRefs.current[nextIndex]?.focus();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : commits.length - 1;
                setFocusedIndex(prevIndex);
                itemRefs.current[prevIndex]?.focus();
                break;
            case 'Enter':
                if (focusedIndex >= 0 && focusedIndex < commits.length) {
                    handleVersionClick(commits[focusedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onEscapeToEditor?.();
                setViewMode('edit');
                break;
        }
    }, [commits, focusedIndex, handleVersionClick, onEscapeToEditor, setViewMode]);

    if (!activeProjectPath) return null;

    if (loading && commits.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                <RoninLoader className="h-8 w-8" />
                <span className="font-['Work_Sans'] text-sm">Analyzing DEVLOG history...</span>
            </div>
        );
    }

    // Check if error indicates non-git project
    if (error) {
        const isNotGitRepo = error.includes('Git repository') || error.includes('not a git');

        if (isNotGitRepo) {
            return (
                <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
                    <History className="mb-4 h-12 w-12 opacity-50" />
                    <p className="mb-4 text-center font-['Work_Sans'] text-sm">
                        DEVLOG history requires Git. Initialize a repository to track changes:
                    </p>
                    <div className="rounded-md bg-muted p-4 font-['JetBrains_Mono'] text-sm">
                        <code>$ git init</code><br />
                        <code>$ git add DEVLOG.md</code><br />
                        <code>$ git commit -m 'Initial DEVLOG'</code>
                    </div>
                </div>
            );
        }

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
                <span className="font-['Work_Sans'] text-sm">
                    No history yet — commit your DEVLOG to track changes
                </span>
            </div>
        );
    }

    return (
        <div
            ref={listRef}
            className={cn("h-full w-full overflow-y-auto", className)}
            role="list"
            aria-label="DEVLOG commit history"
            onKeyDown={handleKeyDown}
        >
            <div className="flex flex-col gap-1 p-4">
                {commits.map((commit, index) => (
                    <button
                        key={commit.hash}
                        ref={(el) => { itemRefs.current[index] = el; }}
                        onClick={() => handleVersionClick(commit)}
                        onFocus={() => setFocusedIndex(index)}
                        aria-label={`Commit by ${commit.author} on ${new Date(commit.date).toLocaleDateString()}: ${commit.message}`}
                        className={cn(
                            "flex flex-col items-start gap-1 rounded-md p-3 text-left transition-colors",
                            "hover:bg-ronin-primary/5 focus:outline-none focus:ring-1 focus:ring-ring",
                            selectedVersionHash === commit.hash
                                ? "border-2 border-ronin-primary"
                                : "border border-transparent hover:border-border/50"
                        )}
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="font-['JetBrains_Mono'] text-xs text-muted-foreground">
                                {commit.hash.substring(0, 7)}
                            </span>
                            <span className="font-['Work_Sans'] text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
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
            {commits.length >= 50 && (
                <p className="px-4 pb-4 font-['Work_Sans'] text-sm text-muted-foreground">
                    Showing last 50 commits (use git log in terminal for full history)
                </p>
            )}
        </div>
    );
}
