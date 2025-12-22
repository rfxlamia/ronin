import { z } from 'zod';

/**
 * Tool Schema Definitions for Vercel AI SDK (Story 4.5.1)
 * These schemas define the parameter structure for agent tools.
 * Real implementations will be added in Story 4.5.2
 */

export const readFileSchema = z.object({
    path: z.string().describe('Absolute path to file to read'),
});

export const listDirSchema = z.object({
    path: z.string().describe('Absolute path to directory to list'),
});

export const gitStatusSchema = z.object({}).describe('Get current git status');

export const gitLogSchema = z.object({
    limit: z.number().optional().default(5).describe('Maximum number of commits to return'),
});

// Additional tool schemas for future use
export const writeFileSchema = z.object({
    path: z.string().describe('Absolute path to file'),
    content: z.string().describe('Content to write to file'),
});

export const runCommandSchema = z.object({
    command: z.string().describe('Shell command to execute'),
});

export type ReadFileParams = z.infer<typeof readFileSchema>;
export type ListDirParams = z.infer<typeof listDirSchema>;
export type GitStatusParams = z.infer<typeof gitStatusSchema>;
export type GitLogParams = z.infer<typeof gitLogSchema>;
export type WriteFileParams = z.infer<typeof writeFileSchema>;
export type RunCommandParams = z.infer<typeof runCommandSchema>;
