# Story 2.7: Ronin Oath Celebration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **new user who just completed onboarding**,
I want **to see the Ronin Oath as a celebration of my first project**,
so that **I feel welcomed into the Ronin philosophy and community**.

## Acceptance Criteria

1.  **Trigger Condition:**
    -   Modal appears ONLY after the user adds their **first** project.
    -   Modal does NOT appear during installation or initial startup.
    -   Modal does NOT appear for subsequent project additions.

2.  **Timing & Animation:**
    -   Brief pause (500ms) after the project card appears on the dashboard before the modal opens.
    -   Respects `prefers-reduced-motion` (instant appearance if reduced motion enabled).

3.  **Visual Design:**
    -   **Typography:**
        -   Ronin Oath text uses **Work Sans** (body).
        -   Special phrases/emphasis use **Libre Baskerville** (serif) to create emotional resonance.
        -   Heading uses **Libre Baskerville**.
    -   **The Ronin Oath Text (Content):**
        > **I am a ronin.**
        > *Masterless*, but not **rudderless**.
        > My *actions* are my **documentation**.
        > My *patterns* are my **teacher**.
        > I return to *forgotten work* **without dread**.
        >
        > **浪人之道**
    -   **Illustration:** Displays Ink brush style ronin illustration (`ronin-oath-illustration.png`) or placeholder if not generated.
    -   **Components:** Uses `shadcn/ui` Dialog component.

4.  **Interaction:**
    -   "Continue" button (Libre Baskerville font, Antique Brass color) to dismiss the modal.
    -   Dismissing the modal saves a flag (`oath_shown = true`) to persistent storage.

5.  **Persistence:**
    -   The Oath is permanently accessible via **Settings → Philosophy/About** (even if Settings is a placeholder for now).
    -   The `oath_shown` state persists across app restarts (SQLite).

## Tasks / Subtasks

- [x] **Task 1: Database & Backend Commands** (AC 1, 4, 5)
    -   [x] Verify `settings` table exists in `src-tauri/src/db.rs` (Key/Value store).
    -   [x] **Create/Update Tauri Commands** in `src-tauri/src/commands/settings.rs` (or similar):
        -   `get_setting(key: String) -> Option<String>`
        -   `update_setting(key: String, value: String) -> Result<(), String>`
    -   [x] Register new commands in `src-tauri/src/lib.rs`.

- [x] **Task 2: State Management (New Store)** (AC 1, 4)
    -   [x] **Create `src/stores/settingsStore.ts`** (File does not exist).
    -   [x] Implement Zustand store with interface:
        ```typescript
        interface SettingsStore {
          oathShown: boolean;
          setOathShown: (shown: boolean) => void;
          loadSettings: () => Promise<void>;
          saveSetting: (key: string, value: string) => Promise<void>;
        }
        ```
    -   [x] Wire up `loadSettings` to call backend `get_setting("oath_shown")`.

- [x] **Task 3: UI Components & Assets** (AC 3)
    -   [x] **Install Dialog Component:** Run `npx shadcn@latest add dialog` (Required, currently missing).
    -   [x] Scaffold `src/components/RoninOathModal.tsx`.
    -   [x] Implement Image Fallback:
        -   Try loading `/assets/philosophy/ronin-oath-illustration.png`.
        -   Add `onError` handler to switch to a CSS placeholder `.ronin-placeholder` if asset is missing.

- [x] **Task 4: Implement RoninOathModal** (AC 3, 4)
    -   [x] Layout: Illustration top/side, Text center, Button bottom.
    -   [x] **Typography:** Apply `font-serif` (Libre Baskerville) to Header and specific phrases.
    -   [x] **Button:** "Continue" in Antique Brass (`bg-ronin-brass`).
    -   [x] **Interaction:** Clicking "Continue" calls `settingsStore.saveSetting("oath_shown", "true")` and closes modal.

- [x] **Task 5: Integrate Trigger Logic** (AC 1, 2)
    -   [x] In `Dashboard.tsx` (or parent), use `useEffect` to monitor `projectCount` and `oathShown`.
    -   [x] **Logic:** IF `projectCount === 1` AND `!oathShown` THEN wait 500ms -> Open Modal.
    -   [x] Ensure `setTimeout` is cleaned up in `useEffect` return to prevent memory leaks.
    -   [x] Check `prefers-reduced-motion` for animation behavior.

- [x] **Task 6: Settings Integration** (AC 5)
    -   [x] Create/Update `src/pages/Settings.tsx` (Use basic placeholder if missing).
    -   [x] Add "Philosophy / About" section.
    -   [x] Add button to manually open `RoninOathModal` (reuse component).

## Dev Notes

