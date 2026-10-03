# Test Harnesses

Located in `test/harnesses/`. All run with Node.js + jsdom (dev dependency).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run smoke` | Mount all views, mutate store state, verify DOM integrity |
| `npm run drive` | Simulate user interactions: type in fields, click buttons, verify DOM stability |
| `npm run check-imports` | Static analysis: verify every `import`/`export` pair resolves |

---

## smoke.js

**What it does:**
1. Creates a JSDOM document with `#tabs` nav and `#panels` main
2. Loads the store and all view modules
3. Mounts each view into its own panel section
4. Drives the store: changes chain count/altitude/body, updates settings, adds antennas, changes quantities, selects MAM
5. Waits for async effects to flush
6. Verifies:
   - Every panel has a real subtree (not empty)
   - No stray `kspXXXX` interpolation markers left in the DOM
   - Text content changed after mutations (proves reactivity works)

**Pass criteria:** "no failures" printed, all views report node counts.

---

## drive.js

**What it does:**
1. Same JSDOM setup as smoke.js (plus dialog polyfills)
2. Loads the store and all view modules (including editor views)
3. Mounts the full app via `main.js` (tab bar + panels)
4. Simulates user actions:
   - Types in body name/radius fields in Body Edit — verifies same element stays focused
   - Saves body — checks form heading updates, save button enables
   - Types in antenna name field — verifies element survives typing
   - Saves antenna — checks save enables
   - Types in altitude/parking/count fields — verifies element survival
   - Clicks Add/Remove antenna buttons
   - Switches stock data to RSS — checks transfer view draws
   - Craft view: save current, load, rename, delete
   - Verifies single-launch transfer updates when parking altitude/count changes
5. Verifies DOM nodes aren't replaced during typing (focus preservation)

**Pass criteria:** All "ok" lines, "no failures" printed.

---

## check-imports.js

**What it does:**
1. Walks the provided directory (default `js/`) for `.js` files
2. Extracts all `export function|class|const|let|var name` and `export { ... }` names
3. For every `import { a, b } from "path"`, resolves the target file
4. Checks that each imported name is actually exported by the target
5. Reports missing files or missing exports

**Pass criteria:** "all imports resolve" printed.

**Usage:** `npm run check-imports` (hardcoded to `js` in package.json) or `node test/harnesses/check-imports.js <dir>`

---

## Running Locally

```bash
npm run test      # Unit tests
npm run smoke     # Smoke test (mounts all views)
npm run drive     # Drive test (user interactions)
npm run check-imports  # Import verification
```

All four should pass on a clean checkout.
