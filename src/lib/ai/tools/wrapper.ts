import { z } from 'zod';
import { tool } from 'ai';
import { ToolExecutionContext } from './types';
import { logToolCall } from './logger';

// Definition compatible with our mock tools and AI SDK expectations effectively
export type RawTool<Args extends z.ZodType = any> = {
    description: string;
    parameters?: Args;
    inputSchema?: Args; // Support both for compatibility
    execute: (args: z.infer<Args>, context: ToolExecutionContext) => Promise<any>;
};

/**
 * Wraps raw tools to inject context and log execution.
 * Returns a dictionary of tools compatible with Vercel AI SDK.
 */
export function wrapToolsWithContext(
    tools: Record<string, RawTool<any>>,
    context: Omit<ToolExecutionContext, 'currentStepId'> & { getCurrentStepId: () => string | undefined }
) {
    const wrappedTools: Record<string, any> = {};

    for (const [name, rawTool] of Object.entries(tools)) {
        // AI SDK Core uses 'parameters'. Our mocks might use 'inputSchema'.
        const parameters = rawTool.parameters || rawTool.inputSchema;

        if (!parameters) {
            throw new Error(`Tool ${name} missing parameters/inputSchema`);
        }

        wrappedTools[name] = tool({
            description: rawTool.description,
            parameters: parameters as any,
            execute: async (args: any) => {
                try {
                    // Inject context into execution
                    const fullContext: ToolExecutionContext = {
                        ...context,
                        currentStepId: context.getCurrentStepId()
                    };

                    const result = await rawTool.execute(args, fullContext);

                    // Log successful execution with result (per AC #2.E)
                    logToolCall(fullContext.projectId, fullContext.currentStepId, name, args, result);

                    return result;
                } catch (error: any) {
                    // Log error but don't suppress it (SDK needs to know)
                    console.error(`Tool ${name} execution failed:`, error);

                    // Log failed attempt with error info
                    const fullContext: ToolExecutionContext = {
                        ...context,
                        currentStepId: context.getCurrentStepId()
                    };
                    logToolCall(fullContext.projectId, fullContext.currentStepId, name, args, { error: error.message });

                    // Story 8.8 says "Convert Tauri errors to user-friendly messages".
                    throw error;
                }
            },
        } as any);
    }

    return wrappedTools;
}
