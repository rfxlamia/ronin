import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
    it('renders the welcome heading', () => {
        render(<EmptyState />);
        expect(screen.getByText('Your journey begins')).toBeInTheDocument();
    });

    it('renders explanatory text', () => {
        render(<EmptyState />);
        expect(screen.getByText(/Add your first project/i)).toBeInTheDocument();
    });

    it('renders the Add Project button', () => {
        render(<EmptyState />);
        expect(screen.getByText('Add Project')).toBeInTheDocument();
    });

    it('renders illustration image with proper alt text', () => {
        render(<EmptyState />);
        const image = screen.getByAltText('Ronin standing at the beginning of a path');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', '/assets/empty-states/ronin-empty-welcome.svg');
    });

    it('uses serif font for heading', () => {
        render(<EmptyState />);
        const heading = screen.getByText('Your journey begins');
        expect(heading).toHaveClass('font-serif');
    });
});
