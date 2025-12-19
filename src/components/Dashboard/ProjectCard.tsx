import { useState } from 'react';
import { GitBranch, Folder, MoreVertical, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HealthBadge } from './HealthBadge';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import { calculateProjectHealth } from '@/lib/logic/projectHealth';
import type { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ProjectCardProps {
    project: Project;
    onExpandChange?: () => void;
}

export function ProjectCard({ project, onExpandChange }: ProjectCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const archiveProject = useProjectStore((state) => state.archiveProject);
    const restoreProject = useProjectStore((state) => state.restoreProject);
    const removeProject = useProjectStore((state) => state.removeProject);

    const handleExpandChange = (open: boolean) => {
        setIsExpanded(open);
        onExpandChange?.();
    };

    const handleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await archiveProject(project.id);
    };

    const handleRestore = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await restoreProject(project.id);
    };

    const handleRemove = async () => {
        await removeProject(project.id);
        setShowRemoveDialog(false);
        toast.success('Project removed from tracking');
    };

    const TypeIcon = project.type === 'git' ? GitBranch : Folder;
    const daysSinceActivity = calculateDaysSince(
        project.lastActivityAt || project.updated_at
    );
    const activityText = formatDaysSince(daysSinceActivity);

    // Calculate health status dynamically
    const healthStatus = calculateProjectHealth(project);

    return (
        <>
            <Collapsible open={isExpanded} onOpenChange={handleExpandChange}>
                <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
                    <div className="relative">
                        {/* Dropdown Menu - positioned absolutely to avoid nesting */}
                        <div className="absolute top-4 right-4 z-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Project menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {!project.isArchived && (
                                        <>
                                            <DropdownMenuItem onClick={handleArchive}>
                                                Archive
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setShowRemoveDialog(true)}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10 hover:bg-destructive hover:text-white [&>svg]:hover:text-white"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {project.isArchived && (
                                        <DropdownMenuItem onClick={handleRestore}>
                                            Restore
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* CollapsibleTrigger */}
                        <CollapsibleTrigger asChild>
                            <button
                                data-project-card
                                className={cn(
                                    'w-full text-left p-4 pr-14 transition-all duration-200',
                                    'focus-visible:outline-none focus-visible:ring-2',
                                    'focus-visible:ring-[#CC785C] focus-visible:ring-offset-2',
                                    'rounded-lg'
                                )}
                                aria-expanded={isExpanded}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TypeIcon
                                                className="h-4 w-4 text-muted-foreground flex-shrink-0"
                                                data-icon={project.type === 'git' ? 'git-branch' : 'folder'}
                                            />
                                            <h3 className="font-serif font-bold text-lg truncate">
                                                {project.name}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <HealthBadge status={healthStatus} />
                                            {project.type === 'folder' && project.fileCount !== undefined ? (
                                                <span className="text-sm text-muted-foreground font-sans">
                                                    {project.fileCount} {project.fileCount === 1 ? 'file' : 'files'}
                                                </span>
                                            ) : null}
                                            <span className="text-sm text-muted-foreground font-sans">
                                                {activityText}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                        <div className="px-4 pb-4 pt-2 border-t space-y-3">
                            {/* Git-specific information */}
                            {project.type === 'git' && (
                                <div className="space-y-2">
                                    {project.gitBranch && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-muted-foreground font-sans">Branch:</span>
                                            <span className="font-mono text-foreground">
                                                {project.gitBranch}
                                            </span>
                                        </div>
                                    )}

                                    {project.uncommittedCount !== undefined && project.uncommittedCount > 0 && (
                                        <div className="text-sm text-muted-foreground font-sans">
                                            {project.uncommittedCount} uncommitted {project.uncommittedCount === 1 ? 'file' : 'files'}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Project path - shown for all projects */}
                            <div className="text-xs font-mono text-muted-foreground truncate">
                                {project.path}
                            </div>

                            {/* Actions */}
                            <div className="pt-2">
                                <Button
                                    variant="default"
                                    className="w-full font-serif"
                                    disabled
                                    title="IDE integration coming soon"
                                >
                                    Open in IDE
                                </Button>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Remove Confirmation Dialog */}
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {project.name} from Ronin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your files won't be deleted. Only tracking stops. Your project will be hidden from the dashboard but can be found in your file system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleRemove}
                            className="font-serif"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
