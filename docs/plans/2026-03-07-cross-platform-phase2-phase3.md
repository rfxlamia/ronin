# Cross-Platform Migration Phase 2 & 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the cross-platform UX (platform-aware labels, test coverage, security hardening) and set up CI/CD for automated macOS/Windows builds.

**Architecture:** Phase 1 (committed at `1cd78e8`) fixed all compilation blockers. A `platformStore` Zustand store and `get_platform_info` Tauri command already exist. Phase 2 builds on these to make all user-facing text platform-aware. Phase 3 converts GitHub Actions workflows to a build matrix.

**Tech Stack:** React 19, TypeScript, Zustand, Tauri v2 (Rust), Vitest, GitHub Actions, `tauri-apps/tauri-action`

**Pre-requisites:** Phase 1 committed. All 232 Rust tests and 287 frontend tests pass.

---

## Phase 2: Polished Cross-Platform UX

### Task 1: Create platform shortcut helper utility

**Files:**
- Create: `src/lib/platform.ts`
- Reference: `src/stores/platformStore.ts` (exists, has `os` field and `isMacOS()` etc.)

**Step 1: Create the utility file**

```typescript
// src/lib/platform.ts
import { usePlatformStore } from '@/stores/platformStore';

/**
 * Returns the platform-appropriate modifier key label.
 * macOS: uses symbols (⌘, ⌥, ⇧)
 * Linux/Windows: uses text (Ctrl, Alt, Shift)
 */
export function getModifierSymbol(modifier: 'ctrl' | 'shift' | 'alt'): string {
    const os = usePlatformStore.getState().os;
    if (os === 'macos') {
        switch (modifier) {
            case 'ctrl': return '⌘';
            case 'shift': return '⇧';
            case 'alt': return '⌥';
        }
    }
    switch (modifier) {
        case 'ctrl': return 'Ctrl';
        case 'shift': return 'Shift';
        case 'alt': return 'Alt';
    }
}

/**
 * Formats a shortcut string for the current platform.
 * Example: formatShortcut('Ctrl', 'Shift', 'D')
 *   macOS -> "⌘⇧D"
 *   Linux/Windows -> "Ctrl+Shift+D"
 */
export function formatShortcut(...keys: string[]): string {
    const os = usePlatformStore.getState().os;
    const mapped = keys.map(k => {
        const lower = k.toLowerCase();
        if (lower === 'ctrl' || lower === 'cmd') return getModifierSymbol('ctrl');
        if (lower === 'shift') return getModifierSymbol('shift');
        if (lower === 'alt' || lower === 'option') return getModifierSymbol('alt');
        return k;
    });
    return os === 'macos' ? mapped.join('') : mapped.join('+');
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/platform.ts
git commit -m "feat: add platform-aware shortcut label utility"
```

---

### Task 2: Apply shortcut labels to DevlogButton and GitControls

**Files:**
- Modify: `src/components/devlog/DevlogButton.tsx:39` (aria-label)
- Modify: `src/components/Dashboard/GitControls.tsx:188` (push tooltip)

**Step 1: Update DevlogButton**

In `src/components/devlog/DevlogButton.tsx`:
- Add import: `import { formatShortcut } from '@/lib/platform';`
- Line 39: Change `aria-label="Open DEVLOG editor (Ctrl+Shift+D)"` to:
  ```tsx
  aria-label={`Open DEVLOG editor (${formatShortcut('Ctrl', 'Shift', 'D')})`}
  ```

**Step 2: Update GitControls**

In `src/components/Dashboard/GitControls.tsx`:
- Add import: `import { formatShortcut } from '@/lib/platform';`
- Around line 188: Change `return 'Push to remote (⌘⇧P)';` to:
  ```tsx
  return `Push to remote (${formatShortcut('Ctrl', 'Shift', 'P')})`;
  ```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Run frontend tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/components/devlog/DevlogButton.tsx src/components/Dashboard/GitControls.tsx
