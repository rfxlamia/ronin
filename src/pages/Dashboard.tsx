import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { EmptyState } from '@/components/Dashboard/EmptyState';
import { ProjectCard } from '@/components/Dashboard/ProjectCard';

export function Dashboard() {
    const projects = useProjectStore((state) => state.projects);
    const setProjects = useProjectStore((state) => state.setProjects);
    const setLoading = useProjectStore((state) => state.setLoading);
    const setError = useProjectStore((state) => state.setError);
    const isLoading = useProjectStore((state) => state.isLoading);

    // Fetch projects from database on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                console.log('[Dashboard] Fetching projects from database...');
                const fetchedProjects = await invoke<Project[]>('get_projects');
                console.log('[Dashboard] Fetched projects:', fetchedProjects.length);
                setProjects(fetchedProjects);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('[Dashboard] Failed to fetch projects:', errorMessage);
                setError(errorMessage);
            }
        };

        fetchProjects();
    }, [setProjects, setLoading, setError]);

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">Loading projects...</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            {projects.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <h2 className="text-3xl font-serif font-bold mb-4">Dashboard</h2>
                    <p className="text-muted-foreground mb-6">
                        Your projects ({projects.length})
                    </p>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

