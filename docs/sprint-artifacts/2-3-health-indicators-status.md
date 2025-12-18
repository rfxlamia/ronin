# Story 2.3: Health Indicators & Status Logic

**Epic:** 2 - Dashboard & First Launch Experience
**Story Key:** 2-3-health-indicators-status
**Status:** ready-for-dev

---

## Story

As a **user**,
I want **visual indicators showing project health status**,
so that **I can immediately see which projects need attention**.

## Acceptance Criteria

1. **Status Logic Implementation**
   - System determines status based on priority order:
     1. **Stuck (⚠️):** (Reserved for Epic 6 - placeholder logic for now).
     2. **Needs Attention (📌):** Project is **Git** type AND has **uncommitted changes** (> 0).
     3. **Active (🔥):** `daysSinceActivity` <= `dormancyThreshold` (default 14).
     4. **Dormant (😴):** `daysSinceActivity` > `dormancyThreshold`.
   - Logic correctly distinguishes between Git and Generic projects (Generic projects cannot be "Needs Attention" based on git status).

2. **Configuration Support**
   - Logic accepts a `dormancyThreshold` parameter (days).
   - Default threshold is **14 days**.

3. **Visual Integration**
   - `ProjectCard` displays the calculated status using the `HealthBadge` component (from Story 2.2).
   - Status calculation happens on the frontend using available project data (`lastActivity`, `uncommittedCount`).

4. **Testing**
   - Unit tests verify all logic branches (Active, Dormant, Attention, Stuck priority).
   - Edge cases (0 days, exact threshold) are covered.

## Tasks / Subtasks

- [ ] **Define Status Types & Constants**
  - [ ] Define `ProjectHealth` type (active, dormant, stuck, attention) in `src/types/project.ts` (or similar).
  - [ ] Define default constants (e.g., `DEFAULT_DORMANCY_THRESHOLD = 14`).

- [ ] **Implement Logic Module**
  - [ ] Create `src/lib/logic/projectHealth.ts`.
  - [ ] Implement `calculateProjectHealth(project, threshold)` function.
  - [ ] Ensure it handles missing data gracefully (e.g., if `uncommittedCount` is undefined, assume 0).

- [ ] **Unit Testing**
  - [ ] Create `src/lib/logic/projectHealth.test.ts`.
  - [ ] Test case: Git project with uncommitted changes -> Attention.
  - [ ] Test case: Generic project with uncommitted (should be impossible/ignored) -> Active/Dormant.
  - [ ] Test case: Recent activity -> Active.
  - [ ] Test case: Old activity -> Dormant.
  - [ ] Test case: Boundary condition (activity == threshold).

- [ ] **UI Integration**
  - [ ] Update `ProjectCard.tsx` to call `calculateProjectHealth`.
  - [ ] Pass the result to `HealthBadge`.
  - [ ] (Optional) Add a temporary mock for `uncommittedCount` in `Dashboard.tsx` to verify "Needs Attention" state visually until Epic 5.

## Dev Notes

### Architecture & Logic
- **Priority Matters:** "Needs Attention" overrides "Active". If I have uncommitted changes, it doesn't matter if I worked 1 hour ago or 5 days ago - it needs attention (or at least, that's the logic for "uncommitted" often implies unfinished work). *Correction:* "Needs Attention" usually implies *dormant* + *uncommitted* in some systems, but PRD FR3 says "User can see project health...". FR3 doesn't explicitly define priority.
- **Refined Priority (Architecture Decision):**
  - **Stuck** is highest (something is wrong).
  - **Needs Attention** (Uncommitted) is high priority context.
  - **Active** implies things are moving.
  - **Dormant** implies nothing is happening.
  - *Decision:* Let's treat "Needs Attention" as an overlay or high priority state for Git projects. If you have uncommitted changes, you should probably commit them.
  - *Refined Logic:*
    - IF `stuck` -> **Stuck**
    - ELSE IF `isGit` AND `uncommitted > 0` -> **Needs Attention**
    - ELSE IF `days <= threshold` -> **Active**
    - ELSE -> **Dormant**

### Data Sources
- `Project` interface (from `src/stores/projectStore.ts` or `src/types`) needs:
  - `type`: 'git' | 'folder'
  - `lastActivityAt`: string | Date
  - `uncommittedChanges`: number (optional/nullable)
  - `isStuck`: boolean (optional, reserved for Epic 6)

### File Structure
- `src/lib/logic/` - New directory for pure logic/business rules (separation of concerns).
- `src/types/` - Ensure central types are here.

### References
- [Architecture - Cross-Cutting Concerns](../architecture.md#cross-cutting-concerns-identified)
- [Story 2.2](../sprint-artifacts/2-2-projectcard-component.md) (HealthBadge component)

## Manual Test Notes (Product Lead Verification)

### Test Case 1: Active vs Dormant
**Steps:**
1. Mock a project with `lastActivity` = today. Verify status is **Active** (🔥).
2. Mock a project with `lastActivity` = 20 days ago. Verify status is **Dormant** (😴).

### Test Case 2: Needs Attention (Git)
**Steps:**
1. Mock a **Git** project with `uncommittedChanges` = 1.
2. Verify status is **Needs Attention** (📌).
3. Mock a **Folder** project with `uncommittedChanges` = 1 (if possible via type).
4. Verify status is **Active** or **Dormant** (Folder mode shouldn't track git status).

### Test Case 3: Threshold Config
**Steps:**
1. Change threshold to 5 days.
2. Verify a project inactive for 10 days changes from Active (if previous threshold was 14) to Dormant.

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
