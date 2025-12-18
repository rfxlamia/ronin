import { useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '@/stores/projectStore';
import { useWindowSize } from '@/hooks/useWindowSize';
import type { Project } from '@/types/project';
import { EmptyState } from '@/components/Dashboard/EmptyState';
import { DashboardGrid } from '@/components/Dashboard/DashboardGrid';
import { ProjectCardSkeleton } from '@/components/Dashboard/ProjectCardSkeleton';

export function Dashboard() {
    const projects = useProjectStore((state) => state.projects);
    const setProjects = useProjectStore((state) => state.setProjects);
    const setLoading = useProjectStore((state) => state.setLoading);
    const setError = useProjectStore((state) => state.setError);
    const isLoading = useProjectStore((state) => state.isLoading);
    const { width } = useWindowSize();

    // Calculate number of skeleton cards based on window width
    const skeletonCount = useMemo(() => {
        const columns = width < 900 ? 1 : width < 1200 ? 2 : 3;
        return columns * 3; // 3 rows of skeletons
    }, [width]);

    // Fetch projects from database on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const fetchedProjects = await invoke<Project[]>('get_projects');
                setProjects(fetchedProjects);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                setError(errorMessage);
            }
        };

        fetchProjects();
    }, [setProjects, setLoading, setError]);

    if (isLoading) {
        return (
            <div className="p-8">
                <h2 className="text-3xl font-serif font-bold mb-4">Dashboard</h2>
                <p className="text-muted-foreground mb-6">Loading your projects...</p>

                <div className="grid gap-4" style={{
                    gridTemplateColumns: width < 900 ? '1fr' : width < 1200 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
                }}>
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                        <ProjectCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col">
            {projects.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <h2 className="text-3xl font-serif font-bold mb-4">Dashboard</h2>
                    <p className="text-muted-foreground mb-6">
                        Your projects ({projects.length})
                    </p>

                    <div className="flex-1 min-h-0">
                        <DashboardGrid projects={projects} />
                    </div>
                </>
            )}
        </div>
    );
}

