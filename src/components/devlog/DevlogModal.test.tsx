import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevlogModal } from './DevlogModal';
import { useDevlogStore } from '@/stores/devlogStore';
import { useProjectStore } from '@/stores/projectStore';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockImplementation((command: string) => {
        if (command === 'get_devlog_with_mtime') {
            return Promise.resolve({ content: '', mtime: 0 });
        }
        if (command === 'get_devlog_mtime') {
            return Promise.resolve(0);
        }
        return Promise.resolve();
    }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

// Mock the stores
vi.mock('@/stores/devlogStore', () => ({
    useDevlogStore: vi.fn(),
}));

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: vi.fn(),
}));

// Mock formatDistanceToNow
vi.mock('date-fns', () => ({
    formatDistanceToNow: () => '5 minutes ago',
}));

describe('DevlogModal', () => {
    const mockClose = vi.fn();
    const mockSetMode = vi.fn();
    const mockSetActiveProject = vi.fn();
    const mockSetContent = vi.fn();
    const mockSetLastKnownMtime = vi.fn();
    const mockSetHasUnsavedChanges = vi.fn();
    const mockSetConflictDetected = vi.fn();
    const mockSetConflictDialogOpen = vi.fn();
    const mockSetIsSaving = vi.fn();
    const mockSetCursorPosition = vi.fn();
    const mockDetectConflict = vi.fn();
    const mockSetLastSaved = vi.fn();
    const mockSetExternalFileInfo = vi.fn();

    const createMockDevlogState = (overrides = {}) => ({
        isOpen: true,
        mode: 'append' as const,
        activeProjectId: 1,
        activeProjectPath: '/path/to/project',
        content: '',
        lastKnownMtime: 0,
        hasUnsavedChanges: false,
        conflictDetected: false,
        conflictDialogOpen: false,
        lastSavedTimestamp: null,
        externalFileInfo: null,
        isSaving: false,
        cursorPosition: { line: 1, column: 1 },
        close: mockClose,
        setMode: mockSetMode,
        setActiveProject: mockSetActiveProject,
        setContent: mockSetContent,
        setLastKnownMtime: mockSetLastKnownMtime,
        setHasUnsavedChanges: mockSetHasUnsavedChanges,
        setConflictDetected: mockSetConflictDetected,
        setConflictDialogOpen: mockSetConflictDialogOpen,
        setIsSaving: mockSetIsSaving,
        setCursorPosition: mockSetCursorPosition,
        detectConflict: mockDetectConflict,
        setLastSaved: mockSetLastSaved,
        setExternalFileInfo: mockSetExternalFileInfo,
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

    it('should show conflict indicator when conflict detected', () => {
        const mockState = createMockDevlogState({ conflictDetected: true });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText('⚠️ Auto-save paused (Conflict)')).toBeInTheDocument();
    });

    it('should show last saved timestamp when available', () => {
        const mockState = createMockDevlogState({ lastSavedTimestamp: Date.now() });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        expect(screen.getByText('Last saved: 5 minutes ago')).toBeInTheDocument();
    });

    it('should disable save button when conflict is detected', () => {
        const mockState = createMockDevlogState({ content: 'Some content', conflictDetected: true });
        (useDevlogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
            return selector(mockState);
        });

        render(<DevlogModal />);

        const saveButton = screen.getByText('Add Entry');
        expect(saveButton).toBeDisabled();
    });

    // ... keep other basic rendering tests ...
});