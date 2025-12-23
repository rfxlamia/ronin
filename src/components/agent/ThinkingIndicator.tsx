import { FileText, Terminal, Search, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useReasoningStore } from '@/stores/reasoningStore';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  projectId: string;
}

/**
 * ThinkingIndicator - Shows real-time AI activity during protocol execution
 * Parses tool calls into user-friendly messages
 */
export function ThinkingIndicator({ projectId }: ThinkingIndicatorProps) {
  const { byProject } = useReasoningStore();
  const projectState = byProject[projectId];

  // Only show if protocol is active
  if (!projectState?.activeProtocol) {
    return null;
  }

  const currentToolCalls = projectState.currentToolCalls || [];
  const latestToolCall = currentToolCalls[currentToolCalls.length - 1];

  // Parse tool call into user-friendly text
  const parseToolCall = (toolCall: string): { icon: React.ReactNode; text: string } => {
    // Extract tool name and arguments
    const match = toolCall.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      return { icon: <Brain className="h-4 w-4" />, text: 'Processing...' };
    }

    const [, toolName, args] = match;

    switch (toolName) {
      case 'read_file':
        return {
          icon: <FileText className="h-4 w-4" />,
          text: `Reading ${args}...`,
        };
      case 'list_files':
        return {
          icon: <Search className="h-4 w-4" />,
          text: `Scanning ${args || 'directory'}...`,
        };
      case 'run_command':
        return {
          icon: <Terminal className="h-4 w-4" />,
          text: `Running ${args}...`,
        };
      default:
        return {
          icon: <Brain className="h-4 w-4" />,
          text: `Executing ${toolName}...`,
        };
    }
  };

  const activity = latestToolCall ? parseToolCall(latestToolCall) : { icon: <Brain className="h-4 w-4" />, text: 'Thinking...' };

  return (
    <Card className="px-4 py-3 flex items-center gap-3 bg-card/95 backdrop-blur-sm border-border shadow-lg">
      <div className={cn(
        'flex-shrink-0 text-amber-600 dark:text-amber-400',
        'animate-pulse'
      )}>
        {activity.icon}
      </div>
      <p
        className="text-sm font-medium text-foreground"
        style={{ fontFamily: "'Work Sans', sans-serif" }}
      >
        {activity.text}
      </p>
    </Card>
  );
}
