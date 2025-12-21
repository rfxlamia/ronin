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

interface ConflictDialogProps {
  isOpen: boolean;
  onReload: () => void;
  onKeepMine: () => void;
  onCancel: () => void;
}

export function ConflictDialog({
  isOpen,
  onReload,
  onKeepMine,
  onCancel,
}: ConflictDialogProps) {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <AlertDialogTitle>DEVLOG Changed Externally</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            DEVLOG.md was modified outside Ronin while you were editing. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Button
            variant="outline"
            className="h-auto justify-start p-3 text-left"
            onClick={onReload}
          >
            <div>
              <div className="font-medium">Reload</div>
              <div className="text-xs text-muted-foreground">
                Discard your changes and load the external version
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto justify-start border-amber-300 p-3 text-left hover:border-amber-400"
            onClick={onKeepMine}
          >
            <div>
              <div className="font-medium">Keep Mine</div>
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
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
