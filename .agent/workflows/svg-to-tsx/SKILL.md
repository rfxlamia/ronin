---
name: svg-to-tsx
description: Converts SVG code to production-ready React TSX components with TypeScript types, proper attribute transformation, size props, and accessibility support. Use when converting SVG markup into reusable React icon components for icon systems, UI libraries, or application components.
---

# SVG to TSX Converter

## Overview

Converts SVG markup into production-ready React TSX components with:
- TypeScript types (React.SVGProps<SVGSVGElement>)
- Attribute transformation (kebab-case → camelCase)
- Size prop handling (numeric or sm/md/lg/xl presets)
- Accessibility support (title, aria-hidden, role)
- Tree-shakeable exports (named exports)
- currentColor by default (CSS inheritance)

**Triggers:** "Convert SVG to TSX", "Make React component", user provides SVG code

## Workflow

### Step 1: Analyze Input

Extract from SVG:
1. **Component name**: CamelCase (e.g., CheckIcon, UserAvatar)
2. **ViewBox**: Preserve for accurate scaling
3. **Color usage**: Replace hardcoded colors with currentColor (unless essential)
4. **Complexity**: Simple icon (<5 elements) → size presets; Complex → numeric only

### Step 2: Transform Attributes

**Mandatory conversions:**

```
stroke-width → strokeWidth     fill-rule → fillRule
stroke-linecap → strokeLinecap fill-opacity → fillOpacity
stroke-linejoin → strokeLinejoin stroke-opacity → strokeOpacity
clip-path → clipPath           class → className
```

**Remove:** XML prolog, comments, xmlns:xlink

### Step 3: Generate Interface

```typescript
import { SVGProps } from 'react';

export interface [ComponentName]Props extends SVGProps<SVGSVGElement> {
  size?: number | 'sm' | 'md' | 'lg' | 'xl'; // Or just `number` for complex
  title?: string;
}
```

### Step 4: Build Component

**Simple icon template:**

```tsx
export const [ComponentName] = ({ size = 'md', title, ...props }: [ComponentName]Props) => {
  const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };
  const iconSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden={!title} role={title ? 'img' : undefined} {...props}>
      {title && <title>{title}</title>}
      {/* Transformed SVG content */}
    </svg>
  );
};
```

**Complex illustration:** Use numeric size only, no sizeMap

### Step 5: Apply currentColor

**Before:** `<path stroke="#000" />`  
**After:** `<path stroke="currentColor" />`

**Preserve colors for:** Multi-color illustrations, gradients, brand logos

### Step 6: Validate

✅ Kebab-case → camelCase  
✅ TypeScript interface with size + title  
✅ Named export (not default)  
✅ Accessibility (aria-hidden, role)  
✅ Spread props (...props)  
✅ currentColor applied

### Step 7: Present

Provide complete component:

```tsx
import { SVGProps } from 'react';

export interface CheckIconProps extends SVGProps<SVGSVGElement> {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

export const CheckIcon = ({ size = 'md', title, ...props }: CheckIconProps) => {
  const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };
  const iconSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden={!title} role={title ? 'img' : undefined} {...props}>
      {title && <title>{title}</title>}
      <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
```

**Usage:**
```tsx
<CheckIcon />                          // Basic
<CheckIcon size="lg" />                // Preset
<CheckIcon size={40} />                // Custom
<CheckIcon title="Success" />          // Accessible
<CheckIcon className="text-green-500" /> // Styled
```

## Accessibility Patterns

**Decorative icons** (no semantic meaning): `aria-hidden="true"`  
**Meaningful icons** (convey information): `role="img"` + `<title>`  
**Interactive icons** (buttons/links): Button has aria-label, icon has aria-hidden

Skill auto-handles: No title → aria-hidden; With title → role="img" + <title>

## Edge Cases

| Case | Input | Output |
|------|-------|--------|
| Numeric attrs | `x="10"` | `x={10}` |
| Style attr | `style="fill: red"` | `style={{ fill: 'red' }}` |
| Data attrs | `data-icon="check"` | Preserve as-is |
| xmlns:xlink | Remove | Keep xmlns only |
| Gradients/defs | Preserve structure | Transform stop-color → stopColor |
| Text elements | Keep `<text>` | Transform font-size → fontSize |

## Complete Examples

### Simple Stroke Icon

```tsx
// Input: <svg viewBox="0 0 24 24"><path stroke="#000" stroke-width="2" d="M5 12l5 5L19 7" /></svg>

import { SVGProps } from 'react';

export interface CheckIconProps extends SVGProps<SVGSVGElement> {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

export const CheckIcon = ({ size = 'md', title, ...props }: CheckIconProps) => {
  const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };
  const iconSize = typeof size === 'number' ? size : sizeMap[size];
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden={!title} role={title ? 'img' : undefined} {...props}>
      {title && <title>{title}</title>}
      <path stroke="currentColor" strokeWidth={2} d="M5 12l5 5L19 7" />
    </svg>
  );
};
```

### Multi-Color Illustration

```tsx
// Input: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#FF6B6B" /><circle cx="50" cy="50" r="30" fill="#4ECDC4" /></svg>

import { SVGProps } from 'react';

export interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
  title?: string;
}

export const Logo = ({ size = 100, title, ...props }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden={!title} role={title ? 'img' : undefined} {...props}>
    {title && <title>{title}</title>}
    <circle cx={50} cy={50} r={40} fill="#FF6B6B" />
    <circle cx={50} cy={50} r={30} fill="#4ECDC4" />
  </svg>
);
```

## Optimization Tips

### Tree-Shaking
- **Named exports only** (never default)
- **One component per file** for bundle splitting
- **Import individually**: `import { CheckIcon } from './CheckIcon'`
- **Avoid barrel exports**

### Bundle Size
Use props directly instead of inline styles:
```tsx
<svg width={24} height={24}> // Good
<svg style={{ width: 24 }}> // Avoid (adds ~50 bytes)
```

Path optimization: Use relative commands (lowercase), round to 2 decimals, remove whitespace

### Performance
Memoize size calculation for frequently re-rendered icons:
```tsx
const iconSize = useMemo(() => typeof size === 'number' ? size : sizeMap[size], [size]);
```

## Integration with png-to-svg-vectorizer

**Pipeline:**
```
PNG → [png-to-svg-vectorizer] → SVG → [svg-to-tsx] → React component
```

## TypeScript Tips

### Extended Props Pattern
```tsx
interface BaseIconProps extends SVGProps<SVGSVGElement> {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  color?: string; // Custom prop for icon libraries
}
```

Strict mode compatible: No implicit any, proper inference, SVGProps typing
