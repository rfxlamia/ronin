import { create } from 'zustand';

export type DevlogMode = 'append' | 'edit';

interface CursorPosition {
  line: number;
  column: number;
}

interface DevlogStore {
  // State
  isOpen: boolean;
  mode: DevlogMode;
  activeProjectId: number | null;
  activeProjectPath: string | null;
  content: string;
  fileMtime: number;
  hasUnsavedChanges: boolean;
  conflictDetected: boolean;
  isSaving: boolean;
  cursorPosition: CursorPosition;

  // Actions
  open: (projectId: number, projectPath: string) => void;
  close: () => void;
  setMode: (mode: DevlogMode) => void;
  setActiveProject: (projectId: number, projectPath: string) => void;
  setContent: (content: string) => void;
  setFileMtime: (mtime: number) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setConflictDetected: (detected: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setCursorPosition: (position: CursorPosition) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  mode: 'append' as DevlogMode,
  activeProjectId: null as number | null,
  activeProjectPath: null as string | null,
  content: '',
  fileMtime: 0,
  hasUnsavedChanges: false,
  conflictDetected: false,
  isSaving: false,
  cursorPosition: { line: 1, column: 1 } as CursorPosition,
};

export const useDevlogStore = create<DevlogStore>((set) => ({
  ...initialState,

  open: (projectId, projectPath) =>
    set({
      isOpen: true,
      activeProjectId: projectId,
      activeProjectPath: projectPath,
      content: '',
      mode: 'append',
      hasUnsavedChanges: false,
      conflictDetected: false,
    }),

  close: () =>
    set({
      isOpen: false,
      content: '',
      hasUnsavedChanges: false,
      conflictDetected: false,
    }),

  setMode: (mode) => set({ mode }),

  setActiveProject: (projectId, projectPath) =>
    set({
      activeProjectId: projectId,
      activeProjectPath: projectPath,
      content: '',
      hasUnsavedChanges: false,
    }),

  setContent: (content) =>
    set({
      content,
      hasUnsavedChanges: true,
    }),

  setFileMtime: (fileMtime) => set({ fileMtime }),

  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

  setConflictDetected: (conflictDetected) => set({ conflictDetected }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setCursorPosition: (cursorPosition) => set({ cursorPosition }),

  reset: () => set(initialState),
}));
