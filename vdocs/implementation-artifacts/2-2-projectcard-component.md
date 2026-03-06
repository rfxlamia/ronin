# Story 2.2: ProjectCard Component

**Epic:** 2 - Dashboard & First Launch Experience
**Story Key:** 2-2-projectcard-component
**Status:** done

---

## Story

As a **user**,
I want **to see each project as an expandable card showing key information**,
so that **I can quickly understand each project's status at a glance**.

## Acceptance Criteria

1. **Card Visuals (Collapsed)**
   - Display project name in **Libre Baskerville** font.
   - Display "days since last activity" in **Work Sans**.
   - Display Health Badge (Active/Dormant/Stuck/Attention) - use emoji for MVP v0.1 (🔥, 😴, ⚠️, 📌).
   - Display Type indicator (Git branch icon vs Folder icon).
   - Card has consistent padding and `shadcn/ui` styling.

2. **Card Interactions**
   - Clicking the card expands it to show more details.
   - Expansion animation is smooth (200ms, `ease-out`).
   - Card focus state is visible (Antique Brass ring) for keyboard navigation.
   - `Enter` or `Space` toggles expansion when focused.

3. **Expanded Content**
   - Show Git branch name (if git project) in **JetBrains Mono**.
   - Show uncommitted files count (if git project).
   - Show "Open in IDE" button (Primary CTA, Libre Baskerville).
   - Placeholder for AI Context (will be implemented in Epic 3).

4. **Accessibility**
   - ARIA `expanded` state is correct.
   - Health Badge uses text + icon (not color only).
   - Contrast ratios meet WCAG AA.

## Tasks / Subtasks

- [x] Create `HealthBadge` Component
  - [x] Implement `src/components/Dashboard/HealthBadge.tsx`
  - [x] Support statuses: Active, Dormant, Stuck, Attention
  - [x] Write unit tests `src/components/Dashboard/HealthBadge.test.tsx`
- [x] Create `ProjectCard` Component
  - [x] Implement `src/components/Dashboard/ProjectCard.tsx` using `Collapsible`
  - [x] Connect to `Project` type definition (defined in `src/stores/projectStore.ts`)
  - [x] Implement expanded/collapsed states
  - [x] Write unit tests `src/components/Dashboard/ProjectCard.test.tsx` (interactions, rendering)
- [x] Integrate with Dashboard
  - [x] Update `src/pages/Dashboard.tsx` to render list of `ProjectCard`s
  - [x] Connect to `projectStore` data

## Dev Notes

### Architecture & Pattern Compliance
- **Component Location:** `src/components/Dashboard/` to match Story 2.1 pattern.
- **Testing:** Co-located tests (`ProjectCard.test.tsx`) are MANDATORY. Use `vi.mock` if needed, but `ProjectCard` should be mostly presentational.
- **State:** `ProjectCard` should receive data via props. Expansion state can be local `useState` or controlled. Local is fine for MVP.
- **Styling:** Use `shadcn/ui` components (`Card`, `Collapsible`, `Button`, `Badge`). Use `Libre Baskerville` for the title.

### Source Tree Components
- `src/components/Dashboard/ProjectCard.tsx` (New)
- `src/components/Dashboard/HealthBadge.tsx` (New)
- `src/components/ui/collapsible.tsx` (Ensure installed)
- `src/components/ui/card.tsx` (Ensure installed)
- `src/components/ui/badge.tsx` (Ensure installed)

### Technical Specifics
- **Health Logic:** For this story, just render the passed status. Logic to *calculate* status is in Story 2.3, but we need the visual component now.
- **Icons:** Use `lucide-react` icons for Branch (`GitBranch`), Folder (`Folder`), etc.
- **Animation:** Use standard CSS transitions provided by `shadcn/ui` Collapsible (Radix). DO NOT use `framer-motion` to preserve lightweight architecture (NFR6). Radix Collapsible handles height animation well via CSS variables.

