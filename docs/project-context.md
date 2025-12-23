---
project_name: 'ronin'
user_name: 'V'
date: '2025-12-17'
sections_completed: ['technology_stack', 'ux_rules', 'architecture_rules', 'philosophy_rules', 'testing_rules']
---

# Project Context for AI Agents

_Critical rules that AI agents MUST follow when implementing code for Ronin. Focus on unobvious details._

---

## Technology Stack & Versions

| Layer | Technology | Notes |
|-------|------------|-------|
| **Desktop** | Tauri v2 | Rust backend + React webview |
| **Frontend** | React 19.2.3, TypeScript | Strict mode, verified safe (no CVE) |
| **UI** | shadcn/ui + Tailwind CSS | Copy-paste components, NOT npm |
| **Backend** | Rust (stable), Tokio | Async runtime |
| **Database** | SQLite + WAL mode | Local-first, ACID |
| **AI** | OpenRouter API | Cloud LLM, graceful offline |
| **Git** | Shell commands (MVP) | `git` CLI, NOT git2-rs yet |
| **File Watch** | notify crate | inotify on Linux |

**Security Note:** React 19.2.3 verified safe. CVSS 10.0 RCE vulnerability affected 19.0.0-19.2.0 only. Code review workflow includes security analysis.

---

## UX Rules (CRITICAL - From UX Spec)

### Typography Hierarchy

| Element | Font | MUST USE |
|---------|------|----------|
| **Logo, Headings, Project names** | Libre Baskerville (serif) | ✅ Required |
| **CTAs, Buttons** | Libre Baskerville (serif) | ✅ Required |
| **Body, UI text** | Work Sans (sans) | ✅ Required |
| **Code, paths, git info, AI context** | JetBrains Mono (mono) | ✅ Required |

**Font files:** `public/fonts/` - ALL fonts preload during 1s loading screen.

### Color Tokens

```css
/* Light Mode */
--ronin-primary: #CC785C;      /* Antique Brass - CTAs */
--ronin-secondary: #828179;    /* Friar Gray - muted */
--ronin-background: #F0EFEA;   /* Cararra */
--ronin-surface: #FFFFFF;
--ronin-text: #141413;         /* Cod Gray */

/* Dark Mode */
--ronin-background-dark: #141413;
--ronin-text-dark: #F0EFEA;
```

### Component Rules

| Component | Implementation |
|-----------|----------------|
| **ProjectCard** | Use Radix Collapsible (via shadcn) for expand/collapse |
| **HealthBadge** | Icon + color + text (NOT color-only) |
| **Loading states** | RoninLoader animation, NOT spinner |
| **AI attribution** | ALWAYS visible ("Based on: ..."), NOT collapsed |

### Animation Rules

```css
--animation-fast: 100ms;
--animation-normal: 200ms;
--animation-slow: 300ms;
```

**MUST respect `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

### Performance Targets

| Metric | Target | MUST NOT exceed |
|--------|--------|-----------------|
| Dashboard load | <500ms | Local SQLite only |
| AI first content | <2s | Show local data first |
| AI complete | <10s | Stream in chunks |
| Context payload | <10KB | Summarized, not raw |

---

## Architecture Rules

### Memory Budgets (ENFORCED)

| Component | Budget | Violation = Bug |
|-----------|--------|-----------------|
| GUI total | <200MB RSS | Profile before merge |
| Silent Observer | <50MB RSS | Runs 24/7 |
| Per-project overhead | <1MB | Lazy load cards |

### Data Flow

```
Silent Observer → Context Aggregator → AI Consultant
     ↓                    ↓
  SQLite              <10KB payload
(local only)         (to OpenRouter)
```

**NEVER send raw behavioral logs to AI.** Always summarize first.

### Graceful Degradation

| Failure | Behavior | MUST show |
|---------|----------|-----------|
| No internet | Dashboard works | "Offline mode" badge |
| AI timeout | Show local data | "Taking longer..." + Retry |
| AI error | Show cached context | "AI unavailable" + local fallback |

### Git Operations

- **MVP:** Use `std::process::Command` with `git` CLI
- **NEVER** store git credentials
- **Commit and Push are SEPARATE buttons** (user must consciously push)
- **Warn if remote ahead** before allowing push

---

## Philosophy Rules (義勇仁礼智)

### 義 (Gi) - Behavior Over Documentation

- AI inference works WITHOUT DEVLOG (80% accuracy target)
- DEVLOG enhances to 90%, but is OPTIONAL
- Track behavior to help, NOT to judge

### 勇 (Yu) - AI Suggests, Never Commands

❌ WRONG: "You must fix this bug"
✅ RIGHT: "Suggestion: try Arc<Mutex<>>"

❌ WRONG: "You were unproductive"
✅ RIGHT: "You were stuck on auth.rs"

### 仁 (Jin) - Empathetic Messaging

| Context | Bad | Good |
|---------|-----|------|
| Error | "Failed to parse" | "Something went wrong. [Retry]" |
| Rate limit | "Rate limit exceeded" | "AI resting. Try again in 30s" |
| Stuck detection | "Unproductive time" | "You were stuck here" |

### 礼 (Rei) - Loading as Ritual

- Loading animation = ronin meditation → ready stance
- Loading text = "Analyzing your activity..." NOT "Loading..."
- Loading feels intentional, NOT broken

### 智 (Chi) - Resourcefulness

- MUST work on 8GB laptop
- No fan spin-up during idle (<1% CPU)
- Efficient data structures (no N² algorithms in hot paths)

---

## Testing Rules

### Test Structure

```
src/
  components/
    ProjectCard/
      ProjectCard.tsx
      ProjectCard.test.tsx  ← Co-located
