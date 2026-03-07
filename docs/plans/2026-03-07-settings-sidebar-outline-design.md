# Settings Sidebar Outline

## Problem

Settings page currently has 5-6 sections in a flat vertical scroll. As features grow toward 10-15 sections, finding a specific setting becomes slow. Users need a way to quickly jump between sections.

## Decision

Sticky sidebar outline on the left side of the Settings page. Chosen over command palette (too heavy for single-page navigation) and horizontal tab bar (doesn't scale to 10-15 items).

## Layout

```
┌──────────────────────────────────────────┐
│  Header (fixed, existing)                │
├───────────┬──────────────────────────────┤
│  Sidebar  │  Settings Content            │
│  (sticky) │  (scrollable, existing)      │
│  160px    │  flex-1                      │
└───────────┴──────────────────────────────┘
```

- Settings page wrapper: `flex gap-8` inside existing `p-8`
- Sidebar: `w-[160px]`, `sticky`, `self-start`, positioned below header
- Content: `flex-1`, remains scrollable as-is
- Responsive: sidebar hidden below 768px (`hidden md:block`)

## Sidebar Item Styling

All items use fixed `text-xs` font size — no font size changes on hover or active state.

- **Default:** `text-muted-foreground` / `opacity-50`
- **Hover:** `opacity-100` + `text-foreground`, `transition-colors duration-200`
- **Active (visible section):** `text-foreground` + `font-medium` + `border-l-2 border-[#CC785C]`
- **Item height:** `h-8` fixed, `flex items-center`
- **Long labels:** `truncate` with `title` attribute for tooltip

## Scroll Behavior

- Click sidebar item → `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Each `<section>` in Settings content gets an `id` attribute (e.g. `id="settings-ai-provider"`)

## Active Section Detection

- `IntersectionObserver` watches each section heading
- Threshold: `0.5`, `rootMargin: '-80px 0px 0px 0px'` (offset for fixed header)
- One active item at a time: topmost visible section wins
- Edge case: if user scrolls to bottom, force-activate last item (short sections may not trigger intersection)

## Data Structure

```ts
const settingsSections = [
  { id: 'ai-provider', label: 'AI Provider' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'card-display', label: 'Card Display' },
  { id: 'silent-observer', label: 'Silent Observer' },
  { id: 'philosophy', label: 'Philosophy' },
];
```

- Conditional sections (e.g. Extension Missing Card) included in array only when their condition is met
- Future: group items with category dividers when sections exceed ~10

## File Changes

### New: `src/components/settings/SettingsSidebar.tsx`

Presentational component. Props: `sections`, `activeSection`, `onSectionClick`. Renders the sidebar item list with opacity/color transitions and active border indicator.

### Modified: `src/pages/Settings.tsx`

- Wrap content in `flex gap-8` layout
- Add `id` attributes to each `<section>`
- `IntersectionObserver` setup in `useEffect` → manages `activeSection` state
- `scrollToSection(id)` handler passed to sidebar
- Render `<SettingsSidebar />` at left

### Unchanged

- `AppShell.tsx` — header layout untouched
- `settingsStore.ts` — no new state needed
- Existing settings components — no changes, only parent wrapper changes

## Testing

- **SettingsSidebar unit test:** renders items, highlights active, fires click callback
- **Settings page test:** sidebar renders, sections have id attributes (scroll behavior not testable in jsdom)
