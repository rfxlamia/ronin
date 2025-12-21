import { create } from 'zustand';

export type DevlogMode = 'append' | 'edit';
export type DevlogViewMode = 'edit' | 'history' | 'version';

export interface DevlogCommit {
  hash: string;
  date: string;
  author: string;
  message: string;
}

interface CursorPosition {
  line: number;
  column: number;
}

interface ExternalFileInfo {
  lineCount: number;
  userLineCount?: number;
}

interface DevlogStore {
  // State
  isOpen: boolean;
  mode: DevlogMode;
  activeProjectId: number | null;
  activeProjectPath: string | null;
  content: string;

  // Conflict Detection State
  lastKnownMtime: number | null;
  conflictDetected: boolean;
  conflictDialogOpen: boolean;
  lastSavedTimestamp: number | null;
  externalFileInfo: ExternalFileInfo | null;

  hasUnsavedChanges: boolean;
  isSaving: boolean;
  cursorPosition: CursorPosition;

  // History View State
  viewMode: DevlogViewMode;
  versionCache: Record<string, string>; // hash -> content
  selectedVersionHash: string | null;
  selectedVersionContent: string | null;

  // Actions
  open: (projectId: number, projectPath: string) => void;
  close: () => void;
  setMode: (mode: DevlogMode) => void;
  setActiveProject: (projectId: number, projectPath: string) => void;
  setContent: (content: string) => void;

  // Conflict Actions
  setLastKnownMtime: (mtime: number) => void;
  detectConflict: () => void;
  setConflictDetected: (detected: boolean) => void;
  setConflictDialogOpen: (open: boolean) => void;
  setLastSaved: (timestamp: number) => void;
  setExternalFileInfo: (info: ExternalFileInfo | null) => void;

  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setCursorPosition: (position: CursorPosition) => void;
  reset: () => void;

  // History Actions
  setViewMode: (mode: DevlogViewMode) => void;
  cacheVersion: (hash: string, content: string) => void;
  selectVersion: (hash: string | null) => void;
  setSelectedVersionContent: (content: string | null) => void;
  clearCache: () => void;
}

const initialState = {
  isOpen: false,
  mode: 'append' as DevlogMode,
  activeProjectId: null as number | null,
  activeProjectPath: null as string | null,
  content: '',

  lastKnownMtime: null as number | null,
  conflictDetected: false,
  conflictDialogOpen: false,
  lastSavedTimestamp: null as number | null,
  externalFileInfo: null as ExternalFileInfo | null,

  hasUnsavedChanges: false,
  isSaving: false,
  cursorPosition: { line: 1, column: 1 } as CursorPosition,

  viewMode: 'edit' as DevlogViewMode,
  versionCache: {} as Record<string, string>,
  selectedVersionHash: null as string | null,
  selectedVersionContent: null as string | null,
};

export const useDevlogStore = create<DevlogStore>((set) => ({
  ...initialState,

  open: (projectId, projectPath) =>
    set({
      ...initialState, // Reset everything on open
      isOpen: true,
      activeProjectId: projectId,
      activeProjectPath: projectPath,
      mode: 'append',
    }),

  close: () =>
    set({
      isOpen: false,
      content: '',
      hasUnsavedChanges: false,
      conflictDetected: false,
      conflictDialogOpen: false,
      viewMode: 'edit',
      versionCache: {}, // Clear cache on close
      selectedVersionHash: null,
      selectedVersionContent: null,
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

  setLastKnownMtime: (lastKnownMtime) => set({ lastKnownMtime }),

  detectConflict: () => set({ conflictDetected: true, conflictDialogOpen: true }),

  setConflictDetected: (conflictDetected) => set({ conflictDetected }),

  setConflictDialogOpen: (conflictDialogOpen) => set({ conflictDialogOpen }),

  setLastSaved: (lastSavedTimestamp) => set({ lastSavedTimestamp }),

  setExternalFileInfo: (externalFileInfo) => set({ externalFileInfo }),

  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setCursorPosition: (cursorPosition) => set({ cursorPosition }),

  reset: () => set(initialState),

  // History Actions
  setViewMode: (viewMode) => set({ viewMode }),

  cacheVersion: (hash, content) => set((state) => {
    const newCache = { ...state.versionCache, [hash]: content };
    // LRU-like eviction (simple implementation: remove oldest key)
    const keys = Object.keys(newCache);
    if (keys.length > 10) {
      const keyToRemove = keys[0];
      delete newCache[keyToRemove];
    }
    return { versionCache: newCache };
  }),

  selectVersion: (selectedVersionHash) => set({ selectedVersionHash }),

  setSelectedVersionContent: (selectedVersionContent) => set({ selectedVersionContent }),

  clearCache: () => set({ versionCache: {} }),
}));