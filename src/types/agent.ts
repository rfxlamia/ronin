import type { Tool } from 'ai';

/**
 * Agent execution modes
 * - ronin-flash: Single-shot, fast inference
 * - ronin-thinking: Multi-step reasoning loops with tools
 */
export type AgentMode = 'ronin-flash' | 'ronin-thinking';

/**
 * Formal reasoning protocol definition
 */
export interface ReasoningProtocol {
    id: string;               // e.g., "project-resurrection"
    title: string;
    description: string;
    steps: ProtocolStep[];
}

/**
 * Single step in a reasoning protocol
 */
export interface ProtocolStep {
    id: string;               // e.g., "step-01-map-structure"
    title: string;
    instruction: string;      // LLM instruction for this step
    requiredOutput: 'file_creation' | 'user_confirmation' | 'none';
}

/**
 * History of executed reasoning steps
 */
export interface StepHistoryEntry {
    stepId: string;
    output: string;           // LLM text output for this step
    timestamp: number;        // Unix timestamp (ms)
    toolCallsMade?: string[]; // Optional: tool names called (e.g., ["read_file", "list_dir"])
}

/**
 * Configuration options for reasoning capabilities
 */
export interface ReasoningOptions {
    maxSteps?: number;  // Default: 0 (Flash mode), 10 (Thinking mode)
    tools?: Record<string, Tool>; // Vercel AI SDK tools
}
