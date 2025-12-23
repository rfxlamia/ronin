import { Check, Circle, CircleDot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReasoningStore } from '@/stores/reasoningStore';
import { PROJECT_RESURRECTION_PROTOCOL } from '@/lib/ai/protocols/project-resurrection';
import { cn } from '@/lib/utils';

interface ProtocolViewerProps {
  projectId: string;
}

type StepState = 'pending' | 'active' | 'done';

/**
 * ProtocolViewer - Displays the multi-step reasoning protocol
 * Highlights current step and marks completed steps
 */
export function ProtocolViewer({ projectId }: ProtocolViewerProps) {
  const { byProject } = useReasoningStore();
  const projectState = byProject[projectId];

  const currentStepId = projectState?.currentStepId || null;
  const stepHistory = projectState?.stepHistory || [];

  // Determine state for each step
  const getStepState = (stepId: string): StepState => {
    // Check if step is completed
    const isCompleted = stepHistory.some((entry) => entry.stepId === stepId);
    if (isCompleted) return 'done';

    // Check if step is current
    if (stepId === currentStepId) return 'active';

    // Otherwise pending
    return 'pending';
  };

  const getStepIcon = (state: StepState) => {
    switch (state) {
      case 'done':
        return <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'active':
        return <CircleDot className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'pending':
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h2
          className="text-lg font-semibold mb-1"
          style={{ fontFamily: "'Libre Baskerville', serif" }}
        >
          Analysis Protocol
        </h2>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Work Sans', sans-serif" }}>
          {PROJECT_RESURRECTION_PROTOCOL.description}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {PROJECT_RESURRECTION_PROTOCOL.steps.map((step, index) => {
            const state = getStepState(step.id);

            return (
              <div
                key={step.id}
                data-step-id={step.id}
                data-state={state}
                className={cn(
                  'flex gap-3 p-3 rounded-lg transition-colors',
                  state === 'active' && 'bg-amber-500/10 border border-amber-500/20',
                  state === 'done' && 'bg-emerald-500/5',
                  state === 'pending' && 'opacity-60'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">{getStepIcon(state)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-xs font-mono text-muted-foreground"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {index + 1}
                    </span>
                    <h3
                      className="text-sm font-medium"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      {step.title}
                    </h3>
                  </div>
                  {state === 'active' && (
                    <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                      {step.instruction}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
