import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useReasoningStore } from '@/stores/reasoningStore';
import type { AttributionData } from '@/types/context';

export type AgentState = 'idle' | 'analyzing' | 'complete' | 'error';

export interface AgentMessage {
    role: 'user' | 'assistant';
    content: string;
    attribution?: AttributionData;
}

/**
 * Hook for Agent analysis - integrates with reasoningStore and backend AI.
 * Follows the same event-based streaming pattern as useAiContext.
 */
export function useAgentAnalysis(projectId: string) {
    const [state, setState] = useState<AgentState>('idle');
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { startProtocol, appendToolCall, completeStep, byProject } = useReasoningStore();
    const projectState = byProject[projectId];
    const isThinkingMode = projectState?.activeMode === 'ronin-thinking';

    const analyze = useCallback(async () => {
        if (!projectId) return;

        setState('analyzing');
        setError(null);

        // Add user message
        const userMessage: AgentMessage = {
            role: 'user',
            content: 'Analyze this project and tell me what it does.',
        };
        setMessages((prev) => [...prev, userMessage]);

        // Start protocol in reasoning store (for Thinking mode)
        if (isThinkingMode) {
            startProtocol(projectId, 'project-resurrection');
        }

        // Set up event listeners for streaming
        const listeners: (() => void)[] = [];
        let streamedText = '';
        let finalAttribution: AttributionData | null = null;

        try {
            // Listen for text chunks
            const unlistenChunk = await listen<{ text: string }>('ai-chunk', (event) => {
                streamedText += event.payload.text;
                // Update message in real-time
                setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...lastMsg, content: streamedText }];
                    } else {
                        return [...prev, { role: 'assistant', content: streamedText }];
                    }
                });
            });
            listeners.push(unlistenChunk);

            // Listen for tool calls (for thinking indicator)
            const unlistenToolCall = await listen<{ tool_name: string; args: string }>(
                'agent-tool-call',
                (event) => {
                    const toolCallStr = `${event.payload.tool_name}(${event.payload.args})`;
                    appendToolCall(projectId, toolCallStr);
                }
            );
            listeners.push(unlistenToolCall);

            // Listen for step completion
            const unlistenStep = await listen<{ step_id: string; output: string }>(
                'agent-step-complete',
                (event) => {
                    completeStep(projectId, event.payload.step_id, event.payload.output);
                }
            );
            listeners.push(unlistenStep);

            // Listen for completion
            const unlistenComplete = await listen<{ text: string; attribution: AttributionData }>(
                'ai-complete',
                (event) => {
                    finalAttribution = event.payload.attribution;
                    setState('complete');

                    // Final message update with attribution
                    setMessages((prev) => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg?.role === 'assistant') {
                            return [
                                ...prev.slice(0, -1),
                                { ...lastMsg, content: streamedText || event.payload.text, attribution: finalAttribution || undefined },
                            ];
                        }
                        return prev;
                    });

                    // Cleanup listeners
                    listeners.forEach((unlisten) => unlisten());
                }
            );
            listeners.push(unlistenComplete);

            // Listen for errors
            const unlistenError = await listen<{ message: string }>('ai-error', (event) => {
                setError(event.payload.message);
                setState('error');
                listeners.forEach((unlisten) => unlisten());
            });
            listeners.push(unlistenError);

            // Invoke the backend - needs projectId as number
            const numericId = parseInt(projectId, 10);
            if (isNaN(numericId)) {
                throw new Error('Invalid project ID');
            }

            await invoke('generate_context', { projectId: numericId });
        } catch (err) {
            console.error('Agent analysis failed:', err);
            setError(String(err));
            setState('error');
            listeners.forEach((unlisten) => unlisten());
        }
    }, [projectId, isThinkingMode, startProtocol, appendToolCall, completeStep]);

    const reset = useCallback(() => {
        setState('idle');
        setMessages([]);
        setError(null);
    }, []);

    return {
        state,
        messages,
        error,
        analyze,
        reset,
        isAnalyzing: state === 'analyzing',
    };
}
