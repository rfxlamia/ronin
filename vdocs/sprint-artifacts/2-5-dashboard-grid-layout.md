# Story 2.5: Dashboard Grid Layout

Status: done

## Story

As a **user**,
I want **a responsive dashboard grid that shows all my projects**,
so that **I can see my entire project landscape at once ("Map Moment")**.

## Acceptance Criteria

1. **Responsive Grid Layout**
   - Grid adapts columns based on window width (breakpoints from UX Spec):
     - **< 900px**: 1 Column
     - **900px - 1200px**: 2 Columns
     - **> 1200px**: 3 Columns
   - Consistent gap of **16px** (Tailwind `gap-4`) between cards.
   - Cards fill available width in their column.

2. **Virtualization (Performance NFR2, NFR28)**
   - Dashboard handles 100+ projects without DOM bloat.
   - Only visible rows are rendered in the DOM.
   - Uses **Row Virtualization** strategy (chunking projects into rows).
   - Handles dynamic height changes (expanding cards) correctly without layout thrashing.

3. **Loading State**
   - Displays **ProjectCardSkeleton** while data is loading.
   - Skeleton matches the dimensions and layout of the real card (Title, Badge, Stats).
   - No layout shift (CLS) when switching from skeleton to real data.
   - First meaningful content visible < 500ms (NFR23).

4. **Empty State Integration**
   - If project list is empty (and not loading), show the `EmptyState` component (from Story 2.1).
   - If projects exist, show the `DashboardGrid`.

5. **Visual Polish**
   - Generous whitespace (Claude-inspired).
   - No scrollbar flickering.
   - Smooth transitions when cards expand.
   - Respects `prefers-reduced-motion` (instant resize/reorder if enabled).

## Manual Test Notes (Product Lead Verification)

### Test Case 1: Responsive Layout
**Steps:**
1. Open Dashboard with 5+ projects.
2. Resize window from 800px to 1400px.
3. Observe column count changes.

**Expected Result:**
- < 900px: 1 column
- 900px - 1200px: 2 columns
- > 1200px: 3 columns
- Transitions are smooth (or instant if reduced motion on)

### Test Case 2: Virtualization & Scrolling
**Steps:**
1. Scroll down the list of projects.
2. Observe the DOM (Inspect Element).

**Expected Result:**
- Only visible rows (plus buffer) are in the DOM.
- Scrolling is buttery smooth (60fps).
- No visual glitches or "jumping" scrollbar.

### Test Case 3: Expanding Cards
**Steps:**
1. Click a card in a multi-column row.
2. Observe the row behavior.

**Expected Result:**
- Card expands showing details.
- The entire row height increases to match the expanded card.
- No layout thrashing or overlap.

## Tasks / Subtasks

- [x] **Dependencies & Setup**
  - [x] Install `@tanstack/react-virtual` for virtualization.
  - [x] Add `Skeleton` component from shadcn/ui (`npx shadcn@latest add skeleton`).
  - [x] Create `src/hooks/useWindowSize.ts` utility hook for responsive logic.

- [x] **Components Implementation**
  - [x] Create `src/components/Dashboard/ProjectCardSkeleton.tsx`:
    - [x] Match `ProjectCard` height (~120px collapsed).
    - [x] Include placeholders for Title (height of Libre Baskerville), Badge, and Footer stats.
  - [x] Create `src/components/Dashboard/DashboardGrid.tsx`:
    - [x] Implement `useWindowSize` to determine `numColumns`.
    - [x] Implement data chunking: `useMemo` to split `projects` into `rows` (arrays of `numColumns` items).
    - [x] Implement `useVirtualizer` on the `rows` array.
    - [x] Render virtual rows with Flexbox/Grid layout for columns.
    - [x] Attach `measureElement` ref to row containers for dynamic height support.
    - [x] **Accessibility:** Verify `Tab` navigation flows logically through virtual items.

- [x] **Integration**
  - [x] Update `src/pages/Dashboard.tsx` (main Dashboard view):
    - [x] Replace simple list/map with `DashboardGrid`.
    - [x] Handle `isLoading` state from `projectStore` -> Show `ProjectCardSkeleton` grid.
    - [x] Handle empty state -> Show `EmptyState`.

- [x] **Testing**
  - [x] Test resizing window across breakpoints (verify column changes).
  - [x] Test expanding cards (verify no overlap/layout break in virtual list).
  - [x] Test large list performance (100+ projects in tests).
  - [x] **Regression:** Run `npm test` to ensure no regressions in existing components.

## Dev Notes

### Virtualization Strategy: "Row Chunking"
Since `@tanstack/react-virtual` is 1D (list) focused, and we need a 2D responsive grid, use the **Row Chunking Pattern**:

```typescript
// 1. Calculate columns based on width
const columns = width < 900 ? 1 : width < 1200 ? 2 : 3;

// 2. Chunk data into rows
const rows = useMemo(() => {
  const result = [];
  for (let i = 0; i < projects.length; i += columns) {
    result.push(projects.slice(i, i + columns));
  }
  return result;
}, [projects, columns]);

// 3. Virtualize the ROWS
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 140, // Estimated row height
  measureElement: (el) => el.getBoundingClientRect().height, // CRITICAL for expanding cards
});
```

