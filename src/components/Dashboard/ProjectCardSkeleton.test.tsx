import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';

describe('ProjectCardSkeleton', () => {
    it('should render skeleton with correct structure', () => {
        render(<ProjectCardSkeleton />);

        // Should have a card-like container
        const skeleton = screen.getByTestId('project-card-skeleton');
        expect(skeleton).toBeInTheDocument();
    });

    it('should match ProjectCard dimensions (~120px height)', () => {
        const { container } = render(<ProjectCardSkeleton />);
        const skeleton = container.firstChild as HTMLElement;

        // Should have similar padding to collapsed ProjectCard
        expect(skeleton).toHaveClass('p-4'); // Same padding as ProjectCard
        expect(skeleton).toHaveClass('overflow-hidden'); // Same overflow as ProjectCard

        // Verify structural elements that contribute to height
        const flexContainer = skeleton.querySelector('.flex.items-start');
        expect(flexContainer).toBeInTheDocument();
    });

    it('should have placeholders for title, badge, and stats', () => {
        render(<ProjectCardSkeleton />);

        // Should have multiple skeleton elements for different parts
        const skeletons = screen.getAllByRole('generic', { hidden: true });
        expect(skeletons.length).toBeGreaterThan(2); // At least title, badge, stats
    });

    it('should use shadcn Skeleton component', () => {
        const { container } = render(<ProjectCardSkeleton />);

        // Should have skeleton animation class
        const skeletonElements = container.querySelectorAll('[class*="animate"]');
        expect(skeletonElements.length).toBeGreaterThan(0);
    });
});
