import type { AgentMode } from '@/types/agent';

export interface ToolExecutionContext {
    projectId: string;  // String for store keying, convert to number for Tauri
    mode: AgentMode;
    currentStepId?: string;
}

// Helper generic for raw tool handlers that expect context
export type ToolHandler<Args, Result> = (
    args: Args,
    context: ToolExecutionContext
) => Promise<Result>;
