import { useMemo } from 'react';
import { useWindowSize } from '@/hooks/useWindowSize';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from './EmptyState';
import type { Project } from '@/types/project';

interface DashboardGridProps {
    projects: Project[];
}

/**
 * Simple responsive grid for displaying projects
 * Uses CSS Grid - no virtualization for simplicity and performance
 */
export function DashboardGrid({ projects }: DashboardGridProps) {
    const { width } = useWindowSize();

    // Calculate number of columns based on window width
    const numColumns = useMemo(() => {
        if (width < 900) return 1;
        if (width < 1200) return 2;
        return 3;
    }, [width]);

    // Show empty state if no projects
    if (projects.length === 0) {
        return <EmptyState />;
    }

    return (
        <div
            className="grid gap-5 p-1"
            style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}
            data-testid="dashboard-grid"
        >
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
    );
}
