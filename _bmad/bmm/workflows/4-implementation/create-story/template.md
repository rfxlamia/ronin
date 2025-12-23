# Story 3.3: ContextPanel Component

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see AI context appearing progressively in my project card**,
So that **I feel the system is working and get early information**.

## Acceptance Criteria

1. **ContextPanel Component**
   - [ ] Implements 4-state machine: `idle`, `streaming`, `complete`, `error`
   - [ ] `idle`: Hidden or minimal placeholder
   - [ ] `streaming`: Displays `RoninLoader` and streams text progressively (chunk-by-chunk)
   - [ ] `complete`: Displays full context text + attribution source
   - [ ] `error`: Displays error illustration + message + retry button

2. **RoninLoader Integration**
   - [ ] `RoninLoader` supports inline mode (not just full screen)
   - [ ] Shows "Analyzing your activity..." pulse text during streaming
   - [ ] Respects `prefers-reduced-motion` (static fallback)

3. **Attribution Display**
   - [ ] "Based on:" section is ALWAYS visible (not hidden behind click)
   - [ ] Shows icons for data sources: 🔀 (Git), 🔍 (Behavior/Search), 📝 (DEVLOG)
   - [ ] Counts are visible (e.g., "15 commits", "3 searches")

4. **ProjectCard Integration**
   - [ ] `ProjectCard` uses `Collapsible` to expand in-place (replacing/complementing `ProjectDetailModal` for quick view)
   - [ ] Clicking card expands it to show `ContextPanel`
   - [ ] Transition is smooth (200ms ease-out)

5. **Accessibility**
   - [ ] Screen reader announces new content as it streams (ARIA live region)
   - [ ] Keyboard focus management when expanding/collapsing

## Tasks / Subtasks

- [ ] **Refactor RoninLoader.tsx**
  - [ ] Add `variant` prop ('fullscreen' | 'inline')
  - [ ] Implement inline styling (smaller size, no backdrop)
  - [ ] Add `prefers-reduced-motion` check

- [ ] **Implement ContextPanel.tsx**
  - [ ] Define `ContextPanelState` type (idle, streaming, complete, error)
  - [ ] Create UI for `streaming` state (Loader + StreamingText)
  - [ ] Create UI for `complete` state (Markdown content + Attribution)
  - [ ] Create UI for `error` state (Error illustration + Retry)
  - [ ] Implement `Attribution` sub-component

- [ ] **Update ProjectCard.tsx**
  - [ ] Replace `ProjectDetailModal` trigger with `Collapsible` trigger (or keep modal for "deep dive" and use Collapsible for quick context)
  - [ ] *Decision:* For this story, aim for **Collapsible** as per UX spec.
  - [ ] Embed `ContextPanel` inside the collapsible content area

- [ ] **Mock AI Service (Temporary)**
  - [ ] Create a mock function to simulate streaming chunks for testing UI states

## Dev Notes

- **Architecture:** The `ContextPanel` is a "dumb" UI component in this story. The actual AI logic comes in Story 3.4. For now, drive it with local state or mocks.
- **UX Spec Alignment:** "Card behavior: Expandable in-place with AI context".
- **Styling:** Use `AnimatePresence` (framer-motion) or CSS transitions for smooth expand/collapse if possible, or standard Tailwind transitions.
- **Font:** Use `JetBrains Mono` for the AI text output.

### Project Structure Notes

- `src/components/ContextPanel.tsx` currently exists as a sidebar/modal. **REFACTOR** it to be the inline component.
- `src/components/RoninLoader.tsx` currently exists as fullscreen. **UPDATE** it.
- `src/components/Dashboard/ProjectCard.tsx` needs to import `ContextPanel`.

### References

- [UX Spec: ContextPanel Component](docs/ux-design-specification.md#3-contextpanel)
- [Architecture: Component State Machine](docs/architecture.md#component-state-machine---contextpanel-example)
- [UX Spec: Loading State](docs/ux-design-specification.md#loading-state-progressive-sequence)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
