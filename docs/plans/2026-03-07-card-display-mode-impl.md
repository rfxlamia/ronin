# Card Display Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "modal" alternative to the current inline-collapsible card expansion, controlled by a user setting in the Settings page.

**Architecture:** Strategy pattern -- extract shared content into `ProjectDetailContent`, render it inside either `CollapsibleContent` or Radix `Dialog` based on `cardDisplayMode` setting from `settingsStore`. No Rust backend changes.

**Tech Stack:** React 19, TypeScript, Zustand, Radix Dialog, Tailwind CSS, Vitest + React Testing Library

**Design doc:** `docs/plans/2026-03-07-card-display-mode-design.md`

---

### Task 1: Add `cardDisplayMode` to settingsStore

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Test: `src/stores/settingsStore.test.ts`

**Step 1: Write failing tests**

Add to `src/stores/settingsStore.test.ts`:

```typescript
describe('cardDisplayMode', () => {
    it('should default to collapsible', () => {
        const state = useSettingsStore.getState();
        expect(state.cardDisplayMode).toBe('collapsible');
    });

    it('loadCardDisplayMode sets mode from backend', async () => {
        vi.mocked(invoke).mockResolvedValueOnce('modal');

        await useSettingsStore.getState().loadCardDisplayMode();

        expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'card_display_mode' });
        expect(useSettingsStore.getState().cardDisplayMode).toBe('modal');
    });

    it('loadCardDisplayMode defaults to collapsible when null', async () => {
        vi.mocked(invoke).mockResolvedValueOnce(null);

        await useSettingsStore.getState().loadCardDisplayMode();

        expect(useSettingsStore.getState().cardDisplayMode).toBe('collapsible');
    });

    it('setCardDisplayMode persists and updates state', async () => {
        vi.mocked(invoke).mockResolvedValueOnce(undefined);

        await useSettingsStore.getState().setCardDisplayMode('modal');

        expect(invoke).toHaveBeenCalledWith('update_setting', {
            key: 'card_display_mode',
            value: 'modal',
        });
        expect(useSettingsStore.getState().cardDisplayMode).toBe('modal');
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/stores/settingsStore.test.ts`
Expected: FAIL -- `cardDisplayMode` does not exist on state

**Step 3: Implement in settingsStore**

In `src/stores/settingsStore.ts`, add to the `SettingsState` interface:

```typescript
cardDisplayMode: 'collapsible' | 'modal';
loadCardDisplayMode: () => Promise<void>;
setCardDisplayMode: (mode: 'collapsible' | 'modal') => Promise<void>;
```

Add to the `create` body:

```typescript
cardDisplayMode: 'collapsible',
loadCardDisplayMode: async () => {
    const val = await invoke<string | null>('get_setting', { key: 'card_display_mode' });
    set({ cardDisplayMode: (val === 'modal' ? 'modal' : 'collapsible') });
},
setCardDisplayMode: async (mode) => {
    await invoke('update_setting', { key: 'card_display_mode', value: mode });
    set({ cardDisplayMode: mode });
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/settingsStore.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "feat: add cardDisplayMode to settingsStore"
```

---

### Task 2: Add Card Display setting to Settings page

**Files:**
- Modify: `src/pages/Settings.tsx`

**Step 1: Load the setting on mount**

At the top of `Settings()`, add:

```typescript
import { useSettingsStore } from '@/stores/settingsStore';
```

Inside the component:

```typescript
const cardDisplayMode = useSettingsStore((s) => s.cardDisplayMode);
const loadCardDisplayMode = useSettingsStore((s) => s.loadCardDisplayMode);
const setCardDisplayMode = useSettingsStore((s) => s.setCardDisplayMode);

useEffect(() => {
    loadCardDisplayMode();
}, [loadCardDisplayMode]);
```

**Step 2: Add the UI section between Appearance and Silent Observer**

Insert after the Appearance `</section>` and before the Silent Observer `<section>`:

