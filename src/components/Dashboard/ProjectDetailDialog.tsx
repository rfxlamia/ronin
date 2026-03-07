import { GitBranch, Folder } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HealthBadge } from './HealthBadge';
import { ProjectDetailContent } from './ProjectDetailContent';
import { ContextPanel } from '@/components/ContextPanel';
import { GitStatusDisplay } from './GitStatusDisplay';
import { GitControlsWrapper } from './ProjectDetailContent';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import { calculateProjectHealth } from '@/lib/logic/projectHealth';
import type { Project } from '@/types/project';
import type { ContextPanelState, AttributionData, ParsedError } from '@/types/context';

interface ProjectDetailDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contextState: ContextPanelState;
    contextText: string;
    attribution: AttributionData | undefined;
    error: string | null;
    parsedError: ParsedError | null;
    retry: () => void;
    isOpeningIDE: boolean;
    onOpenInIDE: () => void;
}

export function ProjectDetailDialog({
    project,
    open,
    onOpenChange,
    contextState,
    contextText,
    attribution,
    error,
    parsedError,
    retry,
    isOpeningIDE,
    onOpenInIDE,
}: ProjectDetailDialogProps) {
    const TypeIcon = project.type === 'git' ? GitBranch : Folder;
    const daysSinceActivity = calculateDaysSince(
        project.lastActivityAt || project.updated_at
    );
    const activityText = formatDaysSince(daysSinceActivity);
    const healthStatus = calculateProjectHealth(project);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                showCloseButton={false}
            >
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <DialogTitle className="font-serif font-bold text-xl truncate">
                            {project.name}
                        </DialogTitle>
                    </div>
                    <DialogDescription asChild>
                        <div className="flex items-center gap-3 flex-wrap">
                            <HealthBadge status={healthStatus} />
                            <span className="text-sm text-muted-foreground font-sans">
                                {activityText}
                            </span>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {project.type === 'git' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4 bg-muted/20 p-4">
                            {/* Left column: AI Context */}
                            <div className="max-h-[400px] overflow-y-auto">
                                <ContextPanel
                                    state={contextState}
                                    text={contextText}
                                    attribution={contextState === 'complete' && attribution ? attribution : undefined}
                                    onRetry={retry}
                                    error={error || undefined}
                                    parsedError={parsedError || undefined}
                                />
                            </div>

                            {/* Right column: Git info + actions */}
                            <div className="space-y-4">
                                <GitStatusDisplay projectPath={project.path} />
                                <GitControlsWrapper project={project} />
                                <Button
                                    className="w-full font-serif"
                                    onClick={onOpenInIDE}
                                    disabled={isOpeningIDE}
                                >
                                    {isOpeningIDE ? 'Opening...' : 'Open in IDE'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <ProjectDetailContent
                            project={project}
                            contextState={contextState}
                            contextText={contextText}
                            attribution={attribution}
                            error={error}
                            parsedError={parsedError}
                            retry={retry}
                            isOpeningIDE={isOpeningIDE}
                            onOpenInIDE={onOpenInIDE}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
