import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore, useFilteredProjects } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWindowSize } from '@/hooks/useWindowSize';
import type { Project } from '@/types/project';
import { EmptyState } from '@/components/Dashboard/EmptyState';
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader';
import { DashboardGrid } from '@/components/Dashboard/DashboardGrid';
import { ProjectCardSkeleton } from '@/components/Dashboard/ProjectCardSkeleton';
import { RoninOathModal } from '@/components/RoninOathModal';

export function Dashboard() {
    const projects = useProjectStore((state) => state.projects);
    const filteredProjects = useFilteredProjects(); // Use filtered projects from selector
    const setProjects = useProjectStore((state) => state.setProjects);
    const setLoading = useProjectStore((state) => state.setLoading);
    const setError = useProjectStore((state) => state.setError);
    const isLoading = useProjectStore((state) => state.isLoading);
    const { width } = useWindowSize();

    const oathShown = useSettingsStore((state) => state.oathShown);
    const checkOathStatus = useSettingsStore((state) => state.checkOathStatus);
    const markOathShown = useSettingsStore((state) => state.markOathShown);
    const [showOathModal, setShowOathModal] = useState(false);

    // Calculate number of skeleton cards based on window width
    const skeletonCount = useMemo(() => {
        const columns = width < 900 ? 1 : width < 1200 ? 2 : 3;
        return columns * 3; // 3 rows of skeletons
    }, [width]);

    // Load oath status on mount
    useEffect(() => {
        checkOathStatus();
    }, [checkOathStatus]);

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

    // Oath modal trigger logic: Show modal after first project is added
    useEffect(() => {
        if (projects.length === 1 && !oathShown && !isLoading) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const delay = prefersReducedMotion ? 0 : 500;

            const timer = setTimeout(() => {
                setShowOathModal(true);
            }, delay);

            // Cleanup timer on unmount
            return () => clearTimeout(timer);
        }
    }, [projects.length, oathShown, isLoading]);

    const handleOathClose = async () => {
        await markOathShown();
        setShowOathModal(false);
    };

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

                    {/* Dashboard Header with search and filters */}
                    <DashboardHeader />

                    {/* Show message when search/filter yields no results */}
                    {filteredProjects.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">
                            No projects found matching your search or filter.
                        </p>
                    ) : (
                        <div className="flex-1 min-h-0">
                            <DashboardGrid projects={filteredProjects} />
                        </div>
                    )}
                </>
            )}

            {/* Ronin Oath Modal */}
            <RoninOathModal open={showOathModal} onClose={handleOathClose} />
        </div>
    );
}

