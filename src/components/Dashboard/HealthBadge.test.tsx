import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from './HealthBadge';

describe('HealthBadge', () => {
    it('renders Active status with fire emoji', () => {
        render(<HealthBadge status="Active" />);
        expect(screen.getByText(/🔥/)).toBeInTheDocument();
        expect(screen.getByText(/Active/i)).toBeInTheDocument();
    });

    it('renders Dormant status with sleeping emoji', () => {
        render(<HealthBadge status="Dormant" />);
        expect(screen.getByText(/😴/)).toBeInTheDocument();
        expect(screen.getByText(/Dormant/i)).toBeInTheDocument();
    });

    it('renders Stuck status with warning emoji', () => {
        render(<HealthBadge status="Stuck" />);
        expect(screen.getByText(/⚠️/)).toBeInTheDocument();
        expect(screen.getByText(/Stuck/i)).toBeInTheDocument();
    });

    it('renders Attention status with pin emoji', () => {
        render(<HealthBadge status="Attention" />);
        expect(screen.getByText(/📌/)).toBeInTheDocument();
        expect(screen.getByText(/Attention/i)).toBeInTheDocument();
    });

    it('includes text label for accessibility (not emoji-only)', () => {
        render(<HealthBadge status="Active" />);
        const textContent = screen.getByText(/Active/i);
        expect(textContent).toBeInTheDocument();
        // Verify it's not just the emoji
        expect(textContent.textContent).toContain('Active');
    });

    it('applies custom className when provided', () => {
        const { container } = render(<HealthBadge status="Active" className="custom-class" />);
        const badge = container.querySelector('.custom-class');
        expect(badge).toBeInTheDocument();
    });

    it('has proper aria-label for screen readers', () => {
        render(<HealthBadge status="Active" />);
        const badge = screen.getByLabelText(/Project status: Active/i);
        expect(badge).toBeInTheDocument();
    });
});
