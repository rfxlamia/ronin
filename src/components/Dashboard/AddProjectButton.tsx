import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { FolderPlus } from 'lucide-react';

export function AddProjectButton() {
    const [isProcessing, setIsProcessing] = useState(false);
    const addProject = useProjectStore((state) => state.addProject);
    const setError = useProjectStore((state) => state.setError);

    const handleAddProject = async () => {
        try {
            setIsProcessing(true);
            setError(null);

            // Open native folder picker
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: 'Select Project Folder',
            });

            // User cancelled
            if (!selectedPath) {
                setIsProcessing(false);
                return;
            }

            // Call Rust backend to add project
            const project = await invoke<Project>('add_project', {
                path: selectedPath,
            });

            // Update store with new project
            addProject(project);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(errorMessage);
            console.error('Failed to add project:', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Button
            size="lg"
            className="font-serif text-lg"
            onClick={handleAddProject}
            disabled={isProcessing}
        >
            <FolderPlus className="mr-2 h-5 w-5" />
            {isProcessing ? 'Adding...' : 'Add Project'}
        </Button>
    );
}
