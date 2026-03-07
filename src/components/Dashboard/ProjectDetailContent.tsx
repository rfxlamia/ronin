import { Button } from '@/components/ui/button';
import { ContextPanel } from '@/components/ContextPanel';
import { GitStatusDisplay } from './GitStatusDisplay';
import { GitControls } from './GitControls';
import { useGitStatus } from '@/hooks/useGitStatus';
import type { Project } from '@/types/project';
import type { ContextPanelState, AttributionData, ParsedError } from '@/types/context';

interface ProjectDetailContentProps {
    project: Project;
    contextState: ContextPanelState;
    contextText: string;
    attribution: AttributionData | undefined;
    error: string | null;
    parsedError: ParsedError | null;
    retry: () => void;
    isOpeningIDE: boolean;
    onOpenInIDE: () => void;
}

export function ProjectDetailContent({
    project,
    contextState,
    contextText,
    attribution,
    error,
    parsedError,
    retry,
    isOpeningIDE,
    onOpenInIDE,
}: ProjectDetailContentProps) {
    return (
        <div className="bg-muted/20 p-4 space-y-4">
            <ContextPanel
                state={contextState}
                text={contextText}
                attribution={contextState === 'complete' && attribution ? attribution : undefined}
                onRetry={retry}
                error={error || undefined}
                parsedError={parsedError || undefined}
            />

            {project.type === 'git' && (
                <div className="pt-2 border-t border-border/50">
                    <GitStatusDisplay projectPath={project.path} />
                </div>
            )}

            {project.type === 'git' && (
                <GitControlsWrapper project={project} />
            )}

            <Button
                className="w-full font-serif"
                onClick={onOpenInIDE}
                disabled={isOpeningIDE}
            >
                {isOpeningIDE ? 'Opening...' : 'Open in IDE'}
            </Button>
        </div>
    );
}

function GitControlsWrapper({ project }: { project: Project }) {
    const { status, refresh } = useGitStatus(project.path);

    if (!status || (status.uncommittedFiles === 0 && status.unpushedCommits === 0)) {
        return null;
    }

    return <GitControls project={project} onSuccess={refresh} status={status} />;
}