git commit -m "feat: use platform-aware shortcut labels in DevlogButton and GitControls"
```

---

### Task 3: Add macOS metaKey test coverage for useHotkeys

**Files:**
- Modify: `src/hooks/useHotkeys.test.ts`
- Reference: `src/hooks/useHotkeys.ts:26` (line where `event.ctrlKey || event.metaKey` is checked)

**Step 1: Add metaKey test cases**

Read `src/hooks/useHotkeys.test.ts` first to understand the existing pattern. Then add these tests after the existing test cases:

```typescript
it('should fire callback when metaKey is pressed instead of ctrlKey (macOS Cmd)', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('D', callback, { ctrl: true, shift: true }));

    const event = new KeyboardEvent('keydown', {
        key: 'D',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
    });
    document.dispatchEvent(event);
    expect(callback).toHaveBeenCalledTimes(1);
});

it('should not fire when neither ctrlKey nor metaKey is pressed', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('D', callback, { ctrl: true, shift: true }));

    const event = new KeyboardEvent('keydown', {
        key: 'D',
        shiftKey: true,
        bubbles: true,
    });
    document.dispatchEvent(event);
    expect(callback).not.toHaveBeenCalled();
});
```

**Step 2: Run the test file**

Run: `npx vitest run src/hooks/useHotkeys.test.ts`
Expected: All tests pass including the new ones

**Step 3: Commit**

```bash
git add src/hooks/useHotkeys.test.ts
git commit -m "test: add macOS metaKey coverage for useHotkeys hook"
```

---

### Task 4: Replace window.open with Tauri opener plugin

**Files:**
- Modify: `src/components/settings/ExtensionMissingCard.tsx:28-31`
- Reference: `src/components/settings/ApiKeyInput.tsx` (existing usage of `openUrl` from `@tauri-apps/plugin-opener`)

**Step 1: Update ExtensionMissingCard**

In `src/components/settings/ExtensionMissingCard.tsx`, replace:

```tsx
const handleOpenExtensions = () => {
    // Open GNOME Extensions website in default browser
    window.open('https://extensions.gnome.org/', '_blank');
};
```

With:

```tsx
const handleOpenExtensions = async () => {
    try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl('https://extensions.gnome.org/');
    } catch {
        // Fallback for dev mode / browser testing
        window.open('https://extensions.gnome.org/', '_blank');
    }
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/settings/ExtensionMissingCard.tsx
git commit -m "fix: use Tauri opener plugin instead of window.open for GNOME Extensions link"
```

---

### Task 5: Platform-aware watcher error messages

**Files:**
- Modify: `src-tauri/src/observer/watcher.rs` (search for "inotify" -- around lines 88-93)

**Step 1: Find and update the inotify error handling**

Search for `inotify` in `src-tauri/src/observer/watcher.rs`. Wrap the Linux-specific error hint in `#[cfg(target_os = "linux")]` and add a generic fallback:

```rust
// Before (approximately):
if err_msg.contains("inotify") || err_msg.contains("watch limit") {
    eprintln!("[watcher] Hint: increase fs.inotify.max_user_watches ...");
}

// After:
#[cfg(target_os = "linux")]
if err_msg.contains("inotify") || err_msg.contains("watch limit") {
    eprintln!("[watcher] Hint: increase fs.inotify.max_user_watches with: sudo sysctl -w fs.inotify.max_user_watches=524288");
}
#[cfg(not(target_os = "linux"))]
if err_msg.contains("watch") || err_msg.contains("limit") || err_msg.contains("resource") {
    eprintln!("[watcher] File watcher limit may have been reached. Try closing other applications or reducing the number of watched projects.");
}
```

Adapt to match the actual code structure found in the file.

**Step 2: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: No errors

**Step 3: Run Rust tests**

Run: `cd src-tauri && cargo test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src-tauri/src/observer/watcher.rs
git commit -m "fix: platform-aware file watcher error messages"
```

---

### Task 6: Windows encryption key file protection warning

**Files:**
- Modify: `src-tauri/src/security.rs:41-48` (after the `#[cfg(unix)]` permission block)

**Step 1: Add Windows warning block**

After the existing `#[cfg(unix)]` block (around line 48), add:

```rust
#[cfg(windows)]
{
    // Windows does not support Unix-style permissions.
    // The key file is protected by being in the user's AppData directory
    // and the key itself is used for AES-256-GCM encryption at rest.
    // For production hardening, consider using Windows DPAPI or ACLs.
    eprintln!("[security] Note: Key file created without explicit ACL restriction on Windows. File is in user-specific AppData directory.");
}
```

