import { useState, memo, useRef, useEffect } from 'react';
import { GitBranch, Folder, MoreVertical, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { HealthBadge } from './HealthBadge';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import { calculateProjectHealth } from '@/lib/logic/projectHealth';
import type { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAiContext } from '@/hooks/useAiContext';
import { ProjectDetailContent } from './ProjectDetailContent';
import { ProjectDetailDialog } from './ProjectDetailDialog';
import { useSettingsStore } from '@/stores/settingsStore';
import { invoke } from '@tauri-apps/api/core';

interface ProjectCardProps {
    project: Project;
}

export const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [isOpeningIDE, setIsOpeningIDE] = useState(false);

    // Use AI Context Hook
    const { contextState, contextText, attribution, error, parsedError, retry } = useAiContext(
        isOpen ? project.id : null
    );

    const archiveProject = useProjectStore((state) => state.archiveProject);
    const restoreProject = useProjectStore((state) => state.restoreProject);
    const removeProject = useProjectStore((state) => state.removeProject);

    const cardDisplayMode = useSettingsStore((s) => s.cardDisplayMode);

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

    const handleOpenInIDE = async () => {
        setIsOpeningIDE(true);
        try {
            await invoke('open_in_ide', { path: project.path });
            toast.success('Opened in IDE');
        } catch (error) {
            toast.error(`Failed to open: ${error}`);
        } finally {
            setIsOpeningIDE(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        // AI context generation is automatically triggered by useAiContext
        // when isOpen changes from false to true
    };

    // Ref for click-outside detection
    const cardRef = useRef<HTMLDivElement>(null);

    // Click outside to close (only in collapsible mode)
    useEffect(() => {
        if (!isOpen || cardDisplayMode !== 'collapsible') return;

        const handleClickOutside = (event: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
                handleOpenChange(false);
            }
        };

        // Delay adding listener to avoid immediate close from the same click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, cardDisplayMode]);

    const TypeIcon = project.type === 'git' ? GitBranch : Folder;
    const daysSinceActivity = calculateDaysSince(
        project.lastActivityAt || project.updated_at
    );
    const activityText = formatDaysSince(daysSinceActivity);
    const healthStatus = calculateProjectHealth(project);

    return (
        <>
            <div ref={cardRef} className="relative">
                <Card
                    className={cn(
                        "transition-all duration-200",
                        "hover:shadow-md hover:border-[#CC785C]/50",
                        isOpen && cardDisplayMode === 'collapsible' && "z-20 shadow-lg rounded-b-none border-b-0"
                    )}
                >
                    <Collapsible open={cardDisplayMode === 'collapsible' ? isOpen : false} onOpenChange={handleOpenChange}>
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

                            {/* Collapsible Trigger (Card Header) */}
                            <CollapsibleTrigger asChild>
                                <button
                                    data-project-card
                                    className={cn(
                                        'w-full text-left p-4 pr-14 transition-all duration-200',
                                        'focus-visible:outline-none focus-visible:ring-2',
                                        'focus-visible:ring-[#CC785C] focus-visible:ring-offset-2',
                                        // Remove rounded-lg as it's full width of card now? 
                                        // Or keep it but inside Card it might look weird if background changes.
                                        // Assuming transparent bg for button.
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Tooltip>
                                                    <TooltipTrigger
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label={project.type === 'git' ? 'Git repository' : 'Folder'}
                                                    >
                                                        <TypeIcon
                                                            className="h-4 w-4 text-muted-foreground flex-shrink-0"
                                                            data-icon={project.type === 'git' ? 'git-branch' : 'folder'}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{project.type === 'git' ? 'Git repository' : 'Folder (not Git)'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
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

                        {/* Collapsible Content - Only in collapsible mode */}
                        {cardDisplayMode === 'collapsible' && (
                            <CollapsibleContent
                                className={cn(
                                    "absolute left-0 right-0 top-full -mt-px",
                                    "z-30 bg-card border border-t-0 border-border rounded-b-lg shadow-xl",
                                    "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
                                )}
                            >
                                <ProjectDetailContent
                                    project={project}
                                    contextState={contextState}
                                    contextText={contextText}
                                    attribution={attribution}
                                    error={error}
                                    parsedError={parsedError}
                                    retry={retry}
                                    isOpeningIDE={isOpeningIDE}
                                    onOpenInIDE={handleOpenInIDE}
                                />
                            </CollapsibleContent>
                        )}
                    </Collapsible>
                </Card>
            </div>

            {/* Project Detail Dialog - Only in modal mode */}
            {cardDisplayMode === 'modal' && (
                <ProjectDetailDialog
                    project={project}
                    open={isOpen}
                    onOpenChange={handleOpenChange}
                    contextState={contextState}
                    contextText={contextText}
                    attribution={attribution}
                    error={error}
                    parsedError={parsedError}
                    retry={retry}
                    isOpeningIDE={isOpeningIDE}
                    onOpenInIDE={handleOpenInIDE}
                />
            )}

            {/* Remove Confirmation Dialog */}
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