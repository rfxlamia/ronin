import { GitBranch, FileDiff, ArrowUp, Clock } from 'lucide-react';
import { useGitStatus } from '@/hooks/useGitStatus';
import { formatDistanceToNow } from 'date-fns';

interface GitStatusDisplayProps {
    projectPath: string;
}

export function GitStatusDisplay({ projectPath }: GitStatusDisplayProps) {
    const { status, loading, error } = useGitStatus(projectPath);

    // Don't show anything if there's an error (likely not a git project)
    if (error || !status) {
        return null;
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-2">
                <div className="h-4 bg-muted/20 rounded animate-pulse w-32" />
                <div className="h-4 bg-muted/20 rounded animate-pulse w-24" />
            </div>
        );
    }

    // Format last commit time
    const lastCommitTime = status.lastCommitTimestamp > 0
        ? formatDistanceToNow(new Date(status.lastCommitTimestamp * 1000), { addSuffix: true })
        : 'Never';

    return (
        <div className="space-y-2 text-sm">
            {/* Branch */}
            <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <span className="font-mono text-foreground">{status.branch}</span>
            </div>

            {/* Uncommitted Files */}
            {status.uncommittedFiles > 0 && (
                <div className="flex items-center gap-2">
                    <FileDiff className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" aria-hidden="true" />
                    <span className="font-sans text-amber-600 dark:text-amber-500">
                        {status.uncommittedFiles} uncommitted {status.uncommittedFiles === 1 ? 'file' : 'files'}
                    </span>
                </div>
            )}

            {/* Unpushed Commits */}
            {status.hasRemote && status.unpushedCommits > 0 && (
                <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-[#CC785C] flex-shrink-0" aria-hidden="true" />
                    <span className="font-sans text-[#CC785C]">
                        {status.unpushedCommits} unpushed {status.unpushedCommits === 1 ? 'commit' : 'commits'}
                    </span>
                </div>
            )}

            {/* Last Commit Time */}
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <span className="font-sans text-muted-foreground">
                    Last commit {lastCommitTime}
                </span>
            </div>
        </div>
    );
}
