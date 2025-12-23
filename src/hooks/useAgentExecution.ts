import { useState, useCallback, useRef } from 'react';
import { generateText } from 'ai';
import { useReasoningStore } from '@/stores/reasoningStore';
import { useAiStore } from '@/stores/aiStore';
import { createTauriLanguageModel, getWrappedTools } from '@/lib/ai/client';
import { PROJECT_RESURRECTION_PROTOCOL } from '@/lib/ai/protocols/project-resurrection';
import { RONIN_THINKING_PROMPT } from '@/lib/ai/prompts/ronin-thinking';


export type AgentStatus = 'idle' | 'analyzing' | 'complete' | 'error';

export interface UseAgentExecutionResult {
    status: AgentStatus;
    response: string | null;
    error: string | null;
    execute: (projectId: number) => Promise<void>;
    retry: () => Promise<void>;
}

export function useAgentExecution(): UseAgentExecutionResult {
    const [status, setStatus] = useState<AgentStatus>('idle');
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Store last projectId for retry functionality
    const lastProjectIdRef = useRef<number | null>(null);

    // Access stores
    const { startProtocol, setActiveStep, completeStep } = useReasoningStore();
    const defaultProvider = useAiStore((s) => s.defaultProvider);

    const execute = useCallback(async (projectId: number) => {
        try {
            setStatus('analyzing');
            setError(null);
            setResponse(null);
            lastProjectIdRef.current = projectId;

            const projectIdStr = projectId.toString();
            const protocol = PROJECT_RESURRECTION_PROTOCOL;

            // 1. Initialize Reasoning State
            startProtocol(projectIdStr, protocol.id);

            // 2. Get AI Provider
            const providerId = defaultProvider || 'openrouter';

            // 3. Setup Model (custom Tauri-bridged model)
            const model = createTauriLanguageModel({
                provider: providerId,
                projectId: projectId,
                mode: 'ronin-thinking'
            });

            let fullContext = "";
            let finalReport = "";

            // 4. Execute Protocol Steps Loop
            for (const step of protocol.steps) {
                // Set UI state to this step
                setActiveStep(projectIdStr, step.id);

                // Construct System Prompt with accumulated context
                const stepSystemPrompt = `${RONIN_THINKING_PROMPT}

## ACCUMULATED CONTEXT
${fullContext ? fullContext : "(No previous context yet)"}
`;

                // Construct the user prompt for this specific step
                const stepPrompt = `## CURRENT OBJECTIVE: ${step.title}

${step.instruction}

Execute the necessary tools to complete this step's instruction.
Provide a concise summary of your findings.`;

                // Execute with Vercel AI SDK
                // CRITICAL: generateText requires either 'prompt' or 'messages'
                // Use 'as any' for custom provider compatibility
                const { text } = await generateText({
                    model: model as any,
                    system: stepSystemPrompt,
                    prompt: stepPrompt,
                    tools: getWrappedTools(projectIdStr, 'ronin-thinking'),
                    maxSteps: 10,
                } as any);

                // Complete the step in store
                completeStep(projectIdStr, step.id, text);

                // Accumulate context
                fullContext += `\n\n### Findings from "${step.title}"\n${text}`;

                // If this is the synthesis step, this is our final report
                if (step.id === 'step-05-synthesize') {
                    finalReport = text;
                }
            }

            // 5. Finish
            if (!finalReport) {
                finalReport = fullContext;
            }

            setResponse(finalReport);
            setStatus('complete');

        } catch (err: unknown) {
            console.error('[AgentExecution] Failed:', err);
            const message = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
            setError(message);
            setStatus('error');
        }
    }, [startProtocol, setActiveStep, completeStep, defaultProvider]);

    // Retry function - re-runs execute with the last projectId
    const retry = useCallback(async () => {
        if (lastProjectIdRef.current !== null) {
            await execute(lastProjectIdRef.current);
        }
    }, [execute]);

    return {
        status,
        response,
        error,
        execute,
        retry
    };
}
