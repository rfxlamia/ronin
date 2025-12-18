import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { FolderPlus } from 'lucide-react';

export function AddProjectButton() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const addProject = useProjectStore((state) => state.addProject);
    const setError = useProjectStore((state) => state.setError);
    const projects = useProjectStore((state) => state.projects);

    const handleAddProject = async () => {
        try {
            setIsProcessing(true);
            setError(null);
            setLocalError(null);
            console.log('[AddProject] Starting add project flow...');
            console.log('[AddProject] Current projects in store:', projects.length);

            // Open native folder picker
            console.log('[AddProject] Opening folder picker...');
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: 'Select Project Folder',
            });

            // User cancelled
            if (!selectedPath) {
                console.log('[AddProject] User cancelled folder picker');
                setIsProcessing(false);
                return;
            }

            console.log('[AddProject] Selected path:', selectedPath);

            // Call Rust backend to add project
            console.log('[AddProject] Calling Rust add_project command...');
            const project = await invoke<Project>('add_project', {
                path: selectedPath,
            });

            console.log('[AddProject] Received project from backend:', project);

            // Update store with new project
            console.log('[AddProject] Adding project to store...');
            addProject(project);
            console.log('[AddProject] Project added successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(errorMessage);
            setLocalError(errorMessage);
            console.error('[AddProject] ERROR:', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <Button
                size="lg"
                className="font-serif text-lg"
                onClick={handleAddProject}
                disabled={isProcessing}
            >
                <FolderPlus className="mr-2 h-5 w-5" />
                {isProcessing ? 'Adding...' : 'Add Project'}
            </Button>
            {localError && (
                <p className="text-sm text-destructive font-mono">
                    Error: {localError}
                </p>
            )}
        </div>
    );
}

