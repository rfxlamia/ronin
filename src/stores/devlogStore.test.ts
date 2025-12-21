import { describe, it, expect, beforeEach } from 'vitest';
import { useDevlogStore } from './devlogStore';

describe('devlogStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useDevlogStore.getState().reset();
  });

  it('should have correct initial state', () => {
    const state = useDevlogStore.getState();

    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe('append');
    expect(state.activeProjectId).toBeNull();
    expect(state.activeProjectPath).toBeNull();
    expect(state.content).toBe('');
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.conflictDetected).toBe(false);
    expect(state.conflictDialogOpen).toBe(false);
    expect(state.lastKnownMtime).toBeNull();
    expect(state.lastSavedTimestamp).toBeNull();
    expect(state.externalFileInfo).toBeNull();
    expect(state.cursorPosition).toEqual({ line: 1, column: 1 });
  });

  it('should open modal with project info', () => {
    const { open } = useDevlogStore.getState();

    open(1, '/path/to/project');

    const state = useDevlogStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.activeProjectId).toBe(1);
    expect(state.activeProjectPath).toBe('/path/to/project');
    expect(state.mode).toBe('append');
    // Should reset temporary state
    expect(state.conflictDetected).toBe(false);
    expect(state.externalFileInfo).toBeNull();
  });

  it('should close modal and reset content', () => {
    const { open, setContent, close } = useDevlogStore.getState();

    open(1, '/path/to/project');
    setContent('Some content');
    close();

    const state = useDevlogStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.content).toBe('');
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.conflictDetected).toBe(false);
    expect(state.conflictDialogOpen).toBe(false);
  });

  it('should set mode', () => {
    const { setMode } = useDevlogStore.getState();

    setMode('edit');
    expect(useDevlogStore.getState().mode).toBe('edit');

    setMode('append');
    expect(useDevlogStore.getState().mode).toBe('append');
  });

  it('should set content and mark as having unsaved changes', () => {
    const { setContent } = useDevlogStore.getState();

    setContent('New content');

    const state = useDevlogStore.getState();
    expect(state.content).toBe('New content');
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it('should set active project and reset content', () => {
    const { open, setContent, setActiveProject } = useDevlogStore.getState();

    open(1, '/path/to/project1');
    setContent('Content for project 1');

    setActiveProject(2, '/path/to/project2');

    const state = useDevlogStore.getState();
    expect(state.activeProjectId).toBe(2);
    expect(state.activeProjectPath).toBe('/path/to/project2');
    expect(state.content).toBe('');
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it('should handle conflict detection', () => {
    const { detectConflict, setConflictDetected, setConflictDialogOpen } = useDevlogStore.getState();

    detectConflict();
    const state = useDevlogStore.getState();
    expect(state.conflictDetected).toBe(true);
    expect(state.conflictDialogOpen).toBe(true);

    setConflictDialogOpen(false);
    expect(useDevlogStore.getState().conflictDialogOpen).toBe(false);
    expect(useDevlogStore.getState().conflictDetected).toBe(true); // Still true (paused state)
    
    setConflictDetected(false);
    expect(useDevlogStore.getState().conflictDetected).toBe(false);
  });
  
  it('should set last known mtime', () => {
      const { setLastKnownMtime } = useDevlogStore.getState();
      setLastKnownMtime(12345);
      expect(useDevlogStore.getState().lastKnownMtime).toBe(12345);
  });

  it('should set last saved timestamp', () => {
      const { setLastSaved } = useDevlogStore.getState();
      const now = Date.now();
      setLastSaved(now);
      expect(useDevlogStore.getState().lastSavedTimestamp).toBe(now);
  });
  
  it('should set external file info', () => {
      const { setExternalFileInfo } = useDevlogStore.getState();
      setExternalFileInfo({ lineCount: 50 });
      expect(useDevlogStore.getState().externalFileInfo).toEqual({ lineCount: 50 });
      
      setExternalFileInfo(null);
      expect(useDevlogStore.getState().externalFileInfo).toBeNull();
  });

  it('should reset to initial state', () => {
    const { open, setContent, setMode, detectConflict, setCursorPosition, setLastKnownMtime, reset } = useDevlogStore.getState();

    // Modify state
    open(1, '/path/to/project');
    setContent('Some content');
    setMode('edit');
    detectConflict();
    setCursorPosition({ line: 5, column: 10 });
    setLastKnownMtime(999);

    // Reset
    reset();

    const state = useDevlogStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe('append');
    expect(state.activeProjectId).toBeNull();
    expect(state.content).toBe('');
    expect(state.conflictDetected).toBe(false);
    expect(state.conflictDialogOpen).toBe(false);
    expect(state.lastKnownMtime).toBeNull();
    expect(state.cursorPosition).toEqual({ line: 1, column: 1 });
  });
});