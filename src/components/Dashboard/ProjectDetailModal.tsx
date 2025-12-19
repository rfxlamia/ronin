import { GitBranch, Folder, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { LightModal } from '@/components/ui/light-modal';
import { Button } from '@/components/ui/button';
import { HealthBadge } from './HealthBadge';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import { calculateProjectHealth } from '@/lib/logic/projectHealth';
import type { Project } from '@/types/project';

interface ProjectDetailModalProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProjectDetailModal({ project, open, onOpenChange }: ProjectDetailModalProps) {
    const [copied, setCopied] = useState(false);

    const TypeIcon = project.type === 'git' ? GitBranch : Folder;
    const daysSinceActivity = calculateDaysSince(
        project.lastActivityAt || project.updated_at
    );
    const activityText = formatDaysSince(daysSinceActivity);
    const healthStatus = calculateProjectHealth(project);

    const handleCopyPath = async () => {
        await navigator.clipboard.writeText(project.path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasGitInfo = project.type === 'git' && (
        project.gitBranch ||
        (project.uncommittedCount !== undefined && project.uncommittedCount > 0)
    );

    return (
        <LightModal open={open} onClose={() => onOpenChange(false)}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pr-8">
                <TypeIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <h2 className="font-serif text-xl font-bold truncate">{project.name}</h2>
            </div>

            <div className="space-y-3">
                {/* Status Row */}
                <div className="flex items-center gap-3 flex-wrap">
                    <HealthBadge status={healthStatus} />
                    <span className="text-sm text-muted-foreground font-sans">
                        {activityText}
                    </span>
                    {project.type === 'folder' && project.fileCount !== undefined && (
                        <span className="text-sm text-muted-foreground font-sans">
                            • {project.fileCount} {project.fileCount === 1 ? 'file' : 'files'}
                        </span>
                    )}
                </div>

                {/* Git-specific information */}
                {hasGitInfo && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        {project.gitBranch && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground font-sans">Branch:</span>
                                <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">
                                    {project.gitBranch}
                                </code>
                            </div>
                        )}
                        {project.uncommittedCount !== undefined && project.uncommittedCount > 0 && (
                            <div className="text-sm text-amber-500 font-sans">
                                ⚠ {project.uncommittedCount} uncommitted {project.uncommittedCount === 1 ? 'change' : 'changes'}
                            </div>
                        )}
                    </div>
                )}

                {/* Project path */}
                <div className="flex items-center gap-2 w-full overflow-hidden">
                    <div className="flex-1 min-w-0">
                        <code
                            className="block w-full text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded-lg truncate"
                            title={project.path}
                        >
                            {project.path}
                        </code>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={handleCopyPath}
                        title="Copy path"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Actions */}
                <Button
                    variant="default"
                    className="w-full font-serif"
                    disabled
                    title="IDE integration coming soon"
                >
                    Open in IDE
                </Button>
            </div>
        </LightModal>
    );
}
