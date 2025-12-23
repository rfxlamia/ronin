import { z } from 'zod';

/**
 * Mock Tool Handlers for Agent Core validation (Story 4.5.1)
 * These tools simulate filesystem/git operations without actual execution,
 * allowing us to verify the reasoning loop logic on the frontend.
 * 
 * TODO: Story 4.5.2 will implement real Tauri commands for these tools.
 */

// Tool schemas
const readFileSchema = z.object({
    path: z.string().describe('Absolute path to file to read'),
});

const listDirSchema = z.object({
    path: z.string().describe('Absolute path to directory to list'),
});

const gitStatusSchema = z.object({});

const gitLogSchema = z.object({
    limit: z.number().optional().default(5).describe('Maximum number of commits to return'),
});

// Export tools as a ToolSet using AI SDK v5 format (inputSchema instead of parameters)
export const mockTools = {
    read_file: {
        description: 'Read the contents of a file',
        inputSchema: readFileSchema,
        execute: async ({ path }: z.infer<typeof readFileSchema>, _context?: any) => {
            // Mock: Simulate reading a file with realistic latency
            await new Promise(resolve => setTimeout(resolve, 100));
            return `// Mock content for ${path}\nexport default function example() {}`;
        },
    },

    list_dir: {
        description: 'List contents of a directory',
        inputSchema: listDirSchema,
        execute: async ({ path }: z.infer<typeof listDirSchema>, _context?: any) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            // Use path in output to avoid unused variable warning
            const prefix = path.endsWith('/') ? path : path + '/';
            return JSON.stringify([`${prefix}README.md`, `${prefix}package.json`, `${prefix}src/`]);
        },
    },

    git_status: {
        description: 'Get current git repository status',
        inputSchema: gitStatusSchema,
        execute: async (_args: any, _context?: any) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return JSON.stringify({ branch: "main", uncommitted: 2 });
        },
    },

    git_log: {
        description: 'Get recent git commits',
        inputSchema: gitLogSchema,
        execute: async ({ limit = 5 }: z.infer<typeof gitLogSchema>, _context?: any) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const commits = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
                hash: `abc${123 + i}`,
                message: `feat: commit ${i + 1}`,
                date: "2025-12-20"
            }));
            return JSON.stringify(commits);
        },
    },
};
