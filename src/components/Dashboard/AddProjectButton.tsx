import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types/project';
import { FolderPlus } from 'lucide-react';

export function AddProjectButton() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const addProject = useProjectStore((state) => state.addProject);
    const setError = useProjectStore((state) => state.setError);

    const handleAddProject = async () => {
        try {
            setIsProcessing(true);
            setError(null);
            setLocalError(null);

            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: 'Select Project Folder',
            });

            if (!selectedPath) {
                setIsProcessing(false);
                return;
            }

            const project = await invoke<Project>('add_project', {
                path: selectedPath,
            });

            addProject(project);
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

