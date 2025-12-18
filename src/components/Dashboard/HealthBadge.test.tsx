import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from './HealthBadge';

describe('HealthBadge', () => {
    it('renders Active status with fire emoji', () => {
        render(<HealthBadge status="active" />);
        expect(screen.getByText(/🔥/)).toBeInTheDocument();
        expect(screen.getByText(/Active/i)).toBeInTheDocument();
    });

    it('renders Dormant status with sleeping emoji', () => {
        render(<HealthBadge status="dormant" />);
        expect(screen.getByText(/😴/)).toBeInTheDocument();
        expect(screen.getByText(/Dormant/i)).toBeInTheDocument();
    });

    it('renders Stuck status with warning emoji', () => {
        render(<HealthBadge status="stuck" />);
        expect(screen.getByText(/⚠️/)).toBeInTheDocument();
        expect(screen.getByText(/Stuck/i)).toBeInTheDocument();
    });

    it('renders Attention status with pin emoji', () => {
        render(<HealthBadge status="attention" />);
        expect(screen.getByText(/📌/)).toBeInTheDocument();
        expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument(); // Label is "Needs Attention"
    });

    it('includes text label for accessibility (not emoji-only)', () => {
        render(<HealthBadge status="active" />);
        const textContent = screen.getByText(/Active/i);
        expect(textContent).toBeInTheDocument();
        // Verify it's not just the emoji
        expect(textContent.textContent).toContain('Active');
    });

    it('applies custom className when provided', () => {
        const { container } = render(<HealthBadge status="active" className="custom-class" />);
        const badge = container.querySelector('.custom-class');
        expect(badge).toBeInTheDocument();
    });

    it('has proper aria-label for screen readers', () => {
        render(<HealthBadge status="active" />);
        // status is lowercase 'active', aria-label is `Project status: active`
        // Validation regex /Project status: Active/i matches.
        const badge = screen.getByLabelText(/Project status: active/i);
        expect(badge).toBeInTheDocument();
    });
});
