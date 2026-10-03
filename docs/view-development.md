# View Development Guide

## Adding a New View

1. Create `js/views/myView.js` exporting a render function
2. Import in `js/main.js` and add to `views` object
3. Add tab button in `index.html` `<nav id="tabs">`

```javascript
// js/views/myView.js
import { computed } from "../reactive.js";
import { html } from "../html.js";

/** @param {import("../store.js").Store} store */
export function myView(store) {
  return html`...`;
}
```

```javascript
// js/main.js
import { myView } from "./views/myView.js";
const views = { ..., myView };
```

```html
<!-- index.html -->
<button data-tab="myView">My View</button>
```

## Tab Router (`js/main.js`)

- Loads all view modules upfront
- On hash change: `mount(panel, views[tab](store))`
- Lazy: views only mount when tab first visited
- Panel content replaced entirely on tab switch

## Template Engine (`js/html.js`)

### Tagged Template: `html``

```javascript
html`<div>${signal}</div>`  // interpolates signal → subscribes
html`<div>${computed(() => x)}</div>`  // computed → reactive
html`<input .value=${signal} @input=${handler}>`  // props + events
html`<svg><circle r=${computed(() => r)} /></svg>`  // SVG needs namespace fix
```

### Key Directives

| Syntax | Purpose |
|--------|---------|
| `${signal}` | Text interpolation (subscribes) |
| `${fragment}` | Fragment interpolation |
| `.prop=${computed}` | Property binding (boolean attrs: `.disabled`, `.checked`) |
| `@event=${handler}` | Event listener (`@click`, `@input`, `@change`) |
| `ref=${signal}` | Captures element ref (`signal.set(element)`) |
| `each(list, keyFn, renderFn)` | Keyed list rendering |

### `each(list, keyFn, renderFn)`

```javascript
each(
  store.antennas,
  (_slot, index) => index,  // key by position
  (_slot, index) => html`...`  // renderFn receives (slot, index)
)
```

- Rows keyed by position (not identity)
- DOM nodes reused when item at position changes
- **Never** read from slot in renderFn — use fresh `computed(() => store.antennas.value[index])`

### `mount(container, fragment)`

```javascript
import { mount } from "./html.js";
mount(panel, myView(store));
```

- Appends fragment to container
- Wires all reactive bindings
- Returns cleanup function (call to unsubscribe all effects)

## SVG Namespace Gotcha

**Problem:** `html`` parses via `<template>.innerHTML` → HTML mode. Nested `each`/`computed` creating SVG elements become `HTMLUnknownElement` (wrong namespace).

**Fix 1: Inline computed in main template**
```javascript
html`<svg>
  <circle r=${computed(() => r)} />
</svg>`
```

**Fix 2: createElementNS in computed callback**
```javascript
computed(() => {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", r.value);
  return circle;
})
```

**Fix 3: DocumentFragment with createElementNS**
```javascript
computed(() => {
  const frag = document.createDocumentFragment();
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", r.value);
  frag.appendChild(circle);
  return frag;
})
```

See `entireView.js` — all dynamic SVG uses Fix 3.

## Plot Utilities (`js/views/plot.js`)

```javascript
const ENTIRE_FRAME = 800;   // full-width view
const SMALL_FRAME = 400;    // 2x2 grid views

// Scale data coords (km) → SVG pixels
function plotScale(frameSize, maxDataCoord) {
  return frameSize / 2 / maxDataCoord;
}

// Draw body disc at center
function bodyDisc(radius, color, scale) { ... }

// Convert data coord → SVG coord
function at(point, scale, frameSize) {
  return { x: frameSize/2 + point.x*scale, y: frameSize/2 - point.y*scale };
}
```

## View Structure Patterns

### Data Input View (`dataInput.js`)

```javascript
export function dataInputView(store) {
  const body = store.body;
  const chain = store.chain;
  const radius = computed(() => body.value?.radius ?? 0);
  // ...
  return html`
    <div class="stack">
      <h2>Data input</h2>
      <fieldset class="input">
        <legend>Body</legend>
        ${selectField({...})}
        ${folding("Body details", html`...`)}
      </fieldset>
    </div>
  `;
}
```

- Uses `computed` for derived values
- `selectField`, `numberField` from `field.js` for form inputs
- `folding` for collapsible detail tables

### Planner View (`planner.js`)

```javascript
export function plannerView(store) {
  return html`
    <div class="grid">
      <section class="entire">${entireView(store)}</section>
      <section class="small">${nightView(store)}</section>
      <section class="small">${singleLaunchView(store)}</section>
      <section class="small">${multiLaunchView(store)}</section>
      <aside class="data-input">${dataInputView(store)}</aside>
    </div>
  `;
}
```

- CSS grid layout: `aspect-ratio: 1` for square figures
- Composes sub-views directly in template

### Editor Views (`bodyEdit.js`, `antennaEdit.js`)

- Stock table + user editors
- Copy-on-edit: user edits create new entry, stock preserved
- Protect in-use items (can't delete if referenced in chain)

## Field Helpers (`js/views/field.js`)

```javascript
selectField({ label, options, follow, onInput, readout })
numberField({ label, min, max, step, follow, onInput, readout })
```

- `follow: () => value` — signal/computed for current value
- `onInput: (value) => store.updateX({...})` — handler
- `readout: () => formatted` — optional display formatter

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.stack` | Vertical stack with gap |
| `.input` | Fieldset wrapper |
| `.fold` | `<details>` wrapper |
| `.data.detail` | Detail table inside fold |
| `.antenna-row` | Antenna list row |
| `.antenna-controls` | Show/qty/Remove buttons |
| `.actions` | Button group |
| `.primary` | Primary button |
| `.danger` | Delete button |
| `.field` | Label + input wrapper |

## Reactive Patterns

### Derived Values in Views

```javascript
const count = computed(() => Math.max(1, Math.min(COUNT_LIMIT, chain.value.count)));
const radius = computed(() => body.value?.radius ?? 0);
```

- Always use `computed` for derived values
- Keeps template clean, avoids recalculation

### Conditional Rendering

```javascript
html`
  ${computed(() => condition.value ? html`...` : "")}
`
```

- Use `computed` returning fragment or empty string

### Event Handlers

```javascript
@click=${() => store.updateChain({ count: newValue })}
@input=${(e) => store.updateChain({ altitude: Number(e.target.value) })}
```

- Arrow functions capture current scope
- For `<select>`: use `@change` or `@input` with `e.target.value`

## Testing Views

### Smoke Test
```bash
npm run smoke
```
Mounts all views in jsdom, mutates store, verifies DOM integrity.

### Drive Test
```bash
npm run drive
```
Simulates user interactions: types in fields, clicks buttons, verifies DOM stability.

### Manual Testing
```bash
npm run dev
# Open http://localhost:8712/
```

## Common Pitfalls

1. **Reading stale slot in `each` renderFn** — Always use `computed(() => list.value[index])`
2. **SVG namespace** — Use `createElementNS` for dynamic SVG
3. **Signal interpolation** — Plain values freeze; use signals/computed in template
4. **Event binding** — Use `@event=${handler}` not `onEvent=${handler}`
5. **Boolean attributes** — Use `.disabled=${computed}` not `disabled=${signal}`

## File Organization

```
js/views/
  myView.js          # Main export: myView(store)
  myView.css         # Optional, imported in myView.js if needed
```

Keep view logic self-contained. Share utilities via `plot.js`, `format.js`, `field.js`.