```

### What to Test

| Component | Test Focus |
|-----------|------------|
| ProjectCard | Keyboard expand/collapse, ARIA states |
| HealthBadge | All variants, NOT color-only |
| ContextPanel | Streaming states, error recovery |
| RoninLoader | `prefers-reduced-motion` respected |

### Accessibility Tests (REQUIRED)

- All interactive elements keyboard-accessible
- WCAG 2.1 AA color contrast (≥4.5:1)
- Screen reader announces state changes

---

## Code Style Rules

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectCard.tsx` |
| Hooks | camelCase with `use` | `useProjectContext.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `ProjectTypes.ts` |

### Import Order

```typescript
// 1. React/external
import { useState } from 'react';
import { Card } from '@/components/ui/card';

// 2. Internal components
import { ProjectCard } from '@/components/ProjectCard';

// 3. Utils/types
import { formatDate } from '@/lib/utils';
import type { Project } from '@/types';
```

### Error Handling

```typescript
// ALWAYS handle errors with user-friendly messages
try {
  await aiConsultant.getContext(projectId);
} catch (error) {
  // Show empathetic error, NOT technical details
  toast.error("Couldn't analyze this time. Try again?");
  // Log technical details for debugging
  console.error('AI context error:', error);
}
```

---

## Development Workflow Rules

### Asset Generation Protocol (Epic 2+)

**Sequence during dev-story:**
1. Build logic with HTML placeholders using `.ronin-placeholder` class
2. Flag when placeholders are present
3. Ask: "Do you want to run /generateimage workflow?"
4. If yes: Analyze prompt → Generate via Nano Banana Pro → Select variant → Convert (PNG→SVG→TSX)

**Placeholder Standard:**
```tsx
<div className="ronin-placeholder" style={{ width: '48px', height: '48px' }}>
  [Icon Name]
</div>
```

**CSS Class:** `.ronin-placeholder` in `src/index.css` - dashed Antique Brass border with striped background (visually obvious, unsearchable)

### Manual Test Notes (Epic 2+)

**Required in all story files with user interactions:**
```markdown
## Manual Test Notes (Product Lead Verification)

### Test Case 1: [Feature Name]
**Steps:**
1. [Action]
2. [Action]

**Expected Result:**
- [Specific outcome]
- [Visual state]

**Actual Result:** [To be filled during verification]
```

**Purpose:** Product Lead (V) can personally verify story implementation by following test steps.

### Regression Testing Protocol (Epic 2+)

**Before marking any story done:**
1. Run all tests from current epic
2. Run all tests from previous epics
3. Verify no regressions introduced
4. Test count must grow incrementally (never decrease)

**Command:** `npm test` (must pass 100%)

---

## Critical Don't-Miss Rules

### ❌ NEVER DO

1. **Never show productivity scores or time tracking** - violates 義 (Gi)
2. **Never send raw behavioral logs to cloud** - privacy violation
3. **Never use color-only status indicators** - accessibility violation
4. **Never block UI waiting for AI** - always show local data first
5. **Never auto-push to git** - user must consciously choose
6. **Never use system fonts** - always use Libre Baskerville/Work Sans/JetBrains Mono
7. **Never use spinning loader** - use RoninLoader meditation animation

### ✅ ALWAYS DO

1. **Always show AI attribution** ("Based on: 15 edits, 3 searches")
2. **Always respect `prefers-reduced-motion`**
3. **Always provide offline fallback**
4. **Always use serif (Libre Baskerville) for CTAs and headings**
5. **Always separate Commit and Push buttons**
6. **Always show empathetic error messages**
7. **Always lazy-load project cards for 100+ projects**

---

## Reference Documents

### Epic 4 - DEVLOG Editor

| File | Purpose | When to Read |
|------|---------|--------------|
| `docs/sprint-artifacts/codemirror-research-2025-12-21.md` | CodeMirror 6 integration guide with setup, custom keymaps, and auto-save patterns | Read when creating Story 4.1 (DEVLOG Editor Component) |
| `docs/sprint-artifacts/devlog-conflict-ui-spec-2025-12-21.md` | File conflict resolution UI specification with dialog mockup and implementation notes | Read when creating Story 4.2 (File Sync with Repository) |
| `docs/ux-validation-checklist.md` | UX validation checklist for mid-story quality checks | Read during ALL story development (before marking complete) |

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+R` | Open/focus Ronin (global) |
| `Ctrl+Shift+D` | Open DEVLOG editor modal (global) |
| `Ctrl+K` | Focus search (in-app) |
| `Escape` | Close expanded card |
| `Enter` | Expand focused card |
| `Tab` | Navigate cards |

### Status Icons (MVP - emoji, v0.3 - custom SVG)

| Status | Icon | Color |
|--------|------|-------|
| Active | 🔥 | Green tint |
| Dormant | 😴 | Gray/muted |
| Stuck | ⚠️ | Amber |
| Attention | 📌 | Antique Brass |

---

_Last updated: 2025-12-21_
_Source: PRD, Architecture, UX Spec, Philosophy, Epic 3 Retrospective_

when you creating story 4.5-4 and 4.5-5 its important to read this document = docs/sprint-change-proposal-2025-12-23.md

_Last updated: 2025-12-23_
_Source: docs/sprint-change-proposal-2025-12-23.md_