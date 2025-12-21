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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


import { Button } from '@/components/ui/button';
import { MarkdownEditor } from './MarkdownEditor';
import { ConflictDialog } from './ConflictDialog';
import { DevlogHistory } from './DevlogHistory';
import { useDevlogStore } from '@/stores/devlogStore';
import { useProjectStore } from '@/stores/projectStore';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { History, ArrowLeft } from 'lucide-react';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface DevlogData {
  content: string;
  mtime: number;
}

export function DevlogModal() {
  const isOpen = useDevlogStore((s) => s.isOpen);
  const mode = useDevlogStore((s) => s.mode);
  const viewMode = useDevlogStore((s) => s.viewMode);
  const activeProjectId = useDevlogStore((s) => s.activeProjectId);
  const activeProjectPath = useDevlogStore((s) => s.activeProjectPath);
  const content = useDevlogStore((s) => s.content);
  const selectedVersionContent = useDevlogStore((s) => s.selectedVersionContent);
  const selectedVersionHash = useDevlogStore((s) => s.selectedVersionHash);

  const lastKnownMtime = useDevlogStore((s) => s.lastKnownMtime);
  const conflictDetected = useDevlogStore((s) => s.conflictDetected);
  const conflictDialogOpen = useDevlogStore((s) => s.conflictDialogOpen);
  const lastSavedTimestamp = useDevlogStore((s) => s.lastSavedTimestamp);

  const hasUnsavedChanges = useDevlogStore((s) => s.hasUnsavedChanges);
  const isSaving = useDevlogStore((s) => s.isSaving);

  const close = useDevlogStore((s) => s.close);
  const setMode = useDevlogStore((s) => s.setMode);
  const setViewMode = useDevlogStore((s) => s.setViewMode);
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
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
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

        // In edit mode (initial or switched), load current content
        // In append mode, we start empty, but we need mtime
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
        toast.success('Entry added to DEVLOG');
      } else {
        toast.success('DEVLOG saved');
      }
      return true; // Return success
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
      return false; // Return failure
    } finally {
      setIsSaving(false);
    }
  }, [activeProjectPath, content, mode, isSaving, lastKnownMtime, setIsSaving, setLastKnownMtime, setLastSaved, setHasUnsavedChanges, detectConflict, setExternalFileInfo]);

  // Auto-save timer with debounce (reset on every keystroke)
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges || conflictDetected || viewMode !== 'edit') {
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
  }, [isOpen, hasUnsavedChanges, conflictDetected, lastKeystrokeTime, save, viewMode]);


  // Handle mode switching logic
  const handleSwitchToHistory = useCallback(async () => {
    // Only show unsaved dialog if content is actually filled (not empty/whitespace)
    if (hasUnsavedChanges && content.trim()) {
      setShowUnsavedDialog(true);
      return;
    }
    setViewMode('history');
  }, [hasUnsavedChanges, content, setViewMode]);

  // Unsaved dialog handlers
  const handleSaveAndContinue = useCallback(async () => {
    setShowUnsavedDialog(false);
    const success = await save();
    if (success) {
      setViewMode('history');
    }
  }, [save, setViewMode]);

  const handleDiscardAndContinue = useCallback(() => {
    setShowUnsavedDialog(false);
    setViewMode('history');
  }, [setViewMode]);

  const handleCancelUnsaved = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  const handleBack = useCallback(() => {
    if (viewMode === 'version') {
      setViewMode('history');
    } else {
      setViewMode('edit');
    }
  }, [viewMode, setViewMode]);

  // Handle modal close - no auto-save, user must explicitly click Add Entry
  const handleClose = useCallback(async () => {
    close();
  }, [close]);

  // Handle project change
  const handleProjectChange = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === parseInt(projectId, 10));
    if (project) {
      setActiveProject(project.id, project.path);
      setMode('append');
      setViewMode('edit');
    }
  }, [projects, setActiveProject, setMode, setViewMode]);

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
  }, [setConflictDialogOpen]);

  // Render logic based on viewMode
  const renderContent = () => {
    if (viewMode === 'history') {
      return <DevlogHistory className="h-full" />;
    }
    if (viewMode === 'version') {
      return (
        <MarkdownEditor
          value={selectedVersionContent || ''}
          onChange={() => { }} // Read only
          readOnly={true}
          className="h-full min-h-[300px]"
        />
      );
    }
    // Edit mode
    return (
      <MarkdownEditor
        value={content}
        onChange={handleContentChange}
        onSave={() => save()}
        placeholder={mode === 'append' ? 'What are you working on?' : ''}
        className="h-full min-h-[300px]"
      />
    );
  };

  const getTitle = () => {
    if (viewMode === 'history') return 'DEVLOG History';
    if (viewMode === 'version') return `Version: ${selectedVersionHash?.substring(0, 7) || 'Unknown'}`;
    return 'DEVLOG Editor';
  };

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
              <div className="flex items-center gap-3">
                {viewMode !== 'edit' && (
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="font-serif">{getTitle()}</DialogTitle>
              </div>

              <div className="flex items-center gap-4">
                {viewMode === 'edit' && (
                  <>
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


                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSwitchToHistory}
                      title="View History"
                      className="h-8 w-8"
                      disabled={isSaving}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {viewMode === 'edit' && (
              <p className="text-xs text-muted-foreground">
                {mode === 'append'
                  ? 'Quick Capture: Type your thoughts and they\'ll be timestamped and appended.'
                  : 'Edit Mode: Full access to your DEVLOG file.'}
              </p>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto">
            {renderContent()}
          </div>

          <div className="flex flex-shrink-0 items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {viewMode === 'edit' && (
                <>
                  {conflictDetected ? (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      ⚠️ Auto-save paused (Conflict)
                    </span>
                  ) : hasUnsavedChanges ? (
                    <span className="text-amber-600">• Unsaved</span>
                  ) : (
                    <span className="text-green-600">• Saved</span>
                  )}

                  {lastSavedTimestamp && (
                    <span className="opacity-75">
                      · {formatDistanceToNow(lastSavedTimestamp, { addSuffix: true })}
                    </span>
                  )}
                </>
              )}
            </div>

            {viewMode === 'edit' && (
              <Button
                size="sm"
                onClick={() => save()}
                disabled={!content.trim() || isSaving || conflictDetected}
                className="bg-[#CC785C] hover:bg-[#b86a50]"
              >
                {isSaving ? 'Saving...' : mode === 'append' ? 'Add Entry' : 'Save'}
              </Button>
            )}
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

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="z-[102]">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:gap-0">
            <AlertDialogCancel onClick={handleCancelUnsaved}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscardAndContinue}>
              Discard & Continue
            </Button>
            <AlertDialogAction onClick={handleSaveAndContinue}>
              Save & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}