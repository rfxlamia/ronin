# Story 1.2: Configure Design System

Status: ready-for-dev

## Story

As a **developer**,
I want **Tailwind CSS and shadcn/ui configured with Ronin's brand tokens**,
So that **I can build consistent, beautiful UI components following the UX Design Specification**.

## Acceptance Criteria

**Given** the Tauri v2 project initialized in Story 1.1
**When** I configure the design system
**Then**:

1. Tailwind CSS v4 is installed with the Vite plugin (`@tailwindcss/vite`)
2. shadcn/ui is initialized and configured for the project
3. Ronin brand colors are defined as CSS variables and Tailwind tokens:
   - Antique Brass (#CC785C) - primary accent
   - Friar Gray (#828179) - secondary/muted
   - Cararra (#F0EFEA) - light mode background
   - Cod Gray (#141413) - dark mode background / light text
4. Typography fonts are configured in Tailwind:
   - Work Sans (sans) - UI text
   - JetBrains Mono (mono) - code/technical
   - Libre Baskerville (serif) - CTAs/philosophy
5. Font files (.woff2) are downloaded and placed in `public/fonts/`
6. Light/dark theme support is implemented with CSS variables
7. Path alias `@/` is configured for clean imports
8. MVP v0.1 shadcn/ui components are installed: Button, Card, Input, Badge
9. `npm run build` completes without errors
10. Theme toggle works in the test component

## Tasks / Subtasks

- [ ] Install Tailwind CSS with Vite plugin (AC: 1)
  - [ ] Run `npm install tailwindcss @tailwindcss/vite`
  - [ ] Configure `vite.config.ts` with Tailwind plugin
  - [ ] Create `src/index.css` with `@import "tailwindcss"`
  - [ ] Import CSS in `src/main.tsx`
- [ ] Configure path aliases (AC: 7)
  - [ ] Update `tsconfig.json` with `baseUrl` and `paths` for `@/*`
  - [ ] Update `vite.config.ts` with `resolve.alias`
- [ ] Initialize shadcn/ui (AC: 2)
  - [ ] Run `npx shadcn@latest init`
  - [ ] Configure: Style (New York), Base color (Zinc/custom), CSS variables (Yes)
  - [ ] Verify `components.json` created with correct paths
- [ ] Configure Ronin brand tokens (AC: 3, 6)
  - [ ] Add CSS variables for light/dark themes in `src/index.css`
  - [ ] Extend Tailwind config with Ronin colors
  - [ ] Test color variables work in both themes
- [ ] Configure typography (AC: 4)
  - [ ] Add `fontFamily` extension in CSS (Work Sans, JetBrains Mono, Libre Baskerville)
  - [ ] Define font-face rules pointing to `public/fonts/`
- [ ] Download and add font files (AC: 5)
  - [ ] Download Work Sans (Regular 400, Medium 500, SemiBold 600, Bold 700) .woff2
  - [ ] Download JetBrains Mono (Regular 400, Medium 500) .woff2
  - [ ] Download Libre Baskerville (Regular 400, Italic 400i, Bold 700) .woff2
  - [ ] Place all in `public/fonts/`
- [ ] Install MVP shadcn/ui components (AC: 8)
  - [ ] Run `npx shadcn@latest add button`
  - [ ] Run `npx shadcn@latest add card`
  - [ ] Run `npx shadcn@latest add input`
  - [ ] Run `npx shadcn@latest add badge`
- [ ] Implement ThemeProvider (AC: 6, 10)
  - [ ] Create `src/components/theme-provider.tsx` with light/dark/system support
  - [ ] Create `src/components/mode-toggle.tsx` for theme switching
  - [ ] Wrap App in ThemeProvider
- [ ] Create test component to verify setup (AC: 9, 10)
  - [ ] Update `App.tsx` with branded components demonstrating all fonts and colors
  - [ ] Include Button, Card, Badge components
  - [ ] Include theme toggle
  - [ ] Verify all fonts render correctly
- [ ] Verify build succeeds (AC: 9)
  - [ ] Run `npm run build`
  - [ ] Verify no TypeScript or build errors

## Dev Notes

### Technical Requirements from Architecture

**From Architecture Document - Technology Stack:**
- **Styling:** Tailwind CSS + shadcn/ui (copy-paste components)
- **Design System:** shadcn/ui components (copy-paste, not npm dependency)
- [Source: docs/architecture.md - Technology Stack section]

**From Architecture - Initialization Steps:**
```bash
# Step 3: Add Tailwind CSS
npm install tailwindcss @tailwindcss/vite

# Step 4: Initialize shadcn/ui
npx shadcn@latest init
# Configure:
# - Style: New York or Default
# - Base color: Zinc (we'll customize to Antique Brass)
# - CSS variables: Yes
```
[Source: docs/architecture.md - Starter Template section]

### Tailwind CSS v4 Configuration (Latest 2025)

**Key Changes from v3:**
- Uses `@tailwindcss/vite` plugin (not PostCSS)
- CSS import is `@import "tailwindcss"` (not the three @tailwind directives)
- Config is in CSS, not `tailwind.config.js`

**vite.config.ts Setup:**
```typescript
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```
[Source: Context7 shadcn/ui docs - Vite installation]

### shadcn/ui Installation

**Manual Dependencies Required:**
```bash
npm install class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```
[Source: Context7 shadcn/ui docs - Manual installation]

**Note:** React 19 is currently installed (see package.json). If dependency conflicts occur with shadcn/ui:
```bash
npm i <package> --force
# OR
npm i <package> --legacy-peer-deps
```
[Source: Context7 shadcn/ui docs - React 19 compatibility]

### Ronin Brand Tokens

**From UX Design Specification:**

```css
/* Ronin Brand Tokens - Light Mode */
--ronin-primary: #CC785C;      /* Antique Brass - CTAs, active states */
--ronin-secondary: #828179;    /* Friar Gray - borders, muted text */
--ronin-background: #F0EFEA;   /* Cararra - main background */
--ronin-surface: #FFFFFF;      /* White - cards, elevated surfaces */
--ronin-text: #141413;         /* Cod Gray - primary text */

/* Ronin Brand Tokens - Dark Mode */
--ronin-background-dark: #141413;
--ronin-surface-dark: #1a1a19;
--ronin-text-dark: #F0EFEA;
```
[Source: docs/ux-design-specification.md - Design System Foundation]

**Full Theme Variables:**

| Semantic | Light Mode | Dark Mode |
|----------|------------|-----------|
| `--background` | #F0EFEA | #141413 |
| `--surface` | #FFFFFF | #1a1a19 |
| `--text-primary` | #141413 | #F0EFEA |
| `--text-secondary` | #828179 | #a0a099 |
| `--accent` | #CC785C | #CC785C |
| `--border` | #e0dfda | #2a2a28 |

[Source: docs/ux-design-specification.md - Visual Design Foundation]

### Typography Configuration

**Font Families (from UX Spec):**
- **Work Sans** - UI text, headings, body copy (sans-serif)
- **JetBrains Mono** - code, paths, git info, AI context (monospace)
- **Libre Baskerville** - CTAs, project names, Oath, special moments (serif)

**Font Files Required (.woff2 format only):**
```
public/fonts/
├── WorkSans-Regular.woff2
├── WorkSans-Medium.woff2
├── WorkSans-SemiBold.woff2
├── WorkSans-Bold.woff2
├── JetBrainsMono-Regular.woff2
├── JetBrainsMono-Medium.woff2
├── LibreBaskerville-Regular.woff2
├── LibreBaskerville-Italic.woff2
└── LibreBaskerville-Bold.woff2
```
[Source: docs/ux-design-specification.md - Typography System]

**Font Sources:**
- All fonts available from Google Fonts as `.woff2`
- Download URLs:
  - Work Sans: https://fonts.google.com/specimen/Work+Sans
  - JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
  - Libre Baskerville: https://fonts.google.com/specimen/Libre+Baskerville

### ThemeProvider Implementation

**From Context7 shadcn/ui Dark Mode for Vite:**
```tsx
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ronin-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches ? "dark" : "light"
      root.classList.add(systemTheme)
      return
    }
    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
```
[Source: Context7 shadcn/ui docs - Dark Mode Vite]

### Project Structure Notes

**Files to Create/Modify:**
```
ronin/
├── public/
│   └── fonts/              # NEW - Font files (.woff2)
├── src/
│   ├── index.css           # NEW - Tailwind import + theme variables
│   ├── main.tsx            # MODIFY - Import index.css
│   ├── App.tsx             # MODIFY - Test component with themed UI
│   ├── lib/
│   │   └── utils.ts        # NEW - shadcn cn() helper
│   └── components/
│       ├── ui/             # NEW - shadcn components
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── input.tsx
│       │   └── badge.tsx
│       ├── theme-provider.tsx  # NEW
│       └── mode-toggle.tsx     # NEW
├── vite.config.ts          # MODIFY - Tailwind plugin + path alias
├── tsconfig.json           # MODIFY - Path alias
├── tsconfig.app.json       # MODIFY - Path alias
└── components.json         # NEW - shadcn configuration
```
[Source: docs/architecture.md - File Organization Patterns]

### Alignment with Architecture

**Color Contrast Requirements (Accessibility):**
- WCAG AA (≥4.5:1) for text
- Status uses icon + color (not color-only)
[Source: docs/architecture.md - Accessibility section]

**Animation Tokens (for future use):**
```css
--animation-fast: 100ms;
--animation-normal: 200ms;
--animation-slow: 300ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
```
[Source: docs/architecture.md - Animation Patterns]

### Previous Story Intelligence

**From Story 1-1 (Initialize Tauri Project):**
- Project uses React 19.1.0 (may need `--force` for some dependencies)
- TypeScript strict mode enabled
- Vite 7.x configured
- `@types/node` already installed
- Current structure is minimal: `src/App.tsx`, `src/main.tsx`, `src/App.css`
[Source: docs/sprint-artifacts/1-1-initialize-tauri-project.md]

### Testing Requirements

**Validation Steps:**
1. **Tailwind works:**
   - Add `className="text-red-500"` to any element
   - Verify red text appears

2. **shadcn/ui components work:**
   - Import Button from `@/components/ui/button`
   - Render with different variants
   - Verify styling applies correctly

3. **Theme toggle works:**
   - Click theme toggle
   - Verify background/text colors change
   - Verify preference persists on reload

4. **Fonts load correctly:**
   - Inspect element typography
   - Verify Work Sans for body, JetBrains Mono for code, Libre Baskerville for CTAs

5. **Build succeeds:**
   - `npm run build` completes without errors
   - No TypeScript errors in IDE

### Potential Pitfalls & Solutions

**Issue 1: React 19 peer dependency conflicts**
- **Error:** `ERESOLVE unable to resolve dependency tree`
- **Solution:** Use `npm install <package> --force` or `--legacy-peer-deps`
[Source: Context7 shadcn/ui docs - React 19]

**Issue 2: Path alias not working**
- **Error:** `Cannot find module '@/components/...'`
- **Solution:** Ensure both `tsconfig.json` AND `vite.config.ts` have the alias configured
- **Check:** tsconfig.json needs `baseUrl: "."` and `paths: {"@/*": ["./src/*"]}`

**Issue 3: Fonts not loading**
- **Error:** Fallback fonts appearing instead of custom fonts
- **Solution:**
  1. Verify font files exist in `public/fonts/`
  2. Check font-face `src` paths are correct (`/fonts/filename.woff2`)
  3. Verify no CORS issues (local dev should be fine)

**Issue 4: Dark mode not applying**
- **Error:** Theme toggle changes localStorage but UI doesn't update
- **Solution:** Ensure CSS variables are scoped to `.dark` class and ThemeProvider adds class to `document.documentElement`

**Issue 5: Tailwind v4 vs v3 confusion**
- **Error:** Using old config format (`tailwind.config.js`)
- **Solution:** Tailwind v4 uses `@tailwindcss/vite` plugin and CSS-based config. Do NOT create `tailwind.config.js`.

### References Summary

- docs/architecture.md - Technology Stack, Starter Template, File Organization
- docs/ux-design-specification.md - Design System Foundation, Typography, Colors
- docs/sprint-artifacts/1-1-initialize-tauri-project.md - Previous story context
- Context7 shadcn/ui documentation - Installation, Dark Mode, Components
- Context7 Tailwind CSS documentation - Vite plugin setup

## Dev Agent Record

### Context Reference

Story Context: docs/sprint-artifacts/1-2-configure-design-system.md

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

(To be filled by dev agent)

### Completion Notes List

(To be filled by dev agent)

### File List

(To be filled by dev agent)

## Change Log

- 2025-12-18: Story created with comprehensive context from architecture, UX spec, and latest shadcn/ui + Tailwind v4 documentation.
