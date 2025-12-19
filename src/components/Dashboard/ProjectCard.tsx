import { useState, memo } from 'react';
import { GitBranch, Folder, MoreVertical, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HealthBadge } from './HealthBadge';
import { ProjectDetailModal } from './ProjectDetailModal';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import { calculateProjectHealth } from '@/lib/logic/projectHealth';
import type { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ProjectCardProps {
    project: Project;
}

export const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const archiveProject = useProjectStore((state) => state.archiveProject);
    const restoreProject = useProjectStore((state) => state.restoreProject);
    const removeProject = useProjectStore((state) => state.removeProject);

    const handleCardClick = () => {
        setIsModalOpen(true);
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
            <Card
                className={cn(
                    "overflow-hidden transition-all duration-200",
                    "hover:shadow-md hover:border-[#CC785C]/50",
                    "cursor-pointer active:scale-[0.98]"
                )}
                onClick={handleCardClick}
            >
                <div className="relative">
                    {/* Dropdown Menu - positioned absolutely */}
                    <div className="absolute top-4 right-4 z-10">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                >
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowRemoveDialog(true);
                                            }}
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

                    {/* Card Content */}
                    <button
                        data-project-card
                        className={cn(
                            'w-full text-left p-4 pr-14 transition-all duration-200',
                            'focus-visible:outline-none focus-visible:ring-2',
                            'focus-visible:ring-[#CC785C] focus-visible:ring-offset-2',
                            'rounded-lg'
                        )}
                        aria-haspopup="dialog"
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
                </div>
            </Card>

            {/* Project Detail Modal - only render when open */}
            {isModalOpen && (
                <ProjectDetailModal
                    project={project}
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                />
            )}

            {/* Remove Confirmation Dialog - only render when open */}
            {showRemoveDialog && (
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
            )}
        </>
    );
});
