import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from './MarkdownEditor';
import { ConflictDialog } from './ConflictDialog';
import { useDevlogStore } from '@/stores/devlogStore';
import { useProjectStore } from '@/stores/projectStore';
import { toast } from 'sonner';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function DevlogModal() {
  const isOpen = useDevlogStore((s) => s.isOpen);
  const mode = useDevlogStore((s) => s.mode);
  const activeProjectId = useDevlogStore((s) => s.activeProjectId);
  const activeProjectPath = useDevlogStore((s) => s.activeProjectPath);
  const content = useDevlogStore((s) => s.content);
  const fileMtime = useDevlogStore((s) => s.fileMtime);
  const hasUnsavedChanges = useDevlogStore((s) => s.hasUnsavedChanges);
  const conflictDetected = useDevlogStore((s) => s.conflictDetected);
  const isSaving = useDevlogStore((s) => s.isSaving);

  const close = useDevlogStore((s) => s.close);
  const setMode = useDevlogStore((s) => s.setMode);
  const setActiveProject = useDevlogStore((s) => s.setActiveProject);
  const setContent = useDevlogStore((s) => s.setContent);
  const setFileMtime = useDevlogStore((s) => s.setFileMtime);
  const setHasUnsavedChanges = useDevlogStore((s) => s.setHasUnsavedChanges);
  const setConflictDetected = useDevlogStore((s) => s.setConflictDetected);
  const setIsSaving = useDevlogStore((s) => s.setIsSaving);

  const projects = useProjectStore((s) => s.projects);
  const nonArchivedProjects = projects.filter((p) => !p.isArchived);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Load file mtime when modal opens or project changes
  useEffect(() => {
    if (!isOpen || !activeProjectPath) return;

    const loadMtime = async () => {
      try {
        const mtime = await invoke<number>('get_devlog_mtime', {
          projectPath: activeProjectPath,
        });
        setFileMtime(mtime);
      } catch (error) {
        console.error('Failed to get file mtime:', error);
      }
    };

    loadMtime();
  }, [isOpen, activeProjectPath, setFileMtime]);

  // Load content when switching to edit mode
  useEffect(() => {
    if (!isOpen || !activeProjectPath || mode !== 'edit') return;

    const loadContent = async () => {
      try {
        const fileContent = await invoke<string>('get_devlog_content', {
          projectPath: activeProjectPath,
        });
        setContent(fileContent);
        lastSavedContentRef.current = fileContent;
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to load DEVLOG:', error);
        toast.error("Couldn't load DEVLOG. Try again?");
      }
    };

    loadContent();
  }, [isOpen, activeProjectPath, mode, setContent, setHasUnsavedChanges]);

  // Check for file conflicts before saving
  const checkForConflict = useCallback(async (): Promise<boolean> => {
    if (!activeProjectPath) return false;

    try {
      const currentMtime = await invoke<number>('get_devlog_mtime', {
        projectPath: activeProjectPath,
      });

      if (currentMtime > fileMtime && fileMtime > 0) {
        setConflictDetected(true);
        return true;
      }
    } catch (error) {
      console.error('Failed to check file mtime:', error);
    }

    return false;
  }, [activeProjectPath, fileMtime, setConflictDetected]);

  // Save content
  const save = useCallback(async (forceOverwrite = false) => {
    if (!activeProjectPath || !content.trim()) return;
    if (isSaving) return;

    // Check for conflicts unless forcing overwrite
    if (!forceOverwrite) {
      const hasConflict = await checkForConflict();
      if (hasConflict) return;
    }

    setIsSaving(true);

    try {
      if (mode === 'append') {
        await invoke('append_devlog', {
          projectPath: activeProjectPath,
          content: content,
        });
      } else {
        await invoke('write_devlog', {
          projectPath: activeProjectPath,
          content: content,
        });
      }

      // Update mtime after save
      const newMtime = await invoke<number>('get_devlog_mtime', {
        projectPath: activeProjectPath,
      });
      setFileMtime(newMtime);
      lastSavedContentRef.current = content;
      setHasUnsavedChanges(false);

      // Clear content in append mode after saving
      if (mode === 'append') {
        setContent('');
        toast.success('Entry added to DEVLOG');
      } else {
        toast.success('DEVLOG saved');
      }
    } catch (error) {
      console.error('Failed to save DEVLOG:', error);
      toast.error("Couldn't save DEVLOG. Try again?");
    } finally {
      setIsSaving(false);
    }
  }, [activeProjectPath, content, mode, isSaving, checkForConflict, setIsSaving, setFileMtime, setHasUnsavedChanges, setContent]);

  // Auto-save timer
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges || conflictDetected) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isOpen, hasUnsavedChanges, conflictDetected, save]);

  // Handle modal close
  const handleClose = useCallback(async () => {
    // Save if there are unsaved changes in append mode
    if (hasUnsavedChanges && content.trim() && mode === 'append') {
      await save();
    }
    close();
  }, [hasUnsavedChanges, content, mode, save, close]);

  // Handle project change
  const handleProjectChange = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === parseInt(projectId, 10));
    if (project) {
      setActiveProject(project.id, project.path);
      // Reset to append mode when changing projects
      setMode('append');
    }
  }, [projects, setActiveProject, setMode]);

  // Handle mode toggle
  const handleModeToggle = useCallback((checked: boolean) => {
    const newMode = checked ? 'edit' : 'append';

    // If switching from edit to append with unsaved changes, warn
    if (mode === 'edit' && !checked && hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Switching to Quick Capture mode will discard them. Continue?')) {
        return;
      }
    }

    setMode(newMode);

    // Clear content when switching to append mode
    if (newMode === 'append') {
      setContent('');
      setHasUnsavedChanges(false);
    }
  }, [mode, hasUnsavedChanges, setMode, setContent, setHasUnsavedChanges]);

  // Conflict resolution handlers
  const handleReload = useCallback(async () => {
    if (!activeProjectPath) return;

    try {
      const fileContent = await invoke<string>('get_devlog_content', {
        projectPath: activeProjectPath,
      });
      const mtime = await invoke<number>('get_devlog_mtime', {
        projectPath: activeProjectPath,
      });

      setContent(fileContent);
      setFileMtime(mtime);
      lastSavedContentRef.current = fileContent;
      setHasUnsavedChanges(false);
      setConflictDetected(false);
    } catch (error) {
      console.error('Failed to reload DEVLOG:', error);
      toast.error("Couldn't reload DEVLOG");
    }
  }, [activeProjectPath, setContent, setFileMtime, setHasUnsavedChanges, setConflictDetected]);

  const handleKeepMine = useCallback(async () => {
    setConflictDetected(false);
    await save(true); // Force overwrite
  }, [setConflictDetected, save]);

  const handleCancelConflict = useCallback(() => {
    setConflictDetected(false);
    // Auto-save remains paused until user resolves conflict
  }, [setConflictDetected]);

  // No projects message
  if (isOpen && nonArchivedProjects.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="z-[101] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">DEVLOG Editor</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p>No projects available.</p>
            <p className="mt-2 text-sm">Add a project first to start writing your DEVLOG.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="z-[101] flex max-h-[80vh] max-w-2xl flex-col gap-4"
          showCloseButton={true}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle className="font-serif">DEVLOG Editor</DialogTitle>

              <div className="flex items-center gap-4">
                {/* Project selector */}
                <Select
                  value={activeProjectId?.toString() ?? ''}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="z-[102]">
                    {nonArchivedProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Edit mode toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-mode"
                    checked={mode === 'edit'}
                    onCheckedChange={handleModeToggle}
                  />
                  <Label htmlFor="edit-mode" className="text-sm">
                    Edit Mode
                  </Label>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {mode === 'append'
                ? 'Quick Capture: Type your thoughts and they\'ll be timestamped and appended.'
                : 'Edit Mode: Full access to your DEVLOG file.'}
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder={mode === 'append' ? 'What are you working on?' : ''}
              className="h-full min-h-[300px]"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {/* Keyboard shortcuts */}
              <span><kbd className="rounded bg-muted px-1">Ctrl+B</kbd> Bold</span>
              <span><kbd className="rounded bg-muted px-1">Ctrl+I</kbd> Italic</span>

              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && !conflictDetected && (
                <span className="text-amber-600">• Unsaved</span>
              )}
              {conflictDetected && (
                <span className="text-red-600">• File changed externally</span>
              )}
            </div>

            {/* Save button */}
            <Button
              size="sm"
              onClick={() => save()}
              disabled={!content.trim() || isSaving || conflictDetected}
              className="bg-[#CC785C] hover:bg-[#b86a50]"
            >
              {isSaving ? 'Saving...' : mode === 'append' ? 'Add Entry' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConflictDialog
        isOpen={conflictDetected}
        onReload={handleReload}
        onKeepMine={handleKeepMine}
        onCancel={handleCancelConflict}
      />
    </>
  );
}
