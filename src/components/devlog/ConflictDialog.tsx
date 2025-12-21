import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ExternalFileInfo {
  lineCount: number;
  userLineCount?: number;
}

interface ConflictDialogProps {
  isOpen: boolean;
  onReload: () => void;
  onKeepMine: () => void;
  onCancel: () => void;
  externalFileInfo: ExternalFileInfo | null;
}

export function ConflictDialog({
  isOpen,
  onReload,
  onKeepMine,
  onCancel,
  externalFileInfo,
}: ConflictDialogProps) {

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input (unlikely in this modal, but good practice)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onReload();
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        onKeepMine();
      }
      // Escape is handled by AlertDialog default behavior (triggers onCancel via onOpenChange if mapped, 
      // but here we use manual buttons. Radix handles Escape automatically.)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onReload, onKeepMine]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md" onEscapeKeyDown={onCancel}>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <AlertDialogTitle>DEVLOG Changed Externally</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-2" asChild>
            <div>
              <p>DEVLOG.md was modified outside Ronin while you were editing.</p>
              {externalFileInfo && (
                <p className="text-xs font-mono bg-muted p-2 rounded">
                  External file has {externalFileInfo.lineCount} lines{externalFileInfo.userLineCount !== undefined ? ` (yours has ${externalFileInfo.userLineCount} lines)` : ''}.
                </p>
              )}
              <p>What would you like to do?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Button
            variant="outline"
            className="h-auto justify-start p-3 text-left group"
            onClick={onReload}
            aria-label="Reload external changes (R)"
          >
            <div>
              <div className="font-medium flex items-center gap-2">
                Reload
                <kbd className="hidden group-hover:inline-block text-[10px] bg-muted px-1 rounded border">R</kbd>
              </div>
              <div className="text-xs text-muted-foreground">
                Discard your changes and load the external version
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto justify-start border-amber-300 p-3 text-left hover:border-amber-400 group"
            onClick={onKeepMine}
            aria-label="Keep your changes (K)"
          >
            <div>
              <div className="font-medium flex items-center gap-2">
                Keep Mine
                <kbd className="hidden group-hover:inline-block text-[10px] bg-muted px-1 rounded border">K</kbd>
              </div>
              <div className="text-xs text-muted-foreground">
                Overwrite the external changes with your current edits
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto justify-start p-3 text-left opacity-50"
            disabled
            title="Merge feature coming in v0.3"
          >
            <div>
              <div className="font-medium">Merge (Coming in v0.3)</div>
              <div className="text-xs text-muted-foreground">
                View both versions side-by-side
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={onCancel} aria-label="Cancel (Esc)">
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}