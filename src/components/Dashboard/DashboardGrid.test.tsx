import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardGrid } from './DashboardGrid';
import type { Project } from '@/types/project';

// Mock useWindowSize hook
vi.mock('@/hooks/useWindowSize', () => ({
    useWindowSize: vi.fn(() => ({ width: 1024, height: 768 })),
}));

describe('DashboardGrid', () => {
    const mockProjects: Project[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Project ${i}`,
        path: `/path/to/project-${i}`,
        type: 'git' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render projects in a grid', () => {
        const { container } = render(<DashboardGrid projects={mockProjects} />);

        // Should render grid container
        const gridContainer = container.querySelector('[data-testid="dashboard-grid"]');
        expect(gridContainer).toBeInTheDocument();
    });

    it('should show empty state when no projects', () => {
        render(<DashboardGrid projects={[]} />);

        // Should show empty state component
        expect(screen.getByText(/your journey begins/i)).toBeInTheDocument();
    });

    it('should use 2 columns for medium width (1024px)', async () => {
        const { useWindowSize } = await import('@/hooks/useWindowSize');
        vi.mocked(useWindowSize).mockReturnValue({ width: 1024, height: 768 });

        const { container } = render(<DashboardGrid projects={mockProjects} />);

        // Should have grid with 2 columns (900-1200px range)
        const gridContainer = container.querySelector('[data-testid="dashboard-grid"]');
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
    });

    it('should use 1 column for small width (800px)', async () => {
        const { useWindowSize } = await import('@/hooks/useWindowSize');
        vi.mocked(useWindowSize).mockReturnValue({ width: 800, height: 600 });

        const { container } = render(<DashboardGrid projects={mockProjects} />);

        const gridContainer = container.querySelector('[data-testid="dashboard-grid"]');
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveStyle({ gridTemplateColumns: 'repeat(1, 1fr)' });
    });

    it('should use 3 columns for large width (1400px)', async () => {
        const { useWindowSize } = await import('@/hooks/useWindowSize');
        vi.mocked(useWindowSize).mockReturnValue({ width: 1400, height: 900 });

        const { container } = render(<DashboardGrid projects={mockProjects} />);

        const gridContainer = container.querySelector('[data-testid="dashboard-grid"]');
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
    });

    it('should virtualize rows for large datasets', () => {
        const largeProjectList: Project[] = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `Project ${i}`,
            path: `/path/to/project-${i}`,
            type: 'git' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));

        const { container } = render(<DashboardGrid projects={largeProjectList} />);

        // Should have virtualization container
        const virtualContainer = container.querySelector('[data-testid="dashboard-grid"]');
        expect(virtualContainer).toBeInTheDocument();

        // Should have relative positioned container for virtualization
        const relativeContainer = container.querySelector('[style*="position: relative"]');
        expect(relativeContainer).toBeInTheDocument();
    });
});
