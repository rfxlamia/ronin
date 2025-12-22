
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AiChunkEvent, AiErrorEvent, Message, ContextPayload } from '@/types/ai';

/**
 * Custom Tauri-bridged language model for Vercel AI SDK v5.
 * Implements the v2 specification required by AI SDK 5.
 */
export interface TauriLanguageModelConfig {
    provider: string;
    model?: string;
    projectId: number;
}

export const createTauriLanguageModel = (config: TauriLanguageModelConfig) => {
    return {
        specificationVersion: 'v2' as const,
        provider: 'tauri',
        modelId: config.model || config.provider,
        defaultObjectGenerationMode: 'json' as const,

        async doGenerate(options: any) {
            const streamResult = await this.doStream(options);
            const reader = streamResult.stream.getReader();
            let text = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value.type === 'text-delta') {
                    text += value.textDelta;
                }
            }

            // v2 format requires content array instead of text
            return {
                content: [{ type: 'text' as const, text }],
                finishReason: 'stop' as const,
                usage: { promptTokens: 0, completionTokens: 0 },
                rawCall: { rawPrompt: options.prompt, rawSettings: {} },
                warnings: [],
            };
        },

        async doStream(options: any) {
            // Map Vercel messages to Tauri Message format
            const messages = mapMessages(options.prompt);

            const payload: ContextPayload = {
                model: config.model,
                messages,
                attribution: { commits: 0, files: 0, sources: [] } // Backend handles real attribution or ignores this
            };

            const stream = new ReadableStream({
                async start(controller) {
                    let unlistenChunk: (() => void) | undefined;
                    let unlistenError: (() => void) | undefined;
                    let unlistenComplete: (() => void) | undefined;

                    const cleanup = () => {
                        if (unlistenChunk) unlistenChunk();
                        if (unlistenError) unlistenError();
                        if (unlistenComplete) unlistenComplete();
                    };

                    try {
                        unlistenChunk = await listen<AiChunkEvent>('ai-chunk', (event) => {
                            // Handle text delta
                            if (event.payload.text) {
                                controller.enqueue({
                                    type: 'text-delta',
                                    textDelta: event.payload.text
                                });
                            }

                            // Handle tool call delta
                            if (event.payload.tool_calls) {
                                event.payload.tool_calls.forEach((tc: any) => {
                                    controller.enqueue({
                                        type: 'tool-call-delta',
                                        toolCallType: 'function',
                                        toolCallId: tc.id,
                                        toolName: tc.function?.name,
                                        argsTextDelta: tc.function?.arguments
                                    });
                                });
                            }
                        });

                        unlistenError = await listen<AiErrorEvent>('ai-inference-failed', (event) => {
                            controller.error(new Error(event.payload.message));
                            cleanup();
                            controller.close();
                        });

                        unlistenComplete = await listen('ai-complete', () => {
                            controller.enqueue({ type: 'finish', finishReason: 'stop' });
                            controller.close();
                            cleanup();
                        });

                        await invoke('generate_context', {
                            projectId: config.projectId,
                            payload
                        });
                    } catch (e) {
                        controller.error(e);
                        cleanup();
                    }
                }
            });

            return {
                stream,
                rawCall: { rawPrompt: options.prompt, rawSettings: {} }
            };
        }
    }
}

function mapMessages(prompt: any): Message[] {
    // We strictly map to the Message interface defined in src/types/ai.ts
    // Note: This simplification loses tool_call details if they exist in history,
    // which effectively disables tool use memory until backend supports it.
    if (!Array.isArray(prompt)) return [];

    return prompt.map((p: any) => {
        let content = '';
        if (typeof p.content === 'string') {
            content = p.content;
        } else if (Array.isArray(p.content)) {
            content = p.content
                .filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join('\n');
        }

        return {
            role: p.role,
            content,
            name: undefined
        };
    });
}
