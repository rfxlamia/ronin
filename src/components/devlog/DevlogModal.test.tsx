import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevlogModal } from './DevlogModal';
import { useDevlogStore } from '@/stores/devlogStore';
import { useProjectStore } from '@/stores/projectStore';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock the stores
vi.mock('@/stores/devlogStore', () => ({
    useDevlogStore: vi.fn(),
}));

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: vi.fn(),
}));

describe('DevlogModal', () => {
    const mockClose = vi.fn();
    const mockSetMode = vi.fn();
    const mockSetActiveProject = vi.fn();
    const mockSetContent = vi.fn();
    const mockSetFileMtime = vi.fn();
    const mockSetHasUnsavedChanges = vi.fn();
    const mockSetConflictDetected = vi.fn();
    const mockSetIsSaving = vi.fn();
    const mockSetCursorPosition = vi.fn();

    const createMockDevlogState = (overrides = {}) => ({
        isOpen: true,
        mode: 'append' as const,
        activeProjectId: 1,
        activeProjectPath: '/path/to/project',
        content: '',
        fileMtime: 0,
        hasUnsavedChanges: false,
        conflictDetected: false,
        isSaving: false,
        cursorPosition: { line: 1, column: 1 },
        close: mockClose,
        setMode: mockSetMode,
        setActiveProject: mockSetActiveProject,
        setContent: mockSetContent,
        setFileMtime: mockSetFileMtime,
        setHasUnsavedChanges: mockSetHasUnsavedChanges,
        setConflictDetected: mockSetConflictDetected,
        setIsSaving: mockSetIsSaving,
        setCursorPosition: mockSetCursorPosition,
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();

        (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            const state = {
                projects: [
                    { id: 1, name: 'Project 1', path: '/path/to/project1', isArchived: false },
                    { id: 2, name: 'Project 2', path: '/path/to/project2', isArchived: false },
                ],
            };
            return selector(state);
        });
    });

    it('should render modal when open', () => {
        const mockState = createMockDevlogState();
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText('DEVLOG Editor')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        const mockState = createMockDevlogState({ isOpen: false });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.queryByText('DEVLOG Editor')).not.toBeInTheDocument();
    });

    it('should show no projects message when no projects exist', () => {
        const mockState = createMockDevlogState();
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            const state = { projects: [] };
            return selector(state);
        });

        render(<DevlogModal />);

        expect(screen.getByText('No projects available.')).toBeInTheDocument();
    });

    it('should display append mode text by default', () => {
        const mockState = createMockDevlogState({ mode: 'append' });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText(/Quick Capture/)).toBeInTheDocument();
    });

    it('should display edit mode text when in edit mode', () => {
        const mockState = createMockDevlogState({ mode: 'edit' });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText(/Edit Mode: Full access/)).toBeInTheDocument();
    });

    it('should show unsaved indicator when content has unsaved changes', () => {
        const mockState = createMockDevlogState({ hasUnsavedChanges: true });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText('• Unsaved')).toBeInTheDocument();
    });

    it('should show conflict indicator when conflict detected', () => {
        const mockState = createMockDevlogState({ conflictDetected: true });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText('• File changed externally')).toBeInTheDocument();
    });

    it('should show keyboard shortcuts in footer', () => {
        const mockState = createMockDevlogState();
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText('Bold')).toBeInTheDocument();
        expect(screen.getByText('Italic')).toBeInTheDocument();
    });

    it('should show "Add Entry" button text in append mode', () => {
        const mockState = createMockDevlogState({ mode: 'append' });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByRole('button', { name: /Add Entry/i })).toBeInTheDocument();
    });

    it('should show "Save" button text in edit mode', () => {
        const mockState = createMockDevlogState({ mode: 'edit' });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
    });

    it('should disable save button when content is empty', () => {
        const mockState = createMockDevlogState({ content: '' });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        // Button is present and should have the disabled attribute
        const saveButton = screen.getByText('Add Entry');
        expect(saveButton).toBeDisabled();
    });

    it('should disable save button when conflict is detected', () => {
        const mockState = createMockDevlogState({ content: 'Some content', conflictDetected: true });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        // Button should be disabled when conflict is detected (append mode by default)
        const saveButton = screen.getByText('Add Entry');
        expect(saveButton).toBeDisabled();
    });

    it('should have edit mode toggle switch', () => {
        const mockState = createMockDevlogState();
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByRole('switch', { name: /Edit Mode/i })).toBeInTheDocument();
    });
});
