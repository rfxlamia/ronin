import { GitBranch, FileDiff, ArrowUp, Clock, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useGitStatus } from '@/hooks/useGitStatus';
import { formatDistanceToNow } from 'date-fns';

interface GitStatusDisplayProps {
    projectPath: string;
}

// Inline Badge component for edge case states
interface BadgeProps {
    variant: 'amber' | 'red' | 'gray';
    icon: React.ReactNode;
    children: React.ReactNode;
}

function Badge({ variant, icon, children }: BadgeProps) {
    const variantClasses = {
        amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-800',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800',
        gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400 border-gray-300 dark:border-gray-700',
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${variantClasses[variant]}`}>
            {icon}
            <span>{children}</span>
        </div>
    );
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
            {/* Empty Repository State */}
            {status.isEmpty ? (
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <span className="font-sans text-muted-foreground">No commits yet</span>
                </div>
            ) : (
                <>
                    {/* Branch with edge case badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                        <span className="font-sans text-foreground">{status.branch}</span>

                        {/* Conflicts Badge (highest priority - blocking) */}
                        {status.hasConflicts && (
                            <Badge variant="red" icon={<AlertTriangle className="h-3 w-3" />}>
                                Conflicts
                            </Badge>
                        )}

                        {/* Detached HEAD Badge */}
                        {status.isDetached && (
                            <Badge variant="amber" icon={<AlertCircle className="h-3 w-3" />}>
                                Detached HEAD
                            </Badge>
                        )}

                        {/* No Remote Badge */}
                        {!status.hasRemote && (
                            <Badge variant="gray" icon={<Info className="h-3 w-3" />}>
                                No Remote
                            </Badge>
                        )}
                    </div>

                    {/* Conflict Warning Message */}
                    {status.hasConflicts && (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                            <span className="font-sans">Resolve conflicts in terminal</span>
                        </div>
                    )}

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
                </>
            )}
        </div>
    );
}
