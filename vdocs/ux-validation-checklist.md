# UX Validation Checklist for Story Development

**Purpose:** Ensure UX quality during development, not after completion  
**When to Use:** Mid-story, after functional implementation but before marking story complete  
**Owner:** Alice (Product Owner) validates, Dev agent executes

---

## Checklist

### Visual Design
- [ ] Typography follows hierarchy (Libre Baskerville for CTAs/headings, Work Sans for body, JetBrains Mono for code)
- [ ] Colors use design tokens (--ronin-primary, --ronin-secondary, etc.)
- [ ] Spacing is generous (Claude-inspired, not cramped)
- [ ] Icons + text used together (not color-only for accessibility)

### Interaction Design
- [ ] Animations respect timing tokens (100ms fast, 200ms normal, 300ms slow)
- [ ] `prefers-reduced-motion` respected (animations disabled or minimal)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible (Antique Brass ring, ≥3px)
- [ ] Loading states use RoninLoader (not spinner)

### Content & Messaging
- [ ] Error messages are empathetic (仁 Jin principle)
- [ ] Suggestions phrased as recommendations, not commands (勇 Yu principle)
- [ ] No productivity shaming or time tracking language
- [ ] Technical jargon minimized for user-facing text

### Performance
- [ ] No layout shift during interactions
- [ ] Smooth animations (no jank)
- [ ] Responsive to user input (<100ms feedback)

### Accessibility
- [ ] ARIA labels on interactive elements
- [ ] Screen reader announcements for dynamic content (aria-live)
- [ ] Color contrast ≥4.5:1 (WCAG AA)
- [ ] Keyboard-only navigation possible

### Integration
- [ ] Component integrates with existing UI (no visual inconsistency)
- [ ] State management works across component boundaries
- [ ] No console errors or warnings

---

## Usage in Story Workflow

**Step 1: Functional Implementation**
- Dev agent implements acceptance criteria
- All tests passing
- Feature works functionally

**Step 2: UX Validation (NEW)**
- Dev agent runs through this checklist
- Fixes any UX issues found
- Documents UX improvements in story file

**Step 3: Manual Testing**
- Product Owner validates UX quality
- Confirms checklist items
- Story marked complete only after UX validation passes

---

## Example: Story 3.3 (ContextPanel)

**Without UX Validation (Original):**
- Functional: ✅ ContextPanel displays, expands, collapses
- UX Issues: Layout shift when expanding, cards jump down
- Result: Post-implementation fix needed (overlay expansion)

**With UX Validation (Improved):**
- Functional: ✅ ContextPanel displays, expands, collapses
- UX Check: ⚠️ Layout shift detected during expansion
- Fix Applied: Overlay expansion mode implemented
- Result: No post-implementation rework needed

---

**Status:** ✅ Process Improvement Active  
**Applies to:** All stories starting with Epic 4
