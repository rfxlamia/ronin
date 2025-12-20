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
   - [ ] `streaming`: Displays `RoninLoader` (inline) and streams text progressively (chunk-by-chunk)
   - [ ] `complete`: Displays full context text + attribution source
   - [ ] `error`: Displays error illustration + message + retry button

2. **RoninLoader Integration**
   - [ ] `RoninLoader` supports `inline` mode while maintaining `fullscreen` default for AppShell
   - [ ] Shows "Analyzing your activity..." pulse text during streaming
   - [ ] Respects `prefers-reduced-motion` (static fallback)

3. **Attribution Display**
   - [ ] "Based on:" section is ALWAYS visible (not hidden behind click)
   - [ ] Shows icons for data sources: 🔀 (Git), 🔍 (Behavior/Search), 📝 (DEVLOG)
   - [ ] Counts are visible (e.g., "15 commits", "3 searches")

4. **ProjectCard Integration**
   - [ ] `ProjectCard` uses `Collapsible` (Radix UI) to expand in-place
   - [ ] Clicking card expands it to show `ContextPanel`
   - [ ] Transition is smooth (200ms ease-out) using CSS/Tailwind

5. **Accessibility**
   - [ ] Screen reader announces new content as it streams (ARIA live region)
   - [ ] Keyboard focus management when expanding/collapsing

## Technical Implementation Guide

### Interfaces & Types (Contract)
Defining the contract early ensures smooth integration with logic in Story 3.4.

```typescript
// src/types/context.ts (Create if needed)

export type ContextPanelState = 'idle' | 'streaming' | 'complete' | 'error';

export interface AttributionData {
  commits?: number;
  devlogLines?: number;
  searches?: number;
  sources: ('git' | 'devlog' | 'behavior')[];
}

export interface ContextPanelProps {
  state: ContextPanelState;
  text: string; // The streamed content
  attribution?: AttributionData;
  error?: string;
  onRetry?: () => void;
  className?: string;
}
```

### Component Updates

1.  **`src/components/RoninLoader.tsx`**
    *   **Refactor:** Add `variant` prop.
    *   **Default:** `variant="fullscreen"` (Preserve existing AppShell behavior).
    *   **New:** `variant="inline"` (Smaller size, no backdrop, minimal padding).

2.  **`src/components/ContextPanel.tsx`**
    *   **Refactor:** Convert existing sidebar/modal implementation to the new inline component.
    *   **Animation:** Use Tailwind with Radix `data-state` for smooth height transition. DO NOT install `framer-motion` unless absolutely necessary (keep bundle small).
    *   **Styling:** Use `font-mono` (JetBrains Mono) for the AI text.

### Mock Data Structure
Use this structure for the temporary mock service to match future AI output.

```typescript
// Mock response for streaming
const mockChunks = [
  "Based on recent commits,",
  " you were working on",
  " the auth service refactor.",
  " Last change was in",
  " src/lib/auth.ts."
];

// Mock attribution
const mockAttribution: AttributionData = {
  commits: 12,
  devlogLines: 0,
  sources: ['git']
};
```

### Edge Case Handling

**1. Cancel In-Flight Streaming:**
If user triggers state change (retry, refresh) during streaming:
- Clear any pending setTimeout timers (mock streaming)
- Reset chunks array to empty
- Transition to new state cleanly

**2. Empty Attribution Data:**
If all attribution counts are 0 or sources array is empty:
- Show fallback: "Based on: Git history only"
- Don't show "Based on: 🔀 0 · 🔍 0 · 📝 0" (confusing)

**3. Very Long AI Context (>500 words):**
- ContextPanel max-height: 400px
- Overflow: auto (scrollable within panel)
- Prevents card from dominating viewport

### Mock Streaming Timing

**Timing Specification:**
- Interval between chunks: 200ms
- Total duration: ~1s (5 chunks × 200ms)
- Implementation: `setTimeout` loop, NOT setInterval (easier to cancel)

**Example Implementation:**
```typescript
// Example mock streaming implementation
const simulateStreaming = async () => {
  for (let i = 0; i < mockChunks.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    setStreamedText(prev => prev + mockChunks[i]);
  }
  setState({ type: 'complete', context: fullText, attribution: mockAttribution });
};
```

## Tasks / Subtasks

- [ ] **Refactor RoninLoader.tsx**
  - [ ] Add `variant` prop ('fullscreen' | 'inline') with 'fullscreen' default
  - [ ] Implement inline styling (smaller size, no backdrop)
    - `variant="fullscreen"` (default): 48px × 48px, centered with backdrop
    - `variant="inline"`: 24px × 24px, no backdrop, no padding, display: inline-block
    - Animation: Same pulse for both variants, just different size
  - [ ] Add `prefers-reduced-motion` check
    - Reduced motion: Opacity fade (0.7 → 1.0 → 0.7) instead of scale pulse

- [ ] **Implement ContextPanel.tsx**
  - [ ] Define types in `src/types/context.ts` (as per guide)
  - [ ] Create UI for `streaming` state (Loader + StreamingText)
  - [ ] Create UI for `complete` state (Markdown content + Attribution)
  - [ ] Create UI for `error` state (Error illustration + Retry)
  - [ ] Implement `Attribution` sub-component

- [ ] **Update ProjectCard.tsx**
  - [ ] **First:** Locate existing ProjectCard component (Glob "**/ProjectCard.tsx")
  - [ ] **If not found:** Create at `src/components/ProjectCard/ProjectCard.tsx` (check Story 2.2 spec)
  - [ ] Implement `Collapsible` (Radix) structure
  - [ ] Add Tailwind/CSS keyframes for expand/collapse animation (on `data-state="open/closed"`)
  - [ ] Embed `ContextPanel` inside the collapsible content area

