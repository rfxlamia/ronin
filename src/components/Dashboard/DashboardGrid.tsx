import { useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useWindowSize } from '@/hooks/useWindowSize';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from './EmptyState';
import type { Project } from '@/types/project';

interface DashboardGridProps {
    projects: Project[];
}

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 20;

/**
 * Responsive virtualized grid for displaying projects
 * Uses row-chunking pattern to virtualize a 2D grid with @tanstack/react-virtual
 * Only enables virtualization for 20+ projects to avoid blinking issues
 */
export function DashboardGrid({ projects }: DashboardGridProps) {
    const { width } = useWindowSize();
    const parentRef = useRef<HTMLDivElement>(null);

    // Calculate number of columns based on window width
    const numColumns = useMemo(() => {
        if (width < 900) return 1;
        if (width < 1200) return 2;
        return 3;
    }, [width]);

    // Chunk projects into rows
    const rows = useMemo(() => {
        const result: Project[][] = [];
        for (let i = 0; i < projects.length; i += numColumns) {
            result.push(projects.slice(i, i + numColumns));
        }
        return result;
    }, [projects, numColumns]);

    // Only use virtualization for large project counts
    const useVirtualization = projects.length >= VIRTUALIZATION_THRESHOLD;

    // Virtualize rows (only used when threshold is met)
    const rowVirtualizer = useVirtualizer({
        count: useVirtualization ? rows.length : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 140,
        overscan: 2,
        enabled: useVirtualization,
    });

    // Callback for ProjectCard expansion changes - triggers virtualizer re-measurement
    const handleExpandChange = useCallback(() => {
        if (useVirtualization) {
            // Wait for animation to complete, then force re-measurement
            setTimeout(() => {
                rowVirtualizer.measure();
            }, 250); // Match collapsible animation duration
        }
    }, [useVirtualization, rowVirtualizer]);

    // Show empty state if no projects
    if (projects.length === 0) {
        return <EmptyState />;
    }

    // Simple grid for small project counts (no virtualization)
    if (!useVirtualization) {
        return (
            <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}
                data-testid="dashboard-grid"
            >
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        );
    }

    // Virtualized grid for large project counts
    return (
        <div
            ref={parentRef}
            className="h-full overflow-auto"
            data-testid="dashboard-grid"
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div
                                className="grid gap-4"
                                style={{
                                    gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
                                }}
                            >
                                {row.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onExpandChange={handleExpandChange}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