- **Store Implementation Detail:**
  The `settingsStore` should be simple. Don't overengineer.
  ```typescript
  // src/stores/settingsStore.ts
  import { create } from 'zustand';
  import { invoke } from '@tauri-apps/api/core';

  interface SettingsState {
    oathShown: boolean;
    setOathShown: (shown: boolean) => void;
    checkOathStatus: () => Promise<void>;
    markOathShown: () => Promise<void>;
  }

  export const useSettingsStore = create<SettingsState>((set) => ({
    oathShown: true, // Default to true to prevent flash, set to false after check if needed
    setOathShown: (shown) => set({ oathShown: shown }),
    checkOathStatus: async () => {
      const val = await invoke<string | null>('get_setting', { key: 'oath_shown' });
      // If value is null (never set), it's false. If "true", it's true.
      set({ oathShown: val === 'true' });
    },
    markOathShown: async () => {
      await invoke('update_setting', { key: 'oath_shown', value: 'true' });
      set({ oathShown: true });
    }
  }));
  ```

- **Philosophy:** This is an "emotional design" feature (礼 Rei). It shouldn't feel like a popup ad.
- **Typography:**
    -   *Special phrases to emphasize (Libre Baskerville):* "I am a ronin", "rudderless", "documentation", "teacher", "without dread", "浪人之道".

### Project Structure Notes

- **New Store:** `src/stores/settingsStore.ts` (MUST CREATE)
- **New Component:** `src/components/RoninOathModal.tsx`
- **Tauri Backend:** `src-tauri/src/commands/settings.rs` (Create if needed)

### References

- **UX Spec:** `docs/ux-design-specification.md` (Story 2.7)
- **Architecture:** `docs/architecture.md` (Settings Manager)
- **Philosophy:** `docs/PHILOSOPHY.md` (Source text)

## Dev Agent Record

### Agent Model Used
Google Gemini 2.0 Flash Thinking Experimental

### Debug Log References
N/A - Implementation completed without issues following TDD approach

### Completion Notes List
- **Backend (Rust):** Created `settings.rs` with `get_setting` and `update_setting` commands. Registered in `lib.rs`. Tests: 4/4 passing.
- **Frontend Store:** Created `settingsStore.ts` following Dev Notes specification. Defaults `oathShown` to `true` to prevent flash.
- **UI Components:** Installed shadcn Dialog. Created `RoninOathModal.tsx` with proper typography (Libre Baskerville for special phrases, Work Sans for body).
- **Integration:** Added trigger logic to `Dashboard.tsx` that shows modal when `projectCount === 1` AND `!oathShown` with 500ms delay (0ms if reduced-motion).
- **Settings:** Enhanced `Settings.tsx` with Philosophy section allowing manual oath viewing.
- **Illustration Asset:** Generated Science SARU-style ink brush ronin illustration, converted to SVG, integrated into modal. Fallback to `.ronin-placeholder` if asset loading fails.
- **Tests:** All 87 frontend tests + 4 backend tests passing with 0 regressions.

### File List
- `src-tauri/src/commands/settings.rs` (new) 
- `src-tauri/src/commands/mod.rs` (modified)
- `src-tauri/src/lib.rs` (modified)
- `src-tauri/src/db.rs` (modified - run_migrations visibility)
- `src/stores/settingsStore.ts` (new)
- `src/stores/settingsStore.test.ts` (new - review fix)
- `src/components/RoninOathModal.tsx` (new)
- `src/components/RoninOathModal.test.tsx` (new - review fix)
- `src/components/ui/dialog.tsx` (new - shadcn)
- `src/pages/Dashboard.tsx` (modified)
- `src/pages/Settings.tsx` (modified)
- `public/assets/philosophy/ronin-oath-illustration.svg` (new)
- `package.json` (modified - shadcn dialog deps)
- `package-lock.json` (modified)

### Senior Developer Review (AI)
**Reviewed:** 2025-12-19
**Reviewer:** Adversarial Code Review Agent

**Issues Found:**
- 6 untracked files (fixed - staged for commit)
- Missing `DialogDescription` accessibility (fixed)
- Missing `RoninOathModal.test.tsx` (created - 9 tests)
- Missing `settingsStore.test.ts` (created - 7 tests)
- File List incomplete (updated above)

**Result:** All issues fixed. Tests: 103 passed (87→103).

## Manual Test Notes (Product Lead Verification)

### Test Case 1: First Run Experience
**Steps:**
1.  Clear app data (or use fresh dev environment).
2.  Launch Ronin.
3.  Add first project folder.
4.  Wait 500ms after dashboard loads.

**Expected Result:**
-   Oath Modal appears.
-   Typography matches spec.
-   "Continue" closes modal and saves state.

### Test Case 2: Subsequent Launch
**Steps:**
1.  Close and reopen Ronin.
2.  Add a second project.

**Expected Result:**
-   Modal does NOT appear.

### Test Case 3: Settings Access
**Steps:**
1.  Navigate to Settings.
2.  Click "Philosophy" or "About".

**Expected Result:**
-   Oath Modal opens manually.