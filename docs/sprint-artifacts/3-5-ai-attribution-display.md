# Story 3.5: AI Attribution Display

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see what data the AI based its context on**,
So that **I can trust and verify the AI's reasoning**.

## Definition of Done

- [ ] All 5 acceptance criteria pass manual verification
- [ ] Backend unit tests for attribution counting pass
- [ ] Frontend tests for ContextPanel attribution display pass
- [ ] UI matches UX Spec (Always visible "Based on:", Expandable details)

## Acceptance Criteria

1. **Backend Attribution Logic (Fix Technical Debt)**
   - [ ] **CRITICAL:** Fix the hardcoded "0 commits" issue from Story 3.4
   - [ ] `build_git_context` returns accurate count of commits analyzed (limit is usually 20)
   - [ ] `build_git_context` returns accurate count of file diffs/uncommitted files
   - [ ] `ai-complete` event payload includes fully populated `attribution` object:
     ```json
     {
       "commits": 15,
       "files_analyzed": 3,
       "sources": ["git"] // Future: ["git", "devlog"]
     }
     ```

2. **Always Visible Attribution Bar**
   - [ ] "Based on:" line is ALWAYS visible when context generation is complete
   - [ ] Located at bottom of ContextPanel (or appropriate location per design)
   - [ ] Uses clear iconography: 🔀 (Git), 📝 (DEVLOG - future), 🔍 (Behavior - future)
   - [ ] Text format: "Based on: 15 commits · 3 files"

3. **Expandable Source Details**
   - [ ] Clicking the attribution bar expands/collapses detailed view
   - [ ] Expanded view shows list of sources (e.g., "Git History (Last 20 commits)")
   - [ ] Animation: Smooth expand/collapse (200ms)
   - [ ] Focus management: Keyboard accessible (Enter/Space to toggle)

4. **Visual Design & Typography**
   - [ ] Uses **JetBrains Mono** for the attribution text (Technical/Data)
   - [ ] Uses **Lucide React** icons (`GitCommit`, `FileText`, etc.)
   - [ ] Text color: `text-muted-foreground` (subtle but readable)
   - [ ] Hover state: Subtle background change or underline to indicate interactiveness

5. **Empty/Error State Handling**
   - [ ] If 0 commits found, display appropriate message (e.g., "Based on: Empty repository")
   - [ ] If attribution data missing, hide bar or show safe fallback

## Tasks / Subtasks

- [ ] **Backend: Implement Attribution Counting** (`src-tauri/src/ai/context.rs`)
  - [ ] **CRITICAL:** Refactor `build_git_context` to return a `ContextBuildResult` struct containing both `system_prompt` (String) and `attribution` (Attribution struct).
  - [ ] Modify `GitContext` struct to include `commit_count` and `file_count` fields if missing
  - [ ] Update `build_git_context` to populate these counts from the git command output
  - [ ] Update `generate_context` in `src-tauri/src/commands/ai.rs` to destructure the new return type: use `system_prompt` for AI and `attribution` for the event payload.
  - [ ] Ensure `Attribution` struct is serializable and matches frontend expectation

- [ ] **Frontend: Update Types** (`src/types/context.ts` or `src/hooks/useAiContext.ts`)
  - [ ] Update `Attribution` interface:
    ```typescript
    export interface Attribution {
      commits: number;
      files: number;
      sources: string[];
    }
    ```

- [ ] **Frontend: Enhance ContextPanel** (`src/components/ContextPanel.tsx`)
  - [ ] Run `npx shadcn@latest add collapsible` to install the component.
  - [ ] Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
  - [ ] Import icons from `lucide-react`: `GitCommitHorizontal`, `FileText`, `ChevronDown`
  - [ ] Create `AttributionBar` sub-component
  - [ ] Implement "Always Visible" summary line
  - [ ] Implement expanded details view
  - [ ] Add accessibility attributes (aria-expanded, aria-controls)

- [ ] **Frontend: Style & Polish**
  - [ ] Apply JetBrains Mono font (`font-mono`)
  - [ ] Style borders/backgrounds to match Ronin theme (Use `ring-ronin-brass` for focus)
  - [ ] Verify dark mode contrast

## Manual Test Notes (Product Lead Verification)

### Test Case 1: Happy Path (Attribution Data)
**Steps:**
1. Open a project with known git history (e.g., Ronin itself).
2. Expand the project card to trigger AI generation.
3. Wait for context to complete.
**Expected Result:**
- Attribution bar appears at bottom: "Based on: X commits · Y files".
- Clicking the bar expands to show details.
- Icons are visible and correct.

### Test Case 2: Empty Repository
**Steps:**
1. Create a new empty project/folder.
2. Expand the project card.
**Expected Result:**
- Attribution bar shows "Based on: Empty repository" or "0 commits".
- No crash or undefined errors.

## Dev Notes

### Architecture
- **Data Flow:** Backend `generate_context` -> `ContextBuilder` -> `GitContext` -> Event `ai-complete` -> Frontend `useAiContext` -> `ContextPanel`.
- **The "Fix":** Story 3.4 left the attribution count as a placeholder (`0`). This story MUST implement the actual counting logic in Rust by parsing the `git log` output size or explicitly counting the entries in the vector.

### UI/UX Details
- **Icons:** Use `lucide-react`.
  - Git: `GitCommitHorizontal` or `GitGraph`
  - File: `FileText` or `FileCode`
  - Expand: `ChevronDown` (rotate on open)
- **Typography:**
  - Summary: `text-xs font-mono text-muted-foreground`
  - "Based on:": `font-semibold`

### Code Snippet (Backend Logic Idea)
```rust
// src-tauri/src/ai/context.rs
pub struct GitContext {
    pub commits: Vec<String>,
    // ...
}

impl GitContext {
    pub fn attribution(&self) -> Attribution {
        Attribution {
            commits: self.commits.len(),
            files: self.uncommitted_files.len(), // example
            sources: vec!["git".to_string()],
        }
    }
}
```

### References
- [UX Spec: Attribution Display](docs/ux-design-specification.md#story-35-ai-attribution-display)
- [Story 3.4 Completion Notes](docs/sprint-artifacts/3-4-ai-context-generation.md) (Mentions hardcoded fix needed)
- [Lucide Icons](https://lucide.dev)

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References
- Check `src-tauri/src/ai/context.rs` for `build_git_context` implementation details.

### Completion Notes List
- [ ] Backend attribution logic fixed
- [ ] ContextPanel updated with expandable attribution
