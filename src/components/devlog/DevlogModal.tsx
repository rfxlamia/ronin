import { useEffect, useRef, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { formatDistanceToNow } from 'date-fns';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface DevlogData {
  content: string;
  mtime: number;
}

export function DevlogModal() {
  const isOpen = useDevlogStore((s) => s.isOpen);
  const mode = useDevlogStore((s) => s.mode);
  const activeProjectId = useDevlogStore((s) => s.activeProjectId);
  const activeProjectPath = useDevlogStore((s) => s.activeProjectPath);
  const content = useDevlogStore((s) => s.content);

  const lastKnownMtime = useDevlogStore((s) => s.lastKnownMtime);
  const conflictDetected = useDevlogStore((s) => s.conflictDetected);
  const conflictDialogOpen = useDevlogStore((s) => s.conflictDialogOpen);
  const lastSavedTimestamp = useDevlogStore((s) => s.lastSavedTimestamp);

  const hasUnsavedChanges = useDevlogStore((s) => s.hasUnsavedChanges);
  const isSaving = useDevlogStore((s) => s.isSaving);

  const close = useDevlogStore((s) => s.close);
  const setMode = useDevlogStore((s) => s.setMode);
  const setActiveProject = useDevlogStore((s) => s.setActiveProject);
  const setContent = useDevlogStore((s) => s.setContent);

  const setLastKnownMtime = useDevlogStore((s) => s.setLastKnownMtime);
  const detectConflict = useDevlogStore((s) => s.detectConflict);
  const setConflictDetected = useDevlogStore((s) => s.setConflictDetected);
  const setConflictDialogOpen = useDevlogStore((s) => s.setConflictDialogOpen);
  const setLastSaved = useDevlogStore((s) => s.setLastSaved);
  const setExternalFileInfo = useDevlogStore((s) => s.setExternalFileInfo);

  const setHasUnsavedChanges = useDevlogStore((s) => s.setHasUnsavedChanges);
  const setIsSaving = useDevlogStore((s) => s.setIsSaving);

  const projects = useProjectStore((s) => s.projects);
  const nonArchivedProjects = projects.filter((p) => !p.isArchived);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(Date.now());
  const externalFileInfo = useDevlogStore((s) => s.externalFileInfo);

  // Wrapper for content change to track keystrokes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setLastKeystrokeTime(Date.now());
  }, [setContent]);

  // Load content and mtime when modal opens
  useEffect(() => {
    if (!isOpen || !activeProjectPath) return;

    const loadData = async () => {
      try {
        const data = await invoke<DevlogData>('get_devlog_with_mtime', {
          projectPath: activeProjectPath,
        });

        // Only update content if not in append mode (append always starts empty)
        // OR if needed. Wait, in append mode we usually start empty.
        // But if we want to show existing content? The requirements say:
        // "existing DEVLOG.md content is loaded when modal opens" (AC 1)
        // But also "modal editor content is NOT cleared after save" (AC 5)

        // Actually, existing implementation sets content only in EDIT mode.
        // AC 1 says "loaded when modal opens".
        // Use case: context for what I wrote before?
        // But typically Append mode is blank.
        // Let's stick to: Append = blank (or previous session?), Edit = full file.
        // Story 4.1 implementation: Append starts blank.
        // Re-reading AC 1: "existing DEVLOG.md content is loaded when modal opens".
        // This might imply Edit mode behavior or just loading into store for reference?
        // AC 5: "append mode... modal editor content is NOT cleared after save".

        // I will follow existing pattern: Append starts empty, Edit loads file.
        // BUT I must store mtime regardless of mode for conflict detection.

        if (mode === 'edit') {
          setContent(data.content);
        }
        setLastKnownMtime(data.mtime);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to load DEVLOG:', error);
        toast.error("Couldn't load DEVLOG");
      }
    };

    loadData();
  }, [isOpen, activeProjectPath, mode, setContent, setLastKnownMtime, setHasUnsavedChanges]);

  // Polling for conflicts
  useEffect(() => {
    if (!isOpen || !activeProjectPath || conflictDetected) return;

    const pollInterval = setInterval(async () => {
      // DEBOUNCE: Skip poll if user typed within last 10 seconds
      if (Date.now() - lastKeystrokeTime < 10000) {
        return;
      }

      try {
        const currentMtime = await invoke<number>('get_devlog_mtime', {
          projectPath: activeProjectPath
        });

        if (lastKnownMtime !== null && currentMtime !== lastKnownMtime && currentMtime !== 0) {
          // Conflict detected!
          // Fetch info for preview
          const externalData = await invoke<DevlogData>('resolve_conflict_reload', {
            projectPath: activeProjectPath
          });

          const lineCount = externalData.content.split('\n').length;
          const userLineCount = content.split('\n').length;
          setExternalFileInfo({ lineCount, userLineCount });
          detectConflict();
        }
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isOpen, activeProjectPath, conflictDetected, lastKnownMtime, lastKeystrokeTime, detectConflict, setExternalFileInfo]);


  // Save function
  const save = useCallback(async (forceOverwrite = false) => {
    if (!activeProjectPath || !content.trim()) return;
    if (isSaving) return;

    setIsSaving(true);

    try {
      const expectedMtime = forceOverwrite ? 0 : (lastKnownMtime || 0);

      if (mode === 'append') {
        await invoke('append_devlog', {
          projectPath: activeProjectPath,
          content: content,
          expectedMtime
        });
      } else {
        await invoke('write_devlog', {
          projectPath: activeProjectPath,
          content: content,
          expectedMtime
        });
      }

      // Update mtime after successful save
      const newMtime = await invoke<number>('get_devlog_mtime', {
        projectPath: activeProjectPath,
      });
      setLastKnownMtime(newMtime);
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);

      if (mode === 'append') {
        // NOTE: AC 5 says "modal editor content is NOT cleared after save"
        // But UX-wise, for "Add Entry", usually you want to clear?
        // "allows continued writing" implies NOT clearing.
        // "modal editor content is NOT cleared after save (allows continued writing)"
        // Okay, I will NOT clear content. 
        // But user might want to clear manually?
        // I'll leave it as is per AC.
        toast.success('Entry added to DEVLOG');
      } else {
        toast.success('DEVLOG saved');
      }
    } catch (error) {
      if (error === 'CONFLICT') {
        // Fetch info and show dialog
        try {
          const externalData = await invoke<DevlogData>('resolve_conflict_reload', {
            projectPath: activeProjectPath
          });
          const userLineCount = content.split('\n').length;
          setExternalFileInfo({ lineCount: externalData.content.split('\n').length, userLineCount });
          detectConflict();
        } catch (e) {
          console.error('Failed to get conflict info', e);
          detectConflict(); // Show anyway
        }
      } else {
        console.error('Failed to save DEVLOG:', error);
        toast.error("Couldn't save DEVLOG. Try again?");
      }
    } finally {
      setIsSaving(false);
    }
  }, [activeProjectPath, content, mode, isSaving, lastKnownMtime, setIsSaving, setLastKnownMtime, setLastSaved, setHasUnsavedChanges, detectConflict, setExternalFileInfo]);

  // Auto-save timer with debounce (reset on every keystroke)
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges || conflictDetected) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isOpen, hasUnsavedChanges, conflictDetected, lastKeystrokeTime, save]);


  // Handle modal close
  const handleClose = useCallback(async () => {
    // Save if there are unsaved changes
    // Only in append mode? Or both?
    // "Save if there are unsaved changes in append mode" (from previous code)
    if (hasUnsavedChanges && content.trim() && mode === 'append' && !conflictDetected) {
      await save();
    }
    close();
  }, [hasUnsavedChanges, content, mode, conflictDetected, save, close]);

  // Handle project change
  const handleProjectChange = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === parseInt(projectId, 10));
    if (project) {
      setActiveProject(project.id, project.path);
      setMode('append');
    }
  }, [projects, setActiveProject, setMode]);

  // Conflict resolution handlers
  const handleReload = useCallback(async () => {
    if (!activeProjectPath) return;

    try {
      const data = await invoke<DevlogData>('resolve_conflict_reload', {
        projectPath: activeProjectPath,
      });

      setContent(data.content);
      setLastKnownMtime(data.mtime);
      setLastKeystrokeTime(Date.now());
      setConflictDetected(false);
      setConflictDialogOpen(false);
      toast.info('Reloaded external changes');
    } catch (error) {
      console.error('Failed to reload DEVLOG:', error);
      toast.error("Couldn't reload file. Your changes are safe in the editor.");
    }
  }, [activeProjectPath, setContent, setLastKnownMtime, setConflictDetected, setConflictDialogOpen]);

  const handleKeepMine = useCallback(async () => {
    setConflictDetected(false); // Assume resolved
    setConflictDialogOpen(false);
    await save(true); // Force overwrite
  }, [setConflictDetected, setConflictDialogOpen, save]);

  const handleCancelConflict = useCallback(() => {
    setConflictDialogOpen(false);
    // ConflictDetected remains true (paused state)
    // Or should it?
    // "ConflictDialog blocks all save operations until resolved"
    // "Cancel -> Close dialog, pause auto-save, keep modal open"
    // So conflictDetected = true.
  }, [setConflictDialogOpen]);

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
            <DialogDescription className="sr-only">
              Editor for writing and managing development logs
            </DialogDescription>
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
                    onCheckedChange={(checked) => {
                      // Warn if unsaved
                      if (mode === 'edit' && !checked && hasUnsavedChanges) {
                        if (!confirm('Discard unsaved changes?')) return;
                      }
                      setMode(checked ? 'edit' : 'append');
                      if (!checked) setContent(''); // Clear on append
                    }}
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

          <div className="min-h-0 flex-1 overflow-hidden">
            <MarkdownEditor
              value={content}
              onChange={handleContentChange}
              placeholder={mode === 'append' ? 'What are you working on?' : ''}
              className="h-full min-h-[300px]"
            />
          </div>

          <div className="flex flex-shrink-0 items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {/* Status Indicators */}
              {conflictDetected ? (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  ⚠️ Auto-save paused (Conflict)
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-600">• Unsaved</span>
              ) : (
                <span className="text-green-600">• Saved</span>
              )}

              {/* Last saved timestamp */}
              {lastSavedTimestamp && (
                <span className="opacity-75">
                  · {formatDistanceToNow(lastSavedTimestamp, { addSuffix: true })}
                </span>
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
        isOpen={conflictDialogOpen}
        onReload={handleReload}
        onKeepMine={handleKeepMine}
        onCancel={handleCancelConflict}
        externalFileInfo={externalFileInfo}
      />
    </>
  );
}