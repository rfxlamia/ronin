import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AgentMode, StepHistoryEntry } from '@/types/agent';

interface ProjectReasoningState {
    activeMode: AgentMode;
    activeProtocol: string | null;
    currentStepId: string | null;
    currentToolCalls: string[]; // Live tool calls for current step
    stepHistory: StepHistoryEntry[];
}

interface ReasoningState {
    // Multi-project support (keyed by projectId)
    byProject: Record<string, ProjectReasoningState>;

    setMode: (projectId: string, mode: AgentMode) => void;
    startProtocol: (projectId: string, protocolId: string) => void;
    appendToolCall: (projectId: string, toolCall: string) => void;
    completeStep: (projectId: string, stepId: string, output: string, toolCalls?: string[]) => void;
    setActiveStep: (projectId: string, stepId: string) => void;
    reset: (projectId: string) => void;
}

const defaultProjectState: ProjectReasoningState = {
    activeMode: 'ronin-flash',
    activeProtocol: null,
    currentStepId: null,
    currentToolCalls: [],
    stepHistory: []
};

export const useReasoningStore = create<ReasoningState>()(
    persist(
        (set) => ({
            byProject: {},

            setMode: (projectId, mode) => set((state) => ({
                byProject: {
                    ...state.byProject,
                    [projectId]: {
                        ...(state.byProject[projectId] || defaultProjectState),
                        activeMode: mode
                    }
                }
            })),

            startProtocol: (projectId, protocolId) => set((state) => ({
                byProject: {
                    ...state.byProject,
                    [projectId]: {
                        ...(state.byProject[projectId] || defaultProjectState),
                        activeProtocol: protocolId,
                        stepHistory: [], // Reset history
                        currentToolCalls: [] // Reset tool calls
                    }
                }
            })),

            appendToolCall: (projectId, toolCall) => set((state) => {
                const projectState = state.byProject[projectId] || defaultProjectState;
                return {
                    byProject: {
                        ...state.byProject,
                        [projectId]: {
                            ...projectState,
                            currentToolCalls: [...(projectState.currentToolCalls || []), toolCall]
                        }
                    }
                };
            }),

            completeStep: (projectId, stepId, output, toolCalls) => set((state) => {
                const projectState = state.byProject[projectId] || defaultProjectState;

                const entry: StepHistoryEntry = {
                    stepId,
                    output,
                    timestamp: Date.now(),
                    toolCallsMade: toolCalls || projectState.currentToolCalls || []
                };

                return {
                    byProject: {
                        ...state.byProject,
                        [projectId]: {
                            ...projectState,
                            stepHistory: [...projectState.stepHistory, entry],
                            currentStepId: stepId, // Update current step
                            currentToolCalls: [] // Reset live tool calls after step completion
                        }
                    }
                };
            }),

            setActiveStep: (projectId, stepId) => set((state) => {
                const projectState = state.byProject[projectId] || defaultProjectState;
                return {
                    byProject: {
                        ...state.byProject,
                        [projectId]: {
                            ...projectState,
                            currentStepId: stepId
                        }
                    }
                };
            }),

            reset: (projectId) => set((state) => {
                // Remove project from state (effectively resetting to default)
                const newByProject = { ...state.byProject };
                delete newByProject[projectId];
                return { byProject: newByProject };
            })
        }),
        {
            name: 'ronin-reasoning-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