### Dynamic Height Caveat
When a card expands in a multi-column row, the **entire row** will grow to match the tallest item (default Flexbox behavior). This is **acceptable and desired** behavior for the "Map" view. Ensure the virtualizer's `measureElement` is correctly attached to the row container so it recalculates scroll positions when a card expands.

### Skeleton Strategy
Do not virtualize skeletons (overkill). Just render a static grid of ~6-9 skeletons based on the current column count to fill the viewport.

### Architecture Compliance
- **ADR-8**: Adopted `@tanstack/react-virtual` for performance.
- **ADR-1**: Use `projectStore` for data access.

## Dev Agent Record

### Agent Model Used
Claude 3.7 Sonnet (2025-01-19)

### Completion Notes List

**Implementation Summary:**
- Implemented responsive dashboard grid with row-based virtualization using @tanstack/react-virtual
- Created useWindowSize hook with debouncing (150ms) for performant window resize handling
- Created ProjectCardSkeleton component matching ProjectCard dimensions to prevent layout shift
- Created DashboardGrid component with row-chunking pattern for 2D responsive grid
- Updated Dashboard to show skeleton grid during loading, then virtualized grid or empty state
- All tests passing (70/70) including unit tests for all new components

**Technical Approach:**
- Row-chunking virtualization: Projects are chunked into rows based on column count (1/2/3)
- Responsive breakpoints: < 900px (1 col), 900-1200px (2 cols), > 1200px (3 cols)
- Dynamic height support: measureElement ref attached to row containers for expanding cards
- Loading state: Responsive skeleton grid (3 rows × current column count)

**Testing:**
- useWindowSize: 2 tests (initial dimensions, cleanup)
- ProjectCardSkeleton: 4 tests (structure, dimensions, placeholders, shadcn integration)
- DashboardGrid: 6 tests (grid rendering, empty state, responsive columns, virtualization)
- All existing tests pass (no regressions)

### Changes During Manual Testing

**1. Virtualization Threshold Fix (blinking on card expand)**
- Issue: Virtualization caused blinking/re-render when expanding cards for small project counts
- Fix: Skip virtualization for < 20 projects, use simple CSS grid instead
- File: `src/components/Dashboard/DashboardGrid.tsx`

**2. Added delete_project Backend Command**
- Purpose: Enable manual testing of empty state (no UI delete button existed)
- Files: `src-tauri/src/commands/projects.rs`, `src-tauri/src/lib.rs`
- Note: Frontend delete button was added then reverted. Backend command kept for Story 2-8 (Remove/Untrack Project)
- Logic: Deletes project from database only, does NOT delete actual files (correct "untrack" behavior)

### File List

**New Files:**
- src/hooks/useWindowSize.ts
- src/hooks/useWindowSize.test.ts
- src/components/Dashboard/ProjectCardSkeleton.tsx
- src/components/Dashboard/ProjectCardSkeleton.test.tsx
- src/components/Dashboard/DashboardGrid.tsx
- src/components/Dashboard/DashboardGrid.test.tsx
- src/components/ui/skeleton.tsx

**Modified Files:**
- src/pages/Dashboard.tsx
- src/components/Dashboard/ProjectCard.tsx (added onExpandChange callback for virtualizer)
- src-tauri/src/commands/projects.rs (added delete_project command)
- src-tauri/src/lib.rs (registered delete_project command)
- package.json
- package-lock.json

## Senior Developer Review (AI)

### Review Date
2025-12-19

### Issues Found & Fixed

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | 🔴 HIGH | All new files untracked in git | ✅ All files staged via `git add` |
| 2 | 🔴 HIGH | `prefers-reduced-motion` not implemented | ✅ Already handled globally in `index.css` (lines 232-241) |
| 3 | 🔴 HIGH | `measureElement` not triggered on card expand | ✅ Added `onExpandChange` callback to `ProjectCard`, `DashboardGrid` calls `rowVirtualizer.measure()` after expansion |
| 4 | 🟡 MEDIUM | Debug console.log statements in Dashboard.tsx | ✅ Removed lines 29, 31, 35 |
| 5 | 🟡 MEDIUM | Column tests don't assert gridTemplateColumns | ✅ Added `toHaveStyle` assertions for 1/2/3 column layouts |
| 6 | 🟡 MEDIUM | useWindowSize missing debounce tests | ✅ Added 3 tests: debounce behavior, custom delay, rapid resize consolidation |
| 7 | 🟡 MEDIUM | ProjectCardSkeleton height test weak | ✅ Added overflow-hidden check and flex container verification |
| 8 | 🟢 LOW | Inconsistent Tailwind vs inline styles | ⏭️ Deferred (functional, not critical) |
| 9 | 🟢 LOW | No Dashboard loading state test | ⏭️ Deferred (skeleton tests exist in component level) |

### Test Results
- **Before:** 70/70 tests passing
- **After:** 73/73 tests passing (+3 new debounce tests)

### Verdict
✅ **APPROVED** - All HIGH and MEDIUM issues resolved. Story ready for done status.

### Known Limitation

**Git projects show database `updated_at` instead of actual last activity.** This is expected behavior until Epic 5 (Git Operations) implements git commit date parsing. Folder projects correctly show filesystem last modified dates.
