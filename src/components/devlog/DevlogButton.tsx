import { NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevlogStore } from '@/stores/devlogStore';
import { useProjectStore } from '@/stores/projectStore';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useCallback } from 'react';

export function DevlogButton() {
  const open = useDevlogStore((s) => s.open);
  const isOpen = useDevlogStore((s) => s.isOpen);
  const projects = useProjectStore((s) => s.projects);

  const handleOpen = useCallback(() => {
    // Find the first non-archived project to use as default
    const activeProject = projects.find((p) => !p.isArchived);
    if (activeProject) {
      open(activeProject.id, activeProject.path);
    } else if (projects.length > 0) {
      // Fall back to first project if all are archived
      open(projects[0].id, projects[0].path);
    }
    // If no projects exist, the modal will show a message
  }, [open, projects]);

  // Register global hotkey Ctrl+Shift+D
  useHotkeys('D', handleOpen, { ctrl: true, shift: true });

  // Don't render button when modal is open (it's behind the backdrop anyway)
  if (isOpen) return null;

  // Don't render button when no projects tracked (Epic 4 Retro Item)
  if (projects.length === 0) return null;

  return (
    <Button
      onClick={handleOpen}
      size="icon-lg"
      className="fixed bottom-8 right-8 z-50 h-14 w-14 rounded-full bg-[#CC785C] text-white shadow-lg hover:bg-[#b86a50] focus-visible:ring-[#CC785C]/50"
      aria-label="Open DEVLOG editor (Ctrl+Shift+D)"
    >
      <NotebookPen className="size-6" />
    </Button>
  );
}