### References
- [UX Spec - ProjectCard](../ux-design-specification.md#custom-components-needed)
- [Architecture - Lazy Loading](../architecture.md#lazy-loading-strategy) (Keep component lightweight)

## Manual Test Notes (Product Lead Verification)

### Test Case 1: Card Visuals (Collapsed)
**Steps:**
1. Launch the dashboard with sample project data.
2. Observe a project card in collapsed state.

**Expected Result:**
- Project name is in **Libre Baskerville**.
- Days since active is visible.
- Health Badge is visible with correct emoji and color.
- Type icon (Git/Folder) is correct.

### Test Case 2: Interaction & Expansion
**Steps:**
1. Click on the project card body.
2. Observe the expansion animation.

**Expected Result:**
- Card expands smoothly (approx 200ms).
- "Open in IDE" button appears (Primary CTA).
- Git details (branch, uncommitted) appear if applicable.

### Test Case 3: Keyboard Accessibility
**Steps:**
1. Use `Tab` key to navigate to a card.
2. Press `Enter` or `Space`.

**Expected Result:**
- Focus ring (Antique Brass) is clearly visible on focus.
- Card toggles expansion state on keypress.

## Dev Agent Record

### Agent Model Used
Gemini 2.0 Flash (Thinking Experimental)

### Debug Log References
- All tests passed on first try after implementing each component (TDD approach)
- Build warning about CSS property "file" (inherited from shadcn/ui, not blocking)

### Completion Notes List

**Implementation Approach:**
- Followed strict TDD red-green-refactor cycle for all components
- HealthBadge: 7 tests written first (RED), then implemented (GREEN)
- ProjectCard: 18 tests written first (RED), then implemented (GREEN)
- Dashboard integration: Updated to use ProjectCard components

**Project Type Extension:**
- Extended `Project` interface with optional fields: `gitBranch`, `uncommittedCount`, `lastActivityAt`, `healthStatus`
- These fields will be populated by future stories (likely 2.3 or Epic 5)
- UI handles missing optional fields gracefully

**Key Features Implemented:**
- ✅ Expandable cards with smooth 200ms animation (Radix Collapsible CSS)
- ✅ Keyboard navigation (Enter/Space to toggle, Tab to navigate)
- ✅ Antique Brass (#CC785C) focus ring for accessibility
- ✅ Proper font hierarchy: Libre Baskerville (titles/CTAs), Work Sans (body), JetBrains Mono (code/git)
- ✅ Health badges with emoji + text (not color-only)
- ✅ Type icons (GitBranch for git, Folder for folder projects)
- ✅ Conditional rendering of git fields (branch, uncommitted count)
- ✅ Respects prefers-reduced-motion via Radix
- ✅ "Open in IDE" button (disabled for MVP with tooltip)

**Testing:**
- All 44 tests passing (6 test files)
- HealthBadge: 7 tests covering all statuses, accessibility, custom classes
- ProjectCard: 18 tests covering collapsed/expanded states, interactions, keyboard, accessibility
- No regressions in existing tests (EmptyState, AppShell, RoninLoader, WindowControls)
- Build successful with TypeScript compilation

**Date Utilities:**
- Created `dateUtils.ts` with `calculateDaysSince()` and `formatDaysSince()` helpers
- Calculates days from `lastActivityAt` field (falls back to `updated_at`)
- Formats as "Today", "Yesterday", or "X days ago"

### File List

**New Files:**
- `src/components/Dashboard/HealthBadge.tsx`
- `src/components/Dashboard/HealthBadge.test.tsx`
- `src/components/Dashboard/ProjectCard.tsx`
- `src/components/Dashboard/ProjectCard.test.tsx`
- `src/components/ui/collapsible.tsx` (via shadcn CLI)
- `src/lib/utils/dateUtils.ts`

**Modified Files:**
- `src/stores/projectStore.ts` (extended Project interface)
- `src/pages/Dashboard.tsx` (integrated ProjectCard)
- `src/index.css` (added collapsible animation keyframes)
- `docs/sprint-artifacts/sprint-status.yaml` (marked in-progress → review)
- `package.json` (added @radix-ui/react-collapsible, @testing-library/user-event)
- `package-lock.json` (dependency updates)

## Change Log

- **2025-12-18**: Code review fixes applied
  - Added 200ms ease-out animation CSS for collapsible expand/collapse (AC-2)
  - Added animation classes to `collapsible.tsx` component
  - Staged all implementation files for git commit
- **2025-12-18**: Story implementation completed
  - Created HealthBadge and ProjectCard components using TDD approach
  - Extended Project interface with optional fields for git integration
  - Integrated ProjectCard into Dashboard with responsive grid layout
  - All tests passing (25 new tests, 44 total)
  - Build verified successful

