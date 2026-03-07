# Settings Sidebar Outline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a sticky sidebar outline to the Settings page for quick navigation between sections.

**Architecture:** Presentational `SettingsSidebar` component rendered inside Settings page. Settings page manages active section state via `IntersectionObserver` and passes scroll handler to sidebar. Two-column flex layout replaces current single-column.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, IntersectionObserver API, Vitest + React Testing Library

**Design doc:** `docs/plans/2026-03-07-settings-sidebar-outline-design.md`

---

### Task 1: SettingsSidebar Component — Failing Tests

**Files:**
- Create: `src/components/settings/SettingsSidebar.test.tsx`

**Step 1: Write failing tests for SettingsSidebar**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSidebar } from './SettingsSidebar';

const mockSections = [
  { id: 'ai-provider', label: 'AI Provider' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'card-display', label: 'Card Display' },
];

describe('SettingsSidebar', () => {
  it('renders all section labels', () => {
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="ai-provider"
        onSectionClick={vi.fn()}
      />
    );

    expect(screen.getByText('AI Provider')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Card Display')).toBeInTheDocument();
  });

  it('highlights the active section', () => {
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="appearance"
        onSectionClick={vi.fn()}
      />
    );

    const activeItem = screen.getByText('Appearance').closest('button');
    expect(activeItem?.className).toMatch(/border-l-2/);
    expect(activeItem?.className).toMatch(/font-medium/);
  });

  it('calls onSectionClick with section id when clicked', () => {
    const onClick = vi.fn();
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="ai-provider"
        onSectionClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('Card Display'));
    expect(onClick).toHaveBeenCalledWith('card-display');
  });

  it('shows title attribute for tooltip on each item', () => {
    render(
      <SettingsSidebar
        sections={mockSections}
        activeSection="ai-provider"
        onSectionClick={vi.fn()}
      />
    );

    const item = screen.getByText('AI Provider').closest('button');
    expect(item).toHaveAttribute('title', 'AI Provider');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/settings/SettingsSidebar.test.tsx`
Expected: FAIL — module `./SettingsSidebar` not found

**Step 3: Commit failing tests**

```bash
git add src/components/settings/SettingsSidebar.test.tsx
git commit -m "test: add failing tests for SettingsSidebar component"
```

---

### Task 2: SettingsSidebar Component — Implementation

**Files:**
- Create: `src/components/settings/SettingsSidebar.tsx`
- Modify: `src/components/settings/index.ts` (add export)

**Step 1: Implement SettingsSidebar**

```tsx
interface SettingsSection {
  id: string;
  label: string;
}

interface SettingsSidebarProps {
  sections: SettingsSection[];
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export function SettingsSidebar({ sections, activeSection, onSectionClick }: SettingsSidebarProps) {
  return (
    <nav className="hidden md:block w-[160px] shrink-0 sticky top-[calc(var(--header-height,4rem)+2rem)] self-start">
      <ul className="space-y-1">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                title={section.label}
                onClick={() => onSectionClick(section.id)}
                className={`
                  h-8 w-full flex items-center text-xs truncate
                  transition-colors duration-200 pl-3 border-l-2 text-left
                  ${isActive
                    ? 'border-[#CC785C] text-foreground font-medium'
                    : 'border-transparent text-muted-foreground opacity-50 hover:opacity-100 hover:text-foreground'
                  }
                `}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

**Step 2: Add export to index.ts**

Add to `src/components/settings/index.ts`:
```ts
export { SettingsSidebar } from './SettingsSidebar';
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/components/settings/SettingsSidebar.test.tsx`
Expected: All 4 tests PASS

**Step 4: Commit**

```bash
git add src/components/settings/SettingsSidebar.tsx src/components/settings/SettingsSidebar.test.tsx src/components/settings/index.ts
git commit -m "feat: add SettingsSidebar component with active state and click handling"
```

---

### Task 3: Settings Page — Add Section IDs and Flex Layout

**Files:**
- Modify: `src/pages/Settings.tsx:53-182`

**Step 1: Add `id` attributes to each section**

Each `<section>` gets a unique id. The existing structure at lines 58-172 needs these ids:

- Extension Missing Card section (conditional): `id="settings-extension"`
- AI Provider section (line 65): `id="settings-ai-provider"`
- Appearance section (line 74): `id="settings-appearance"`
- Card Display section (line 86): `id="settings-card-display"`
- Silent Observer section (line 128): `id="settings-silent-observer"`
- Philosophy section (line 160): `id="settings-philosophy"`

**Step 2: Define sections array and add sidebar + flex layout**

In the `Settings` component, before the return statement, add:

```tsx
const settingsSections = [
  ...(showExtensionCard ? [{ id: 'settings-extension', label: 'Extension Setup' }] : []),
  { id: 'settings-ai-provider', label: 'AI Provider' },
  { id: 'settings-appearance', label: 'Appearance' },
  { id: 'settings-card-display', label: 'Card Display' },
  { id: 'settings-silent-observer', label: 'Silent Observer' },
  { id: 'settings-philosophy', label: 'Philosophy' },
];
```

**Step 3: Restructure JSX to two-column layout**

Change the outer wrapper from:
```tsx
<div className="p-8">
  <h2>Settings</h2>
  {/* sections */}
</div>
```

To:
```tsx
<div className="p-8">
  <h2 className="text-3xl font-serif font-bold mb-6">Settings</h2>
  <div className="flex gap-8">
    <SettingsSidebar
      sections={settingsSections}
      activeSection={activeSection}
      onSectionClick={scrollToSection}
    />
    <div className="flex-1 min-w-0">
      {/* all existing sections unchanged */}
    </div>
  </div>
</div>
```

**Step 4: Run type check**

Run: `npm run lint`
Expected: No new type errors

**Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add flex layout with sidebar and section IDs to Settings page"
```

---

### Task 4: Settings Page — IntersectionObserver and Scroll Handler

**Files:**
- Modify: `src/pages/Settings.tsx`

**Step 1: Add activeSection state and scrollToSection handler**

```tsx
const [activeSection, setActiveSection] = useState('settings-ai-provider');

const scrollToSection = useCallback((id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, []);
```

**Step 2: Add IntersectionObserver useEffect**

```tsx
useEffect(() => {
  const sectionIds = settingsSections.map((s) => s.id);
  const elements = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];

  if (elements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      // Find the topmost visible section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        setActiveSection(visible[0].target.id);
      }
    },
    {
      rootMargin: '-80px 0px -50% 0px',
      threshold: 0,
    }
  );

  elements.forEach((el) => observer.observe(el));

  // Edge case: force-activate last item when scrolled to bottom
  const handleScroll = () => {
    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight - scrollBottom < 50) {
      setActiveSection(sectionIds[sectionIds.length - 1]);
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', handleScroll);
  };
}, [settingsSections.length, showExtensionCard]);
```

Note: `settingsSections` must be declared before this effect. The dependency on `settingsSections.length` and `showExtensionCard` ensures the observer re-initializes if the conditional extension section appears/disappears.

**Step 3: Run type check and existing tests**

Run: `npm run lint && npm test`
Expected: No type errors, all tests pass

**Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add IntersectionObserver active section tracking and smooth scroll"
```

---

### Task 5: Verify Header Height Variable

**Files:**
- Check: `src/components/AppShell.tsx`, `src/index.css` or Tailwind config

**Step 1: Check if `--header-height` CSS variable exists**

The sidebar uses `top-[calc(var(--header-height,4rem)+2rem)]` for sticky positioning. Verify whether `--header-height` is defined in the CSS. If not, the fallback `4rem` is used.

Check `AppShell.tsx` header — it currently uses `py-4` which is roughly 4rem with content. The `pt-header` class on `<main>` suggests a custom value exists.

**Step 2: If `pt-header` is a custom Tailwind value, verify it matches**

Search for `pt-header` in `tailwind.config` or `index.css`. The sidebar sticky `top` must align with whatever value the main content uses for its top padding.

If `--header-height` doesn't exist, use a hardcoded `top-20` (5rem) or match whatever `pt-header` resolves to.

**Step 3: Adjust sidebar sticky top if needed and commit**

```bash
git add -A
git commit -m "fix: align sidebar sticky position with header height"
```

(Skip this commit if no changes needed.)

---

### Task 6: Final Integration Test

**Files:**
- No new files

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass including new SettingsSidebar tests

**Step 2: Run type check**

Run: `npm run lint`
Expected: Clean

**Step 3: Manual verification checklist (for dev)**

- [ ] Settings page shows sidebar on desktop width
- [ ] Sidebar hidden on narrow viewport (< 768px)
- [ ] Clicking sidebar item scrolls to section smoothly
- [ ] Active section highlights as you scroll
- [ ] Last section activates when scrolled to bottom
- [ ] Hover effect on sidebar items (opacity change)
