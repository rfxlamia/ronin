# Story 3.5: AI Attribution Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see what data the AI based its context on**,
So that **I can trust and verify the AI's reasoning**.

## Definition of Done

- [x] All 5 acceptance criteria pass manual verification
- [x] Backend unit tests for attribution counting pass
- [x] Frontend tests for ContextPanel attribution display pass
- [x] UI matches UX Spec (Always visible "Based on:", Expandable details)

## Acceptance Criteria

1. **Backend Attribution Logic (Fix Technical Debt)**
   - [x] **CRITICAL:** Fix the hardcoded "0 commits" issue from Story 3.4
   - [x] `build_git_context` returns accurate count of commits analyzed (limit is usually 20)
   - [x] `build_git_context` returns accurate count of file diffs/uncommitted files
   - [x] `ai-complete` event payload includes fully populated `attribution` object:
     ```json
     {
       "commits": 15,
       "files_analyzed": 3,
       "sources": ["git"] // Future: ["git", "devlog"]
     }
     ```

2. **Always Visible Attribution Bar**
   - [x] "Based on:" line is ALWAYS visible when context generation is complete
   - [x] Located at bottom of ContextPanel (or appropriate location per design)
   - [x] Uses clear iconography: 🔀 (Git), 📝 (DEVLOG - future), 🔍 (Behavior - future)
   - [x] Text format: "Based on: 15 commits · 3 files"

3. **Expandable Source Details**
   - [x] Clicking the attribution bar expands/collapses detailed view
   - [x] Expanded view shows list of sources (e.g., "Git History (Last 20 commits)")
   - [x] Animation: Smooth expand/collapse (200ms)
   - [x] Focus management: Keyboard accessible (Enter/Space to toggle)

4. **Visual Design & Typography**
   - [x] Uses **JetBrains Mono** for the attribution text (Technical/Data)
   - [x] Uses **Lucide React** icons (`GitCommit`, `FileText`, etc.)
   - [x] Text color: `text-muted-foreground` (subtle but readable)
   - [x] Hover state: Subtle background change or underline to indicate interactiveness

5. **Empty/Error State Handling**
   - [x] If 0 commits found, display appropriate message (e.g., "Based on: Empty repository")
   - [x] If attribution data missing, hide bar or show safe fallback

## Tasks / Subtasks

- [x] **Backend: Implement Attribution Counting** (`src-tauri/src/ai/openrouter.rs`, `src-tauri/src/commands/ai.rs`)
  - [x] **CRITICAL:** Added `Attribution` struct in `openrouter.rs` with `commits`, `files`, and `sources` fields
  - [x] Updated `chat_stream` to accept `Attribution` parameter and emit it with `ai-complete` event
  - [x] Updated `generate_context` in `ai.rs` to build `Attribution` from `git_context.commits.len()` and `git_context.status.modified_files.len()`
  - [x] Ensure `Attribution` struct is serializable and matches frontend expectation

- [x] **Frontend: Update Types** (`src/types/context.ts` and `src/hooks/useAiContext.ts`)
  - [x] Updated `Attribution` interface with `files` field:
    ```typescript
    export interface Attribution {
      commits: number;
      files: number;
      sources: string[];
    }
    ```

- [x] **Frontend: Enhance ContextPanel** (`src/components/ContextPanel.tsx`)
  - [x] Collapsible component already exists in project
  - [x] Imported `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
  - [x] Imported icons from `lucide-react`: `GitCommitHorizontal`, `FileText`, `ChevronDown`
  - [x] Created expandable `Attribution` sub-component
  - [x] Implemented "Always Visible" summary line with commit/file counts
  - [x] Implemented expanded details view showing source breakdown
  - [x] Added accessibility attributes (aria-expanded, aria-controls)

- [x] **Frontend: Style & Polish**
  - [x] Applied JetBrains Mono font (`font-mono`)
  - [x] Styled borders/backgrounds to match Ronin theme (Use `ring-ronin-brass` for focus)
  - [x] Verified dark mode contrast with `text-muted-foreground`

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
Claude Sonnet 4 (Codebuff)

### Debug Log References
- `src-tauri/src/ai/openrouter.rs` - Added `Attribution` struct and updated `chat_stream`
- `src-tauri/src/commands/ai.rs` - Build attribution from git context
- `src/components/ContextPanel.tsx` - Expandable attribution bar implementation

### Completion Notes List
- [x] Backend attribution logic fixed - `Attribution` struct now captures actual commit count and file count from git context
- [x] ContextPanel updated with expandable attribution using Radix Collapsible
- [x] All TypeScript types updated to include `files` field
- [x] Added new tests for empty repository and expandable attribution bar
- [x] All 57 Rust backend tests pass
- [x] All 7 ContextPanel frontend tests pass
- [x] TypeScript type checking passes with no errors

## File List

- `src-tauri/src/ai/openrouter.rs` - Added `Attribution` struct, updated `chat_stream` signature, added 3 serialization tests
- `src-tauri/src/commands/ai.rs` - Build and pass attribution data to streaming, documented cache design
- `src/types/context.ts` - Single source of truth for `AttributionData` type
- `src/hooks/useAiContext.ts` - Now imports `AttributionData` from `types/context.ts`
- `src/components/ContextPanel.tsx` - Implemented expandable attribution bar, removed blinking animations
- `src/components/ContextPanel.test.tsx` - Updated tests for new attribution format, added expandable test
- `src/components/Dashboard/ProjectCard.tsx` - Simplified attribution prop passing
- `src/components/Dashboard/ProjectCard.test.tsx` - Updated mock attribution type
- `src/pages/TestContextPanel.tsx` - Updated mock attribution data
- `docs/sprint-artifacts/sprint-status.yaml` - Status updated to done

## Change Log

- **2025-12-21**: Implemented AI Attribution Display (Story 3.5)
  - Fixed hardcoded "0 commits" issue from Story 3.4
  - Backend now passes actual commit and file counts in `ai-complete` event
  - ContextPanel shows expandable attribution bar with icons and source details
  - Keyboard accessible (Enter/Space to toggle expand/collapse)
  - Empty repository and missing attribution states handled gracefully

- **2025-12-21**: Code Review Fixes (Senior Developer Review)
  - Documented cache design (context text accumulates frontend-side, not stored)
  - Consolidated `Attribution` type - single source in `types/context.ts`
  - Added 3 unit tests for `Attribution` struct serialization in Rust
  - Fixed dashboard blinking UX by removing `animate-fade-in` from state divs
  - All 60 Rust tests + 132 frontend tests pass
