# Architecture Overview

## Module Graph

```
index.html
  └── js/main.js (tab router, lazy-mounts panels)
        ├── js/store.js (central state, persistence, derived signals)
        ├── js/reactive.js (signal, computed, effect)
        ├── js/html.js (template engine: html``, each, mount, ref=, .prop=, @event=)
        ├── js/format.js (number, length, duration formatting)
        ├── js/calculator/ (4 calculator modules)
        │     ├── stock-antenna.js (CommNet range/EC)
        │     ├── rss-antenna.js (RSS CommNet range/EC, 20x multipliers)
        │     ├── remote-tech-antenna.js (RT range/EC)
        │     ├── realantennas-antenna.js (RA link budget)
        │     ├── satellite.js (constellation logic)
        │     ├── orbital.js (orbital mechanics)
        │     └── euclidean.js (geometry)
        └── js/views/ (11 view modules)
              ├── planner.js (grid: entire + 2x2 small + data input sidebar)
              ├── entireView.js (full-width orbital view)
              ├── nightView.js (fixed schematic)
              ├── singleLaunchView.js (fixed schematic + deltaV)
              ├── multiLaunchView.js (fixed schematic + deltaV)
              ├── dataInput.js (body selector, chain config, antenna list, MAM)
              ├── settings.js (stock data, multipliers, export/import, reset)
              ├── bodyEdit.js (stock + user bodies)
              ├── antennaEdit.js (stock + user antennas)
              ├── craft.js (save/load/rename/delete craft presets)
              └── description.js (help text)
```

## Core Data Flow

```
User Input (dataInput.js, settings.js, bodyEdit.js, antennaEdit.js)
    │
    ▼
store.js updateSettings() / updateChain() / saveBody() / saveAntenna()
    │
    ├──▶ settings signal ──▶ availableAntennas computed ──▶ view renders
    ├──▶ chain signal ──▶ antennas/mam/selectedAntenna computed ──▶ view renders
    ├──▶ userBodies/userAntennas signals ──▶ availableAntennas/bodyOptions ──▶ view renders
    │
    ▼
localStorage (auto-persisted via effects)
```

## Calculator Modules (Pure Functions)

| Module | Purpose | Used By |
|--------|---------|---------|
| `euclidean.js` | Geometry (circleCross, distPointLine, length) | satellite.js, entireView.js |
| `orbital.js` | Orbital mechanics (period, nightTime, slidePhaseAngle) | satellite.js, singleLaunchView.js, multiLaunchView.js |
| `satellite.js` | Constellation logic (position, distance, connectability, hasStableArea, stableLimitSma, requiredBattery, requiredGenerator, slidePhaseAngle/Time) | planner.js, entireView.js, nightView.js, singleLaunchView.js, multiLaunchView.js |
| `stock-antenna.js` | CommNet range/EC (computeRangeKm, computeCombinedPower, rangeToDSN, rangeToIdentical, computeECPerSecond) | store.js (availableAntennas) |
| `rss-antenna.js` | RSS CommNet range/EC (same API as stock-antenna.js, 20x multipliers) | store.js (availableAntennas when stockData="rss") |
| `remote-tech-antenna.js` | RT range/EC (computeRange, rangeToMissionControl, computeECPerSecond, applyRangeMultiplier, computeMultipleAntennaBonus) | store.js (availableAntennas) |
| `realantennas-antenna.js` | Link budget (gain, pathLoss, pointingLoss, computeReceivedPower, computeECPerSecond, computeLinkBudget) | store.js (availableAntennas) |
| `antennas-nearfutureexploration-raw.js` | NFE CommNet raw data + range/EC helpers | store.js (availableAntennas when nfeEnabled=true) |

## View Lifecycle

1. **main.js** loads all view modules upfront
2. On tab click: `mount(panel, render(store))` from `html.js`
3. View returns a `Fragment` with template + reactive bindings
4. `html.js` parses template via `<template>.innerHTML` (HTML mode)
5. Reactive bindings wired:
   - Text: `${signal}` → subscribes to signal
   - Property: `.prop=${computed}` → subscribes to computed
   - Event: `@event=${handler}` → adds listener
   - Ref: `ref=${signal}` → captures element
   - Each: `each(list, keyFn, renderFn)` → reuses DOM nodes by position
6. On store mutation: effects fire → computed re-evaluate → DOM updates

## SVG Namespace Gotcha

`html`` parses via `innerHTML` → HTML mode. Nested `each`/`computed` creating SVG elements become HTML elements (wrong namespace).

**Fix**: Generate SVG elements directly in main template string with inline `computed()` attribute bindings, or use `document.createElementNS("http://www.w3.org/2000/svg", ...)` in `computed()` callbacks.

See `entireView.js` for pattern: all dynamic SVG created via `computed()` returning `DocumentFragment` with `createElementNS`.

## Key Patterns

### Reactive/Template
- Interpolate Signals/Fragments directly in `html`` — plain values freeze at construction
- `each(list, keyFn, renderFn)` — rows keyed by position, nodes reused
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

### Settings/CommSystem Switching
- `commSystem: "stock" | "remoteTech"` (RealAntennas is `raEnabled` flag)
- Switching commSystem resets chain antennas to first available from enabled groups
- Disabling RT/RA removes those antennas from `availableAntennas`

## CSS Conventions

- `app.css` — Planner grid, square figures via `aspect-ratio: 1`
- Plot colors: red reach, blue clear hops, red blocked hops, green stable, yellow SOI, black orbit/dots, body label with white stroke

## Testing

- `npm test` — Unit tests (calculator, html, reactive, store, sources)
- `npm run smoke` — Mounts all views in jsdom, mutates store, checks DOM integrity
- `npm run drive` — Interaction tests: types in fields, clicks buttons, verifies DOM stays stable
- `npm run check-imports` — Verifies all ES module imports resolve correctly

## CI

- `.github/workflows/ci.yml` — Runs test, smoke, check-imports, lint, format on PRs

## Server

- `npm run dev` → `http://localhost:8712/` (dev server)