**Step 2: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: No errors

**Step 3: Commit**

```bash
git add src-tauri/src/security.rs
git commit -m "fix: add Windows security warning for unprotected key file"
```

---

### Phase 2 Verification Gate

Run: `cd src-tauri && cargo test && cd .. && npm test`
Expected: All Rust and frontend tests pass.

Visual check: Grep for platform-specific text that shouldn't leak:
```bash
# These should only appear inside #[cfg(target_os = "linux")] or isLinux guards:
grep -rn "X11\|inotify\|xdg-open\|GNOME\|Wayland" src/ --include="*.tsx" --include="*.ts"
```

---

## Phase 3: CI/CD Pipeline

### Task 7: Convert release workflow to build matrix

**Files:**
- Modify: `.github/workflows/release.yml`

**Step 1: Rewrite release.yml**

Replace the entire file with a matrix-based workflow using `tauri-apps/tauri-action`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-22.04
            args: ''
          - platform: macos-latest
            args: '--target universal-apple-darwin'
          - platform: windows-latest
            args: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install system dependencies (Linux only)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Install frontend dependencies
        run: npm ci

      - name: Run frontend tests
        run: npm test

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VITE_DEMO_LAMBDA_URL: ${{ secrets.VITE_DEMO_LAMBDA_URL }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Ronin ${{ github.ref_name }}'
          releaseBody: 'See the assets below to download and install Ronin for your platform.'
          releaseDraft: true
          prerelease: true
          args: ${{ matrix.args }}
```

**Step 2: Verify YAML is valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))"`
(If PyYAML not available, use an online YAML validator or `npx yaml-lint .github/workflows/release.yml`)

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add macOS and Windows builds to release workflow"
```

---

### Task 8: Add cross-platform cargo check to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Add cargo check matrix job**

Add a new job to `ci.yml` after the existing jobs. This runs `cargo check` on all 3 platforms without doing a full build (which is expensive):

```yaml
  cargo-check:
    name: Cargo Check (${{ matrix.platform }})
    runs-on: ${{ matrix.platform }}
    strategy:
      fail-fast: false
      matrix:
        platform: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install system dependencies (Linux only)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Cargo check
        run: cargo check
        working-directory: src-tauri
```

**Step 2: Verify YAML is valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add cross-platform cargo check for macOS and Windows"
```

---

### Task 9: Verify bundle target config

**Files:**
- Reference: `src-tauri/tauri.conf.json` (already has `"targets": "all"`)
- Reference: `src-tauri/tauri.macos.conf.json` (created in Phase 1)

**Step 1: Verify configs**

Read both files and confirm:
1. `tauri.conf.json` has `"bundle": { "targets": "all" }` -- this tells Tauri to produce all formats the build OS supports
2. `tauri.macos.conf.json` correctly overrides window settings without conflicting with bundle config
3. Icon files referenced in `tauri.conf.json` (`icons/icon.icns`, `icons/icon.ico`, PNG files) all exist in `src-tauri/icons/`

**Step 2: Verify icons exist**

Run: `ls -la src-tauri/icons/icon.icns src-tauri/icons/icon.ico src-tauri/icons/32x32.png src-tauri/icons/128x128.png src-tauri/icons/128x128@2x.png`
Expected: All files exist

No code changes needed -- this is a verification-only task.

---

### Phase 3 Verification Gate

The full verification requires actually pushing a tag and watching CI run. For local verification:

1. YAML files parse correctly
2. All referenced paths and secrets exist
3. Matrix covers all 3 platforms

---

## Summary Checklist

| Task | Description | Phase |
|------|-------------|-------|
| 1 | Create `src/lib/platform.ts` shortcut helper | 2 |
| 2 | Apply shortcut labels to DevlogButton + GitControls | 2 |
| 3 | Add metaKey test cases to useHotkeys.test.ts | 2 |
| 4 | Replace window.open with Tauri opener plugin | 2 |
| 5 | Platform-aware watcher error messages | 2 |
| 6 | Windows encryption key file warning | 2 |
| 7 | Convert release.yml to build matrix | 3 |
| 8 | Add cross-platform cargo check to CI | 3 |
| 9 | Verify bundle target config | 3 |
