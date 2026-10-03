# kspRemoteTechPlanner - Agent Context

## Project Overview
Modernized AngularJS/TypeScript → dependency-free static GitHub Pages site (plain ES modules + JSDoc). No build step, bundler, framework, CDN, or runtime dependency. Runs directly from repo root.

**Original project reference**: `36c6cab` (1.6.x)

## Architecture

### Core Modules
- **`js/reactive.js`** — Minimal signals (`signal`, `computed`, `effect`), no digest cycle
- **`js/html.js`** — Template engine: `html`` tagged template, `each()`, `mount()`, `ref=`, `.prop=`, `@event=`
- **`js/store.js`** — All persisted state (settings, chain, user bodies/antennas), localStorage with migrations
- **`js/main.js`** — Tab router, lazy-mounts panels

### Calculator
- **`js/calculator/euclidean.js`** — Geometry (`circleCross`, `distPointLine`)
- **`js/calculator/orbital.js`** — Orbital mechanics (`period`, `nightTime`)
- **`js/calculator/satellite.js`** — Chain logic (`position`, `distance`, `connectability`, `hasStableArea`, `stableLimitSma`)
  - **Critical**: `stableLimitSma(count, sma, range)` uses original `circleCross` formula (depends on orbit + range, not just count)

### Views (`js/views/`)
- **`planner.js`** — Grid: entire view (full-width) + night/single/multi (2×2) + data input sidebar
- **`entireView.js`** — Body disc (celestial color), red reach circles, black orbit + satellite dots, blue/red hop lines with arrows, green stable circle, yellow SOI circle, all labels
- **`nightView.js`, `singleLaunchView.js`, `multiLaunchView.js`** — Fixed-geometry schematics
- **`dataInput.js`** — Sidebar: body selector (folding), count/altitude/elc/parking, antenna list (qty/Show/Remove), MAM row
- **`bodyEdit.js`, `antennaEdit.js`** — Stock tables + user editors, copy-on-edit, protect in-use items
- **`settings.js`** — Stock data selector, range multiplier, MAM, export/import JSON, reset confirmation
- **`description.js`** — Help text
- **`plot.js`** — Shared: `ENTIRE_FRAME=800`, `SMALL_FRAME=400`, `plotScale()`, `bodyDisc()`, `at()`

## Key Patterns

### Reactive/Template
- Interpolate Signals/Fragments directly in `html`` — plain values freeze at construction
- `each(list, keyFn, renderFn)` — rows keyed by position, nodes reused
- **SVG namespace**: `html`` parses via `<template>.innerHTML` (HTML mode). Nested `each`/`computed` creating SVG elements become HTML elements (wrong namespace). Fix: generate SVG elements directly in main template string with inline `computed()` attribute bindings, or use `document.createElementNS` in `computed()` callbacks
- `ref=${signal}` — captures element reference (for post-render sync)
- `.disabled=${computed(() => boolean)}` — property binding for boolean attributes

### Store
- Chain stores **body/antenna names** (not record copies) — edits pick up immediately
- Persistence keys (v3 settings, v2 others):
  - `kspRemoteTechPlanner.settings` / `settingsVersion`
  - `kspRemoteTechPlanner.inputData` / `inputDataVersion`
  - `kspRemoteTechPlanner.userBody` / `userBodyVersion`
  - `kspRemoteTechPlanner.userAntenna` / `userAntennaVersion`
- `rangeModelType` intentionally dropped (was unused)

### SVG Rendering (Entire View)
All dynamic SVG elements created via `computed()` returning `DocumentFragment` with `createElementNS("http://www.w3.org/2000/svg", ...)`:
- Reach circles, satellite dots, hop lines, stable circle, SOI circle, distance labels

## CSS Conventions
- `app.css` — Planner grid, square figures via `aspect-ratio: 1`
- Plot colors: red reach, blue clear hops, red blocked hops, green stable, yellow SOI, black orbit/dots, body label with white stroke

## Testing
- `npm test` — Unit tests (calculator, html, reactive, store, sources)
- `npm run smoke` — Mounts all views in jsdom, mutates store, checks DOM integrity
- `npm run drive` — Interaction tests: types in fields, clicks buttons, verifies DOM stays stable
- `npm run check-imports` — Verifies all ES module imports resolve correctly
- Harnesses live in `test/harnesses/` (smoke.js, drive.js, check-imports.js)

## Development
- `npm run dev` — Local dev server (`serve` on port 8712) (user will run this manually)
- `npm run lint` — oxlint with explicit config (`oxlint.json`)
- `npm run format` — oxfmt with explicit config (`.oxfmtrc.json`)

## CI
- `.github/workflows/ci.yml` — Runs test, smoke, check-imports, lint, format on PRs

## Server
- `npm run dev` → `http://localhost:8712/` (dev server)

## Constraints
- Double quotes, semicolons, 4-space indentation
- Incremental commits; never commit unless asked
