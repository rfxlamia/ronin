import { Zap, Brain } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useReasoningStore } from '@/stores/reasoningStore';
import type { AgentMode } from '@/types/agent';

interface ModeToggleProps {
  projectId: string;
}

/**
 * ModeToggle - Switches between Flash and Thinking modes
 * Connects to reasoningStore to persist mode selection
 */
export function ModeToggle({ projectId }: ModeToggleProps) {
  const { byProject, setMode } = useReasoningStore();

  // Get current mode for this project (default to ronin-flash)
  const projectState = byProject[projectId];
  const activeMode: AgentMode = projectState?.activeMode || 'ronin-flash';

  const handleModeChange = (value: string) => {
    if (value === 'ronin-flash' || value === 'ronin-thinking') {
      setMode(projectId, value);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={activeMode}
      onValueChange={handleModeChange}
      className="border rounded-lg p-1 bg-background"
    >
      <ToggleGroupItem
        value="ronin-flash"
        aria-label="Flash Mode"
        className="gap-2 data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-600 dark:data-[state=on]:text-emerald-400"
        style={{ fontFamily: "'Libre Baskerville', serif" }}
      >
        <Zap className="h-4 w-4" />
        <span>Flash</span>
      </ToggleGroupItem>

      <ToggleGroupItem
        value="ronin-thinking"
        aria-label="Thinking Mode"
        className="gap-2 data-[state=on]:bg-amber-500/10 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
        style={{ fontFamily: "'Libre Baskerville', serif" }}
      >
        <Brain className="h-4 w-4" />
        <span>Thinking</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
