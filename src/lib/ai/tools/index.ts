import { invoke } from '@tauri-apps/api/core';
import {
    readFileSchema,
    listDirSchema,
    gitStatusSchema,
    gitLogSchema
} from './schemas';
import { RawTool } from './wrapper';
import { mockTools } from './mock';
import { useProjectStore } from '../../../stores/projectStore';

export * from './schemas';
export { mockTools };

// Helper to resolve project path
function getProjectPath(projectId: string): string {
    const id = parseInt(projectId);
    const project = useProjectStore.getState().projects.find(p => p.id === id);
    if (!project) {
        throw new Error(`Project ${projectId} not found in store`);
    }
    return project.path;
}

// Real tools implementation
export const realTools: Record<string, RawTool<any>> = {
    read_file: {
        description: 'Read the contents of a file',
        parameters: readFileSchema,
        execute: async ({ path }, context) => {
            try {
                const projectPath = getProjectPath(context.projectId);
                return await invoke('read_file', {
                    project_path: projectPath,
                    file_path: path
                });
            } catch (error: any) {
                // Convert Tauri string error to JS Error
                throw new Error(String(error));
            }
        }
    },

    list_dir: {
        description: 'List contents of a directory',
        parameters: listDirSchema,
        execute: async ({ path }, context) => {
            try {
                const projectPath = getProjectPath(context.projectId);
                return await invoke('list_dir', {
                    project_path: projectPath,
                    dir_path: path
                });
            } catch (error: any) {
                throw new Error(String(error));
            }
        }
    },

    git_status: {
        description: 'Get current git repository status',
        parameters: gitStatusSchema,
        execute: async (_, context) => {
            try {
                const projectPath = getProjectPath(context.projectId);
                return await invoke('git_status', {
                    project_path: projectPath
                });
            } catch (error: any) {
                throw new Error(String(error));
            }
        }
    },

    git_log: {
        description: 'Get recent git commits',
        parameters: gitLogSchema,
        execute: async ({ limit = 5 }, context) => {
            try {
                const projectPath = getProjectPath(context.projectId);
                return await invoke('git_log', {
                    project_path: projectPath,
                    limit
                });
            } catch (error: any) {
                throw new Error(String(error));
            }
        }
    }
};