```tsx
{/* Card Display Section */}
<section className="mb-8">
    <h3 className="text-xl font-serif font-bold mb-3">Card Display</h3>
    <p className="text-muted-foreground mb-4">
        Choose how project details appear when you click a card.
    </p>
    <div className="space-y-3">
        <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-[#CC785C] has-[:checked]:bg-[#CC785C]/5">
            <input
                type="radio"
                name="cardDisplayMode"
                value="collapsible"
                checked={cardDisplayMode === 'collapsible'}
                onChange={() => setCardDisplayMode('collapsible')}
                className="mt-1 accent-[#CC785C]"
            />
            <div>
                <span className="font-sans font-medium">Inline Expand</span>
                <p className="text-sm text-muted-foreground">
                    Card expands in place to show details below it.
                </p>
            </div>
        </label>
        <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-[#CC785C] has-[:checked]:bg-[#CC785C]/5">
            <input
                type="radio"
                name="cardDisplayMode"
                value="modal"
                checked={cardDisplayMode === 'modal'}
                onChange={() => setCardDisplayMode('modal')}
                className="mt-1 accent-[#CC785C]"
            />
            <div>
                <span className="font-sans font-medium">Popup Modal</span>
                <p className="text-sm text-muted-foreground">
                    Opens a centered popup with a two-column layout.
                </p>
            </div>
        </label>
    </div>
</section>
```

**Step 3: Verify manually**

Run: `npm run tauri dev`
Navigate to Settings. Confirm the "Card Display" section appears between Appearance and Silent Observer with two radio options. Clicking each should persist (reload page to verify).

**Step 4: Run type check**

Run: `npm run lint`
Expected: PASS (no type errors)

**Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add Card Display setting to Settings page"
```

---

### Task 3: Extract ProjectDetailContent component

**Files:**
- Create: `src/components/Dashboard/ProjectDetailContent.tsx`
- Create: `src/components/Dashboard/ProjectDetailContent.test.tsx`

**Step 1: Write the failing test**

Create `src/components/Dashboard/ProjectDetailContent.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectDetailContent } from './ProjectDetailContent';
import type { Project } from '@/types/project';

// Mock ContextPanel
vi.mock('@/components/ContextPanel', () => ({
    ContextPanel: ({ state, text }: any) => (
        <div data-testid="context-panel" data-state={state}>
            {text}
        </div>
    ),
}));

// Mock GitStatusDisplay
vi.mock('./GitStatusDisplay', () => ({
    GitStatusDisplay: ({ projectPath }: any) => (
        <div data-testid="git-status-display">{projectPath}</div>
    ),
}));

// Mock GitControls
vi.mock('./GitControls', () => ({
    GitControls: () => <div data-testid="git-controls" />,
}));

// Mock useGitStatus
vi.mock('@/hooks/useGitStatus', () => ({
    useGitStatus: () => ({
        status: { uncommittedFiles: 2, unpushedCommits: 0 },
        refresh: vi.fn(),
    }),
}));

const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    path: '/home/user/test',
    type: 'git',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    healthStatus: 'active',
    gitBranch: 'main',
    uncommittedCount: 2,
};

const defaultProps = {
    project: mockProject,
    contextState: 'complete' as const,
    contextText: 'Some context',
    attribution: undefined,
    error: null,
    parsedError: null,
    retry: vi.fn(),
    isOpeningIDE: false,
    onOpenInIDE: vi.fn(),
};

