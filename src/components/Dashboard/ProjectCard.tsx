import { useState } from 'react';
import { GitBranch, Folder } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { HealthBadge } from './HealthBadge';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import type { Project } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
    project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const TypeIcon = project.type === 'git' ? GitBranch : Folder;
    const daysSinceActivity = calculateDaysSince(
        project.lastActivityAt || project.updated_at
    );
    const activityText = formatDaysSince(daysSinceActivity);

    // Default health status if not provided
    const healthStatus = project.healthStatus || 'Dormant';

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
                <CollapsibleTrigger asChild>
                    <button
                        className={cn(
                            'w-full text-left p-4 transition-all duration-200',
                            'focus-visible:outline-none focus-visible:ring-2',
                            'focus-visible:ring-[#CC785C] focus-visible:ring-offset-2',
                            'rounded-lg'
                        )}
                        aria-expanded={isExpanded}
                    >
                        <div className="flex items-start justify-between gap-4">
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
                                    <span className="text-sm text-muted-foreground font-sans">
                                        {activityText}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                </CollapsibleTrigger>

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
    );
}
