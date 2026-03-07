import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSidebar } from './SettingsSidebar';

const mockSections = [
  { id: 'ai-provider', label: 'AI Provider' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'card-display', label: 'Card Display' },
];

describe('SettingsSidebar', () => {
  it('renders all section labels', () => {
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="ai-provider"
        onSectionClick={vi.fn()}
      />
    );

    expect(screen.getByText('AI Provider')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Card Display')).toBeInTheDocument();
  });

  it('highlights the active section', () => {
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="appearance"
        onSectionClick={vi.fn()}
      />
    );

    const activeItem = screen.getByText('Appearance').closest('button');
    expect(activeItem?.className).toMatch(/border-l-2/);
    expect(activeItem?.className).toMatch(/font-medium/);
  });

  it('calls onSectionClick with section id when clicked', () => {
    const onClick = vi.fn();
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="ai-provider"
        onSectionClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('Card Display'));
    expect(onClick).toHaveBeenCalledWith('card-display');
  });

  it('shows title attribute for tooltip on each item', () => {
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="ai-provider"
        onSectionClick={vi.fn()}
      />
    );

    const item = screen.getByText('AI Provider').closest('button');
    expect(item).toHaveAttribute('title', 'AI Provider');
  });
});