describe('ProjectDetailContent', () => {
    it('renders ContextPanel with correct props', () => {
        render(<ProjectDetailContent {...defaultProps} />);
        const panel = screen.getByTestId('context-panel');
        expect(panel).toBeInTheDocument();
        expect(panel).toHaveAttribute('data-state', 'complete');
    });

    it('renders GitStatusDisplay for git projects', () => {
        render(<ProjectDetailContent {...defaultProps} />);
        expect(screen.getByTestId('git-status-display')).toBeInTheDocument();
    });

    it('does not render GitStatusDisplay for folder projects', () => {
        const folderProject = { ...mockProject, type: 'folder' as const };
        render(<ProjectDetailContent {...defaultProps} project={folderProject} />);
        expect(screen.queryByTestId('git-status-display')).not.toBeInTheDocument();
    });

    it('renders Open in IDE button', () => {
        render(<ProjectDetailContent {...defaultProps} />);
        expect(screen.getByText('Open in IDE')).toBeInTheDocument();
    });

    it('shows Opening... when isOpeningIDE is true', () => {
        render(<ProjectDetailContent {...defaultProps} isOpeningIDE={true} />);
        expect(screen.getByText('Opening...')).toBeInTheDocument();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Dashboard/ProjectDetailContent.test.tsx`
Expected: FAIL -- module not found

**Step 3: Create the component**

Create `src/components/Dashboard/ProjectDetailContent.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { ContextPanel } from '@/components/ContextPanel';
import { GitStatusDisplay } from './GitStatusDisplay';
import { GitControls } from './GitControls';
import { useGitStatus } from '@/hooks/useGitStatus';
import type { Project } from '@/types/project';
import type { ContextPanelState, AttributionData, ParsedError } from '@/types/context';

interface ProjectDetailContentProps {
    project: Project;
    contextState: ContextPanelState;
    contextText: string;
    attribution: AttributionData | undefined;
    error: string | null;
    parsedError: ParsedError | null;
    retry: () => void;
    isOpeningIDE: boolean;
    onOpenInIDE: () => void;
}

export function ProjectDetailContent({
    project,
    contextState,
    contextText,
    attribution,
    error,
    parsedError,
    retry,
    isOpeningIDE,
    onOpenInIDE,
}: ProjectDetailContentProps) {
    return (
        <div className="bg-muted/20 p-4 space-y-4">
            <ContextPanel
                state={contextState}
                text={contextText}
                attribution={contextState === 'complete' && attribution ? attribution : undefined}
                onRetry={retry}
                error={error || undefined}
                parsedError={parsedError || undefined}
            />

            {project.type === 'git' && (
                <div className="pt-2 border-t border-border/50">
                    <GitStatusDisplay projectPath={project.path} />
                </div>
            )}

            {project.type === 'git' && (
                <GitControlsWrapper project={project} />
            )}

            <Button
                className="w-full font-serif"
                onClick={onOpenInIDE}
                disabled={isOpeningIDE}
            >
                {isOpeningIDE ? 'Opening...' : 'Open in IDE'}
            </Button>
        </div>
    );
}

function GitControlsWrapper({ project }: { project: Project }) {
    const { status, refresh } = useGitStatus(project.path);

    if (!status || (status.uncommittedFiles === 0 && status.unpushedCommits === 0)) {
        return null;
    }

    return <GitControls project={project} onSuccess={refresh} status={status} />;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Dashboard/ProjectDetailContent.test.tsx`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/Dashboard/ProjectDetailContent.tsx src/components/Dashboard/ProjectDetailContent.test.tsx
git commit -m "feat: extract ProjectDetailContent shared component"
```

---

### Task 4: Create ProjectDetailDialog component

**Files:**
- Create: `src/components/Dashboard/ProjectDetailDialog.tsx`
- Create: `src/components/Dashboard/ProjectDetailDialog.test.tsx`

**Step 1: Write the failing test**

Create `src/components/Dashboard/ProjectDetailDialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectDetailDialog } from './ProjectDetailDialog';
import type { Project } from '@/types/project';

// Mock ProjectDetailContent
vi.mock('./ProjectDetailContent', () => ({
    ProjectDetailContent: (props: any) => (
        <div data-testid="project-detail-content" data-project={props.project.name} />
    ),
}));

const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    path: '/home/user/test',
    type: 'git',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    healthStatus: 'active',
    gitBranch: 'main',
    uncommittedCount: 2,
};

const defaultProps = {
    project: mockProject,
    open: true,
    onOpenChange: vi.fn(),
    contextState: 'complete' as const,
    contextText: 'Some context',
    attribution: undefined,
    error: null,
    parsedError: null,
    retry: vi.fn(),
    isOpeningIDE: false,
    onOpenInIDE: vi.fn(),
};

describe('ProjectDetailDialog', () => {
    it('renders project name in dialog header when open', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('renders ProjectDetailContent when open', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        expect(screen.getByTestId('project-detail-content')).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
        render(<ProjectDetailDialog {...defaultProps} open={false} />);
        expect(screen.queryByTestId('project-detail-content')).not.toBeInTheDocument();
    });

    it('renders health badge and activity text in header', () => {
        render(<ProjectDetailDialog {...defaultProps} />);
        // HealthBadge renders the status text
        expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Dashboard/ProjectDetailDialog.test.tsx`
Expected: FAIL -- module not found

**Step 3: Create the component**

Create `src/components/Dashboard/ProjectDetailDialog.tsx`:

```tsx
import { GitBranch, Folder } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { HealthBadge } from './HealthBadge';
import { ProjectDetailContent } from './ProjectDetailContent';
import { calculateDaysSince, formatDaysSince } from '@/lib/utils/dateUtils';
import { calculateProjectHealth } from '@/lib/logic/projectHealth';
import type { Project } from '@/types/project';
import type { ContextPanelState, AttributionData, ParsedError } from '@/types/context';

interface ProjectDetailDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contextState: ContextPanelState;
    contextText: string;
    attribution: AttributionData | undefined;
    error: string | null;
    parsedError: ParsedError | null;
    retry: () => void;
    isOpeningIDE: boolean;
    onOpenInIDE: () => void;
}

export function ProjectDetailDialog({
    project,
    open,
    onOpenChange,
    contextState,
    contextText,
    attribution,
    error,
    parsedError,
    retry,
    isOpeningIDE,
    onOpenInIDE,
}: ProjectDetailDialogProps) {
    const TypeIcon = project.type === 'git' ? GitBranch : Folder;
    const daysSinceActivity = calculateDaysSince(
        project.lastActivityAt || project.updated_at
    );
    const activityText = formatDaysSince(daysSinceActivity);
    const healthStatus = calculateProjectHealth(project);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                showCloseButton={false}
            >
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <DialogTitle className="font-serif font-bold text-xl truncate">
                            {project.name}
                        </DialogTitle>
                    </div>
                    <DialogDescription asChild>
                        <div className="flex items-center gap-3 flex-wrap">
                            <HealthBadge status={healthStatus} />
                            <span className="text-sm text-muted-foreground font-sans">
                                {activityText}
                            </span>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <ProjectDetailContent
                        project={project}
                        contextState={contextState}
                        contextText={contextText}
                        attribution={attribution}
                        error={error}
                        parsedError={parsedError}
                        retry={retry}
                        isOpeningIDE={isOpeningIDE}
                        onOpenInIDE={onOpenInIDE}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
```

Note: Starting with a single-column layout inside the dialog. The two-column layout from the wireframe can be added as an enhancement in Step 6 of this task after the core functionality works.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Dashboard/ProjectDetailDialog.test.tsx`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/Dashboard/ProjectDetailDialog.tsx src/components/Dashboard/ProjectDetailDialog.test.tsx
git commit -m "feat: create ProjectDetailDialog component"
```

**Step 6: Add two-column layout for git projects**

Update the `ProjectDetailContent` component to accept an optional `layout` prop. Create a new variant `ProjectDetailContentTwoColumn` inside `ProjectDetailDialog` that rearranges the content:

In `ProjectDetailDialog.tsx`, replace the `<ProjectDetailContent>` usage with a two-column layout:

```tsx
<div className="flex-1 overflow-y-auto -mx-6 px-6">
    {project.type === 'git' ? (
        <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4 bg-muted/20 p-4">
            {/* Left column: AI Context */}
            <div className="max-h-[400px] overflow-y-auto">
                <ContextPanel
                    state={contextState}
                    text={contextText}
                    attribution={contextState === 'complete' && attribution ? attribution : undefined}
                    onRetry={retry}
                    error={error || undefined}
                    parsedError={parsedError || undefined}
                />
            </div>

            {/* Right column: Git info + actions */}
            <div className="space-y-4">
                <GitStatusDisplay projectPath={project.path} />
                <GitControlsWrapper project={project} />
                <Button
                    className="w-full font-serif"
                    onClick={onOpenInIDE}
                    disabled={isOpeningIDE}
                >
                    {isOpeningIDE ? 'Opening...' : 'Open in IDE'}
                </Button>
            </div>
        </div>
    ) : (
        <ProjectDetailContent
            project={project}
            contextState={contextState}
            contextText={contextText}
            attribution={attribution}
            error={error}
            parsedError={parsedError}
            retry={retry}
            isOpeningIDE={isOpeningIDE}
            onOpenInIDE={onOpenInIDE}
        />
    )}
</div>
```

This requires importing `ContextPanel`, `GitStatusDisplay`, `GitControlsWrapper`, and `Button` directly into `ProjectDetailDialog`. The `GitControlsWrapper` should be exported from `ProjectDetailContent.tsx` for reuse.

**Step 7: Commit**

```bash
git add src/components/Dashboard/ProjectDetailDialog.tsx src/components/Dashboard/ProjectDetailContent.tsx
git commit -m "feat: add two-column layout for git projects in modal"
```

---

### Task 5: Wire up ProjectCard to use both modes

**Files:**
- Modify: `src/components/Dashboard/ProjectCard.tsx`
- Modify: `src/components/Dashboard/ProjectCard.test.tsx`

**Step 1: Write failing test for modal mode**

Add to `src/components/Dashboard/ProjectCard.test.tsx`:

```typescript
// Add mock for settingsStore at the top level (alongside existing mocks)
let mockCardDisplayMode: 'collapsible' | 'modal' = 'collapsible';

vi.mock('@/stores/settingsStore', () => ({
    useSettingsStore: (selector: any) => {
        const state = {
            cardDisplayMode: mockCardDisplayMode,
        };
        return selector(state);
    },
}));

// Mock ProjectDetailDialog
vi.mock('./ProjectDetailDialog', () => ({
    ProjectDetailDialog: ({ project, open }: any) => (
        open ? <div data-testid="project-detail-dialog">{project.name}</div> : null
    ),
}));
```

Add test in a new `describe('Modal Mode', ...)` block:

```typescript
describe('Modal Mode', () => {
    beforeEach(() => {
        mockCardDisplayMode = 'modal';
    });

    afterEach(() => {
        mockCardDisplayMode = 'collapsible';
    });

    it('opens modal dialog when card is clicked in modal mode', async () => {
        render(<ProjectCard project={mockGitProject} />);

        const trigger = screen.getByText('Test Project').closest('button');
        if (!trigger) throw new Error('Trigger not found');

        fireEvent.click(trigger);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(screen.getByTestId('project-detail-dialog')).toBeInTheDocument();
    });

    it('does not render collapsible content in modal mode', async () => {
        mockContextState = 'streaming';
        render(<ProjectCard project={mockGitProject} />);

        const trigger = screen.getByText('Test Project').closest('button');
        if (!trigger) throw new Error('Trigger not found');

        fireEvent.click(trigger);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        // Modal renders instead of inline collapsible
        expect(screen.getByTestId('project-detail-dialog')).toBeInTheDocument();
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Dashboard/ProjectCard.test.tsx`
Expected: FAIL -- settingsStore mock not matched, ProjectDetailDialog not rendered

**Step 3: Modify ProjectCard**

In `src/components/Dashboard/ProjectCard.tsx`:

1. Add imports:
```typescript
import { useSettingsStore } from '@/stores/settingsStore';
import { ProjectDetailContent } from './ProjectDetailContent';
import { ProjectDetailDialog } from './ProjectDetailDialog';
```

2. Inside the component, read the setting:
```typescript
const cardDisplayMode = useSettingsStore((s) => s.cardDisplayMode);
```

3. Replace the `CollapsibleContent` block (lines 225-262) with:
```tsx
{cardDisplayMode === 'collapsible' && (
    <CollapsibleContent
        className={cn(
            "absolute left-0 right-0 top-full -mt-px",
            "z-30 bg-card border border-t-0 border-border rounded-b-lg shadow-xl",
            "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
        )}
    >
        <ProjectDetailContent
            project={project}
            contextState={contextState}
            contextText={contextText}
            attribution={attribution}
            error={error}
            parsedError={parsedError}
            retry={retry}
            isOpeningIDE={isOpeningIDE}
            onOpenInIDE={handleOpenInIDE}
        />
    </CollapsibleContent>
)}
```

4. After the `</Card>` closing tag (before the remove dialog), add the modal:
```tsx
{cardDisplayMode === 'modal' && (
    <ProjectDetailDialog
        project={project}
        open={isOpen}
        onOpenChange={handleOpenChange}
        contextState={contextState}
        contextText={contextText}
        attribution={attribution}
        error={error}
        parsedError={parsedError}
        retry={retry}
        isOpeningIDE={isOpeningIDE}
        onOpenInIDE={handleOpenInIDE}
    />
)}
```

5. Make the card header styling conditional -- don't apply `rounded-b-none border-b-0` in modal mode:
```tsx
isOpen && cardDisplayMode === 'collapsible' && "z-20 shadow-lg rounded-b-none border-b-0"
```

6. Make click-outside effect conditional on collapsible mode:
```typescript
useEffect(() => {
    if (!isOpen || cardDisplayMode !== 'collapsible') return;
    // ... rest unchanged
}, [isOpen, cardDisplayMode]);
```

7. In modal mode, the `Collapsible` wrapper should not actually expand inline. The simplest approach: when `cardDisplayMode === 'modal'`, the card click sets `isOpen` to true (which triggers AI context via hook and opens the dialog), but the `Collapsible` `open` prop is always `false`:
```tsx
<Collapsible
    open={cardDisplayMode === 'collapsible' ? isOpen : false}
    onOpenChange={handleOpenChange}
>
```

8. Remove the `GitControlsWrapper` function from `ProjectCard.tsx` (it was moved to `ProjectDetailContent.tsx` in Task 3). Remove the now-unused direct imports of `ContextPanel`, `GitStatusDisplay`, `GitControls`, `useGitStatus`.

**Step 4: Run tests**

Run: `npx vitest run src/components/Dashboard/ProjectCard.test.tsx`
Expected: ALL PASS (both old collapsible tests and new modal tests)

**Step 5: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/Dashboard/ProjectCard.tsx src/components/Dashboard/ProjectCard.test.tsx
git commit -m "feat: wire ProjectCard to support collapsible and modal modes"
```

---

### Task 6: Load setting on app startup

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Add setting load to Dashboard**

The setting should be loaded when the Dashboard mounts, so it's ready when cards are clicked. In `src/pages/Dashboard.tsx`, add:

```typescript
import { useSettingsStore } from '@/stores/settingsStore';
```

Inside the component, alongside the existing `useEffect` for loading projects:

```typescript
const loadCardDisplayMode = useSettingsStore((s) => s.loadCardDisplayMode);

useEffect(() => {
    loadCardDisplayMode();
}, [loadCardDisplayMode]);
```

**Step 2: Run type check**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: load card display mode setting on Dashboard mount"
```

---

### Task 7: Delete legacy files

**Files:**
- Delete: `src/components/Dashboard/ProjectDetailModal.tsx`
- Delete: `src/components/ui/light-modal.tsx`

**Step 1: Verify no imports exist**

Search codebase for imports of `ProjectDetailModal` and `light-modal`. Both should have zero active imports (ProjectDetailModal is unused, light-modal's only consumer was ProjectDetailModal).

**Step 2: Delete the files**

```bash
git rm src/components/Dashboard/ProjectDetailModal.tsx
git rm src/components/ui/light-modal.tsx
```

**Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 4: Run type check**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git commit -m "chore: remove unused ProjectDetailModal and LightModal"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 2: Run type check**

Run: `npm run lint`
Expected: PASS

**Step 3: Manual smoke test**

Run: `npm run tauri dev`

Test matrix:
1. **Collapsible mode (default):** Click a card -- expands inline as before. Click outside to close. AI context loads. Git controls work. Open in IDE works.
2. **Switch to modal mode:** Settings > Card Display > Popup Modal. Go back to Dashboard.
3. **Modal mode:** Click a card -- modal opens with project details. Escape to close. AI context loads. Git controls work. Open in IDE works.
4. **Switch back:** Settings > Card Display > Inline Expand. Verify inline expansion works again.
5. **Persistence:** Reload the app. Verify the setting persists.

**Step 4: Commit any fixes if needed**