- [ ] **Dev/Test Harness**
  - [ ] Create test page at `src/pages/TestContextPanel.tsx` (React route, not production)
  - [ ] OR create standalone HTML file at `test/context-panel.html` (simpler for quick iteration)
  - [ ] Render `ContextPanel` in all 4 states side-by-side for visual comparison
  - [ ] Add buttons to trigger state transitions (Trigger Streaming, Simulate Error, Reset)
  - [ ] Implement mock function with `setTimeout` to simulate chunk streaming (200ms intervals)

- [ ] **Regression Testing (REQUIRED)**
  - [ ] Run `npm test` to verify all tests pass (Epic 1-2 tests + new Story 3.3 tests)
  - [ ] Verify test count increases (not decreases) - per project-context.md lines 280-288
  - [ ] No failures in existing tests (ProjectCard, RoninLoader if it existed before)

## Dev Notes

- **Architecture:** The `ContextPanel` is a "dumb" UI component in this story. The actual AI logic comes in Story 3.4.

### State Transition Flow

```
idle → streaming → complete
  ↓        ↓           ↓
  └─────→ error ←──────┘
            ↓
        (retry) → streaming
```

**Transition Rules:**
- `idle` → `streaming`: User expands card (ProjectCard click)
- `streaming` → `complete`: All chunks received, no errors
- `streaming` → `error`: Timeout, API error, or mock error
- `error` → `streaming`: User clicks Retry button
- `complete` → `streaming`: User clicks Refresh button (future feature)
- **Cancel in-flight:** If transitioning from `streaming`, clear any pending chunk timers

---

### Radix Collapsible Integration Pattern

**Implementation Example:**

```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

<Collapsible>
  <CollapsibleTrigger asChild>
    <div className="project-card-header">
      {/* Project name, health badge, last activity */}
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent className="collapsible-content">
    <ContextPanel
      state={contextState}
      text={contextText}
      attribution={attribution}
      error={errorMessage}
      onRetry={handleRetry}
    />
  </CollapsibleContent>
</Collapsible>
```

**Animation Styling:**

Radix automatically handles `data-state` attributes. Add Tailwind transition:

```css
.collapsible-content {
  transition: height 200ms ease-out, opacity 200ms ease-out;
  overflow: hidden;
}
```

---

- **Styling:** Use standard Tailwind utilities. For Radix Collapsible animation:
  ```css
  /* Example utility for tailwind.config or CSS */
  .collapsible-content {
    overflow: hidden;
  }
  .collapsible-content[data-state='open'] {
    animation: slideDown 200ms ease-out;
  }
  .collapsible-content[data-state='closed'] {
    animation: slideUp 200ms ease-out;
  }
  ```
- **Font:** Use `JetBrains Mono` for the AI text output.

### References

- [UX Spec: ContextPanel Component](docs/ux-design-specification.md#3-contextpanel)
- [Architecture: Component State Machine](docs/architecture.md#component-state-machine---contextpanel-example)
- [UX Spec: Loading State](docs/ux-design-specification.md#loading-state-progressive-sequence)

## Manual Test Notes (Product Lead Verification)

### Test Case 1: ContextPanel State Machine

**Steps:**
1. Open test harness page (e.g., `/test/context-panel` or dev route)
2. Observe initial idle state (nothing shown)
3. Click "Trigger Streaming" button
4. Watch chunks appear progressively with RoninLoader
5. Observe complete state with full attribution

**Expected Result:**
- Idle state shows nothing or minimal placeholder
- Streaming shows RoninLoader inline + "Analyzing your activity..." pulse
- Chunks appear every ~200ms (5 total)
- Complete state shows full text + "Based on: 🔀 12 · 🔍 0 · 📝 DEVLOG"
- Attribution section always visible (not collapsed)

**Actual Result:** [To be filled during verification]

---

### Test Case 2: Error State & Retry

**Steps:**
1. In test harness, trigger "Simulate Error" button
2. Observe error state UI
3. Click "Retry" button
4. Verify state transitions back to streaming

**Expected Result:**
- Error state shows error illustration + empathetic message + retry button
- Retry button triggers transition to streaming state
- New streaming attempt starts cleanly (no leftover chunks from previous attempt)

**Actual Result:** [To be filled during verification]

---

### Test Case 3: Accessibility

**Steps:**
1. Enable browser DevTools → Rendering → "Emulate CSS prefers-reduced-motion"
2. Trigger streaming state
3. Verify RoninLoader shows static fallback (no animation)
4. Disable reduced motion, verify animation returns
5. Use keyboard only: Tab to ProjectCard, press Enter to expand
6. Verify ContextPanel content announced by screen reader (test with NVDA/Orca)

**Expected Result:**
- Reduced motion: RoninLoader static (opacity fade only)
- Keyboard: Tab focus visible, Enter expands card
- Screen reader: Announces "Analyzing your activity..." then content chunks as they stream

**Actual Result:** [To be filled during verification]

---

### Test Case 4: ProjectCard Integration

**Steps:**
1. Open dashboard (if available) or test route with multiple ProjectCard instances
2. Click different cards to expand
3. Verify ContextPanel appears inside expanded card
4. Verify Collapsible animation smooth (200ms ease-out)
5. Click outside or press Escape to collapse
6. Verify multiple cards can expand/collapse independently

**Expected Result:**
- Collapsible animation smooth, no jank
- ContextPanel positioned correctly inside card
- Transition duration: 200ms
- Each card state independent

**Actual Result:** [To be filled during verification]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List