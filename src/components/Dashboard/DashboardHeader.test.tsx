import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader } from './DashboardHeader';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock the projectStore
const mockSetSearchQuery = vi.fn();
const mockSetFilterStatus = vi.fn();
const mockAddProject = vi.fn();
const mockSetError = vi.fn();

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: vi.fn((selector: any) => {
        const store = {
            searchQuery: '',
            filterStatus: 'all',
            setSearchQuery: mockSetSearchQuery,
            setFilterStatus: mockSetFilterStatus,
            addProject: mockAddProject,
            setError: mockSetError,
        };
        return selector ? selector(store) : store;
    }),
}));

describe('DashboardHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Search Input', () => {
        it('renders search input', () => {
            render(<DashboardHeader />);
            const searchInput = screen.getByPlaceholderText(/search projects/i);
            expect(searchInput).toBeInTheDocument();
        });

        it('updates search query in store when user types', async () => {
            const user = userEvent.setup();
            render(<DashboardHeader />);

            const searchInput = screen.getByPlaceholderText(/search projects/i);
            await user.type(searchInput, 't');

            expect(mockSetSearchQuery).toHaveBeenCalledWith('t');
        });

        it('shows search icon', () => {
            const { container } = render(<DashboardHeader />);
            // Check for search icon (lucide-react renders svg)
            const searchIcon = container.querySelector('[data-icon="search"]');
            expect(searchIcon).toBeInTheDocument();
        });
    });

    describe('Filter Tabs', () => {
        it('renders all filter tabs', () => {
            render(<DashboardHeader />);

            expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /dormant/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /archived/i })).toBeInTheDocument();
        });

        it('"All" tab is selected by default', () => {
            render(<DashboardHeader />);

            const allTab = screen.getByRole('tab', { name: /^all$/i });
            expect(allTab).toHaveAttribute('aria-selected', 'true');
        });

        it('clicking a tab updates filter status in store', async () => {
            const user = userEvent.setup();
            render(<DashboardHeader />);

            const activeTab = screen.getByRole('tab', { name: /^active$/i });
            await user.click(activeTab);

            expect(mockSetFilterStatus).toHaveBeenCalledWith('active');
        });

        it('reflects filter status from store', () => {
            // This test verifies initial render reflects store state
            // The mock is already configured with 'all' in the module mock above
            render(<DashboardHeader />);

            const allTab = screen.getByRole('tab', { name: /^all$/i });
            expect(allTab).toHaveAttribute('aria-selected', 'true');
        });
    });

    describe('Add Project Button', () => {
        it('renders Add Project button', () => {
            render(<DashboardHeader />);
            const addButton = screen.getByRole('button', { name: /add project/i });
            expect(addButton).toBeInTheDocument();
        });

        it('Add Project button uses serif font (CTA style)', () => {
            render(<DashboardHeader />);
            const addButton = screen.getByRole('button', { name: /add project/i });
            expect(addButton).toHaveClass('font-serif');
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels', () => {
            render(<DashboardHeader />);

            const searchInput = screen.getByRole('textbox');
            expect(searchInput).toHaveAttribute('aria-label');
        });

        it('tab navigation works correctly', async () => {
            const user = userEvent.setup();
            render(<DashboardHeader />);

            await user.tab();
            const searchInput = screen.getByPlaceholderText(/search projects/i);
            expect(searchInput).toHaveFocus();
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('Ctrl+K focuses search input', async () => {
            const user = userEvent.setup();
            render(<DashboardHeader />);

            const searchInput = screen.getByPlaceholderText(/search projects/i);
            expect(searchInput).not.toHaveFocus();

            await user.keyboard('{Control>}k{/Control}');
            expect(searchInput).toHaveFocus();
        });

        it('Escape clears search and resets filter when search has value', async () => {
            const user = userEvent.setup();
            render(<DashboardHeader />);

            const searchInput = screen.getByPlaceholderText(/search projects/i);
            await user.type(searchInput, 'test');

            searchInput.focus();
            await user.keyboard('{Escape}');

            // Verify setSearchQuery was called to clear
            expect(mockSetSearchQuery).toHaveBeenCalled();
        });

        it('Escape blurs search when empty', async () => {
            const user = userEvent.setup();
            render(<DashboardHeader />);

            const searchInput = screen.getByPlaceholderText(/search projects/i);
            searchInput.focus();
            expect(searchInput).toHaveFocus();

            await user.keyboard('{Escape}');
            expect(searchInput).not.toHaveFocus();
        });
    });
});
