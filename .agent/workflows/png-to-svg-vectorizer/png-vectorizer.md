---
name: png-to-svg-vectorizer
description: Converts raster images (PNG) to clean, optimized SVG code for UI components. This skill should be used when a user provides a PNG image and wants to reverse-engineer it into pure vector SVG code suitable for UI components, icons, or web graphics. Triggers on requests like "convert this PNG to SVG", "vectorize this image", "make this icon into SVG", or when the user provides a PNG and wants it recreated as scalable vector graphics.
---

# PNG to SVG Vectorizer

## Overview

This skill enables the conversion of raster images (PNG) into clean, optimized SVG code that is ready for use in UI components. The process involves visually analyzing the input image and manually recreating it as pure vector paths, shapes, and elements.

## Workflow

### Step 1: Analyze the Input Image

To begin the vectorization process:

1. Read the PNG file provided by the user using the Read tool
2. Identify all visual elements: shapes, lines, curves, text, gradients
3. Note the overall dimensions and proportions
4. Identify the color palette used
5. Determine if the image is an icon, illustration, or complex graphic

### Step 2: Plan the SVG Structure

Before writing code, plan the approach:

1. **For icons (simple, single-color):**
   - Use a `viewBox="0 0 24 24"` for standard icon size
   - Plan to use `currentColor` for fills/strokes
   - Minimize the number of paths

2. **For illustrations (multi-element, multi-color):**
   - Determine appropriate viewBox based on aspect ratio
   - Group related elements with `<g>` tags
   - Plan layer ordering (background to foreground)

3. **For complex graphics:**
   - Consider breaking into reusable components
   - Identify patterns that can be defined once with `<defs>`

### Step 3: Create the SVG Code

Apply these mandatory requirements:

#### Precision Requirements
- Visual output must match the input image exactly in shapes and proportions
- Maintain accurate aspect ratios
- Preserve all visual details

#### Code Quality Requirements
- **NEVER use base64 strings or embedded raster images**
- Use only pure vector elements: `<path>`, `<circle>`, `<rect>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`, `<text>`
- Use semantic elements when appropriate (e.g., `<circle>` for circles instead of `<path>`)

#### UI Optimization Requirements
- Set appropriate `viewBox` (e.g., `"0 0 24 24"` for icons)
- Remove all unnecessary metadata, comments, and XML definitions
- Simplify paths to reduce file size (minimize control points)
- **Set `fill` or `stroke` colors to `"currentColor"`** where appropriate for CSS inheritance
- Use `fill="none"` for stroke-only elements
- Remove default attributes that match browser defaults

#### Accessibility Requirements
- For meaningful images: include `<title>` tag inside SVG with descriptive text
- For decorative images: add `aria-hidden="true"` to the SVG element
- Consider adding `role="img"` for semantic clarity

### Step 4: Validate and Output

Before providing the final output:

1. Verify visual accuracy against the original image
2. Ensure no base64 or raster data is present
3. Confirm `currentColor` is used appropriately
4. Check that the code is minimal and clean

#### Output Format

Provide ONLY the ready-to-use SVG code block:

```svg
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- Clean vector paths here -->
</svg>
```

## SVG Element Reference

### Common Elements

| Element | Use Case | Example |
|---------|----------|---------|
| `<path>` | Complex shapes, curves | `<path d="M12 2L2 22h20L12 2z" fill="currentColor"/>` |
| `<circle>` | Perfect circles | `<circle cx="12" cy="12" r="10" stroke="currentColor"/>` |
| `<rect>` | Rectangles, squares | `<rect x="2" y="2" width="20" height="20" rx="2"/>` |
| `<ellipse>` | Ovals | `<ellipse cx="12" cy="12" rx="10" ry="5"/>` |
| `<line>` | Straight lines | `<line x1="2" y1="2" x2="22" y2="22" stroke="currentColor"/>` |
| `<polyline>` | Connected lines | `<polyline points="2,2 12,22 22,2"/>` |
| `<polygon>` | Closed shapes | `<polygon points="12,2 2,22 22,22"/>` |

### Path Commands Quick Reference

| Command | Name | Parameters | Description |
|---------|------|------------|-------------|
| `M` | MoveTo | x y | Move to point |
| `L` | LineTo | x y | Draw line to point |
| `H` | Horizontal | x | Horizontal line |
| `V` | Vertical | y | Vertical line |
| `C` | Cubic Bezier | x1 y1 x2 y2 x y | Curve with 2 control points |
| `S` | Smooth Cubic | x2 y2 x y | Smooth curve |
| `Q` | Quadratic | x1 y1 x y | Curve with 1 control point |
| `A` | Arc | rx ry rot large-arc sweep x y | Elliptical arc |
| `Z` | ClosePath | - | Close the path |

*Lowercase commands use relative coordinates.*

### Optimization Tips

1. **Combine adjacent paths** with the same fill/stroke
2. **Use relative commands** (lowercase) for smaller file size
3. **Round coordinates** to 2 decimal places maximum
4. **Remove whitespace** in production builds
5. **Use shorthand** where possible (e.g., `H` instead of `L x currentY`)

## Examples

### Simple Icon (Checkmark)

```svg
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M5 12l5 5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### Filled Icon (Heart)

```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
</svg>
```

### Icon with Title (Accessible)

```svg
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
  <title>Search</title>
  <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
  <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
```
