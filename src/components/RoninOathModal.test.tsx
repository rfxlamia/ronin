import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoninOathModal } from './RoninOathModal';

describe('RoninOathModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render modal when open is true', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        expect(screen.getByText('The Ronin Oath')).toBeInTheDocument();
        expect(screen.getByText('I am a ronin.')).toBeInTheDocument();
    });

    it('should not render modal when open is false', () => {
        render(<RoninOathModal open={false} onClose={mockOnClose} />);

        expect(screen.queryByText('The Ronin Oath')).not.toBeInTheDocument();
    });

    it('should display all oath text elements', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        expect(screen.getByText('I am a ronin.')).toBeInTheDocument();
        expect(screen.getByText('Masterless')).toBeInTheDocument();
        expect(screen.getByText('rudderless')).toBeInTheDocument();
        expect(screen.getByText('documentation')).toBeInTheDocument();
        expect(screen.getByText('teacher')).toBeInTheDocument();
        expect(screen.getByText('without dread')).toBeInTheDocument();
        expect(screen.getByText('浪人之道')).toBeInTheDocument();
    });

    it('should call onClose when Continue button is clicked', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        const continueButton = screen.getByRole('button', { name: 'Continue' });
        fireEvent.click(continueButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have Continue button with correct styling classes', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        const continueButton = screen.getByRole('button', { name: 'Continue' });
        expect(continueButton).toHaveClass('bg-ronin-brass');
        expect(continueButton).toHaveClass('font-serif');
    });

    it('should display illustration image with fallback', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        const illustration = screen.getByAltText('Ronin standing with purpose');
        expect(illustration).toBeInTheDocument();
        expect(illustration).toHaveAttribute('src', '/assets/philosophy/ronin-oath-illustration.svg');
    });

    it('should show placeholder when image fails to load', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        const illustration = screen.getByAltText('Ronin standing with purpose');
        fireEvent.error(illustration);

        expect(screen.getByText('[Ronin Illustration]')).toBeInTheDocument();
    });

    it('should apply serif font to title', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        const title = screen.getByText('The Ronin Oath');
        expect(title).toHaveClass('font-serif');
    });

    it('should apply serif font to emphasized phrases', () => {
        render(<RoninOathModal open={true} onClose={mockOnClose} />);

        // Check key emphasized words have serif font
        expect(screen.getByText('I am a ronin.')).toHaveClass('font-serif');
        expect(screen.getByText('rudderless')).toHaveClass('font-serif');
        expect(screen.getByText('documentation')).toHaveClass('font-serif');
    });
});
