// @ts-nocheck
import { z } from 'zod';
import { tool } from 'ai';

/**
 * Mock tools for Agent Core validation (Story 4.5.1)
 * These tools simulate filesystem/shell operations without actual execution,
 * allowing us to verify the reasoning loop logic on the frontend.
 */
export const mockTools = {
    read_file: tool({
        description: 'Read the contents of a file',
        parameters: z.object({
            path: z.string().describe('Absolute path to file'),
        }),
        execute: async ({ path }: { path: string }) => {
            // Simulate reading a file
            await new Promise(resolve => setTimeout(resolve, 500)); // Latency
            return `[MOCK] Content of ${path}\n\n// ... actual content would be here ...`;
        },
    }),

    write_file: tool({
        description: 'Write content to a file',
        parameters: z.object({
            path: z.string().describe('Absolute path'),
            content: z.string().describe('Content to write'),
        }),
        execute: async ({ path, content }: { path: string; content: string }) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            return `[MOCK] Successfully wrote to ${path}`;
        },
    }),

    list_dir: tool({
        description: 'List contents of a directory',
        parameters: z.object({
            path: z.string().describe('Absolute path'),
        }),
        execute: async ({ path }: { path: string }) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            return `[MOCK] Listing of ${path}:\n- src/\n- package.json\n- README.md`;
        },
    }),

    run_command: tool({
        description: 'Run a shell command',
        parameters: z.object({
            command: z.string().describe('Command to execute'),
        }),
        execute: async ({ command }: { command: string }) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return `[MOCK] Executed: ${command}\nExit Code: 0\nOutput: [Success]`;
        },
    }),
};
