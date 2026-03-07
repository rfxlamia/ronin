# Card Display Mode: Modal Alternative for Project Cards

## Problem

The dashboard currently has one UX path for viewing project details: clicking a card expands it inline via a collapsible overlay. Some users prefer a popup modal instead. We need to support both modes without regression.

## Decision

Strategy pattern with shared content. Extract the expanded card content into a reusable `ProjectDetailContent` component, then render it in either a `CollapsibleContent` (current) or a Radix `Dialog` (new), based on a user setting.

Default mode: collapsible (preserves current behavior for existing users).

## Setting & Persistence

| Key | Values | Default |
|-----|--------|---------|
| `card_display_mode` | `"collapsible"` \| `"modal"` | `"collapsible"` |

Stored in the existing `settings` key-value table via `get_setting` / `update_setting`. No Rust changes needed.

Frontend: `cardDisplayMode` added to `settingsStore.ts` with `loadCardDisplayMode()` and `setCardDisplayMode()` actions.

Settings UI: A "Card Display" section in the Settings page (between Appearance and Silent Observer) with two options: "Inline Expand" and "Popup Modal".

## Component Architecture

```
ProjectCard (card header + kebab menu, unchanged)
├── reads cardDisplayMode from settingsStore
├── if "collapsible" → CollapsibleContent (current behavior)
├── if "modal" → ProjectDetailDialog (Radix Dialog)
│
├── Both render:
│   └── ProjectDetailContent (new shared component)
│       ├── ContextPanel (AI context)
│       ├── GitStatusDisplay
│       ├── GitControlsWrapper
│       └── "Open in IDE" button
```

### New files

- `src/components/Dashboard/ProjectDetailContent.tsx` -- Extracted content block. Accepts props for AI context state, project, and handlers.
- `src/components/Dashboard/ProjectDetailDialog.tsx` -- Radix Dialog wrapper with two-column layout.

### Modified files

- `ProjectCard.tsx` -- Extract content, conditionally render collapsible or dialog
- `settingsStore.ts` -- Add `cardDisplayMode` state + load/set actions
- `Settings.tsx` -- Add "Card Display" section

### Deleted files

- `ProjectDetailModal.tsx` -- Unused legacy component
- `light-modal.tsx` -- Only consumer was ProjectDetailModal

### Hooks unchanged

`useAiContext` and `useGitStatus` remain called inside `ProjectCard` and `GitControlsWrapper`. Results passed as props to `ProjectDetailContent`.

## Modal Layout

```
┌─────────────────────────────────────────────┐
│  Project Name                               │
│  🔥 Active   5 days ago                     │
├──────────────────────┬──────────────────────┤
│                      │  ⑂ main              │
│                      │  ⚠ 1 uncommitted     │
│   AI Context         │  ◷ Last commit 9d    │
│   (scrollable)       │                      │
│                      │  ┌──────────────────┐│
│                      │  │ Commit Changes   ││
│                      │  └──────────────────┘│
│                      │  ┌──────────────────┐│
│                      │  │ Open in IDE      ││
│                      │  └──────────────────┘│
└──────────────────────┴──────────────────────┘
```

- Max width: `sm:max-w-2xl` (~672px)
- Header: Project name (Libre Baskerville), type icon, health badge, activity text
- Left column (~60%): ContextPanel, max-h-[400px] overflow-y-auto
- Right column (~40%): GitStatusDisplay, GitControlsWrapper, "Open in IDE"
- Responsive: Single-column stacked on narrow viewports
- Dismiss: Escape + click backdrop (Radix default), no explicit close button
- Non-git projects: Right column only has "Open in IDE", collapses to single column

## Interaction & Edge Cases

**Mode switching:** Takes effect immediately via Zustand reactivity. If a collapsible card is open when user switches to modal mode, it stays open until next interaction.

**AI context:** Generation triggers on modal open, same `isOpen ? project.id : null` pattern.

**One modal at a time:** Radix Dialog enforces this naturally.

**Git controls:** Commit editing, AI sparkle, push flow all work identically -- `GitControls` is reused as-is.

**Kebab menu:** Stays on the card header in both modes. Remove confirmation dialog renders independently.

**Click-outside logic:** Only activates in collapsible mode. Modal mode uses Radix backdrop.

**Keyboard:** Modal gets focus trap, Escape to close, return focus to card on close (Radix defaults).

**No regression areas:** `useAiContext` hook untouched, `GitControls` internal state untouched, search/filter/grid unchanged.
