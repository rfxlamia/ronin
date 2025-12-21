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

  it('should set conflict detected flag', () => {
    const { setConflictDetected } = useDevlogStore.getState();

    setConflictDetected(true);
    expect(useDevlogStore.getState().conflictDetected).toBe(true);

    setConflictDetected(false);
    expect(useDevlogStore.getState().conflictDetected).toBe(false);
  });

  it('should reset to initial state', () => {
    const { open, setContent, setMode, setConflictDetected, setCursorPosition, reset } = useDevlogStore.getState();

    // Modify state
    open(1, '/path/to/project');
    setContent('Some content');
    setMode('edit');
    setConflictDetected(true);
    setCursorPosition({ line: 5, column: 10 });

    // Reset
    reset();

    const state = useDevlogStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe('append');
    expect(state.activeProjectId).toBeNull();
    expect(state.content).toBe('');
    expect(state.conflictDetected).toBe(false);
    expect(state.cursorPosition).toEqual({ line: 1, column: 1 });
  });

  it('should set cursor position', () => {
    const { setCursorPosition } = useDevlogStore.getState();

    setCursorPosition({ line: 10, column: 25 });

    const state = useDevlogStore.getState();
    expect(state.cursorPosition).toEqual({ line: 10, column: 25 });
  });
});
