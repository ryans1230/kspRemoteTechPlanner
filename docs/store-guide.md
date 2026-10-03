# Store Guide

## Overview

`js/store.js` — Central state management using signals (`js/reactive.js`). Single source of truth for all persisted and derived state.

---

## Core Signals

```javascript
// Raw persisted state
const settings = signal(migrateSettings(readJson(storage, KEYS.settings, DEFAULT_SETTINGS)));
const chain = signal(migrateChain(readJson(storage, KEYS.chain, DEFAULT_CHAIN)));
const userBodies = signal(migrateUserBodies(readJson(storage, KEYS.userBodies, {})));
const userAntennas = signal(migrateUserAntennas(readJson(storage, KEYS.userAntennas, {})));
const userCrafts = signal(migrateUserCrafts(readJson(storage, KEYS.userCrafts, {})));

// Auto-persist via effects
effect(() => writeJson(storage, KEYS.settings, settings.value));
// ... same for chain, userBodies, userAntennas, userCrafts
```

---

## Derived State (Computed)

### `body` — Current Body
```javascript
const body = computed(() => {
  const current = chain.value;
  return findBody(userBodies.value, current.body) ?? findBody(userBodies.value, FALLBACK_BODY);
});
```
Resolves chain's body name to stock or user body. Falls back to Kerbin.

### `antennas` — Chain Antenna Slots with Resolved Data
```javascript
const antennas = computed(() => {
  const current = chain.value;
  const known = availableAntennas(settings.value, userAntennas.value);
  return current.antennas
    .map((slot) => ({ ...slot, antenna: known.get(slot.antenna) }))
    .filter((slot) => slot.antenna !== undefined);
});
```
Maps chain antenna names to full antenna objects from `availableAntennas`.

### `mam` — Multiple Antenna Multiplier (Combined Omni)
```javascript
const mam = computed(() => {
  const omni = antennas.value.filter((slot) => slot.antenna.type === "omni");
  const longest = Math.max(0, ...omni.map((slot) => slot.antenna.range));
  const combined = omni.reduce((total, slot) => total + slot.antenna.range * slot.quantity, 0);
  
  // Range calculation varies by commSystem
  // EC = sum of individual EC/s * quantity (NO rangeMultiplier)
  
  return { name: "Multiple Antenna Multiplier", type: "omni", range, elcNeeded: elcTotal };
});
```

### `selectedAntenna` — Currently Displayed Antenna
```javascript
const selectedAntenna = computed(() =>
  chain.value.antennaIndex === MAM_INDEX ? mam.value : antennas.value[chain.value.antennaIndex]?.antenna
);
```
`antennaIndex === -1` means show MAM combined.

### `availableAntennas` — All Selectable Antennas
```javascript
const availableAntennas = computed(() => availableAntennas(settings.value, userAntennas.value));
```
Builds Map of all antennas filtered by enabled comm systems, with computed range/EC.

---

## `availableAntennas(settings, userAntennas)` Function

**Source:** `js/store.js` lines ~686-758

### Logic Flow

1. **Stock antennas** — Always included
   - Filter: `raw.source === "Squad"` and not hidden
   - Compute range via `computeStockAntennaRange(raw, settings)`
   - Compute EC via `stockComputeEC(raw)`

2. **RemoteTech antennas** — Only if `settings.rtEnabled`
   - Compute range via `computeRTAntennaRange(raw, settings)`
   - Compute EC via `rtComputeEC(raw, settings.rtConsumptionMultiplier)`

3. **RealAntennas antennas** — Only if `settings.raEnabled`
   - Compute range via `computeRealAntennasRange(raw, settings)`
   - Compute EC via `raComputeEC(raw, settings.raConsumptionMultiplier, settings.raPlannerActiveTxTime)`

4. **User antennas** — Always included

5. **Apply global `rangeMultiplier`** to all ranges at the end

### Range Computation by System

#### Stock (`computeStockAntennaRange`)
- `rangeDisplayMode === "antenna"`: `rangeToIdentical(raw, 1, rangeModifier)`
- `targetDSN === "level1/2/3"`: `rangeToDSN(raw, level, 1, modifiers)`

#### RemoteTech (`computeRTAntennaRange`)
- `rangeDisplayMode === "antenna"`: `rtComputeRange(multiplied, multiplied, rtSettings)`
- Default (Mission Control): `rangeToMissionControl(multiplied, rtSettings, mcOmni)`
  - MC omni: 4M/30M/75M based on `rtTargetTechLevel` (1-3)

#### RealAntennas (`computeRealAntennasRange`)
- `rangeDisplayMode === "antenna"`: Link budget antenna-to-antenna
- Default: Link budget to best ground station for `raTargetTechLevel`

---

## Settings Object

```typescript
interface Settings {
  // Stock
  stockData: "stock" | "rss";
  commSystem: "stock" | "remoteTech";  // RealAntennas is separate flag
  rangeMultiplier: number;
  multipleAntennaMultiplier: number;
  rangeModifier: number;        // Difficulty (1.0 normal, 0.8 hard)
  DSNModifier: number;
  targetDSN: "level1" | "level2" | "level3";
  rangeDisplayMode: "dsn" | "antenna";

  // RemoteTech
  rtEnabled: boolean;
  rtRangeMultiplier: number;
  rtConsumptionMultiplier: number;
  rtMissionControlRangeMultiplier: number;
  rtOmniRangeClampFactor: number;    // default 100
  rtDishRangeClampFactor: number;    // default 1000
  rtMultipleAntennaMultiplier: number; // default 0
  rtRangeModelType: "Standard" | "Root";
  rtTargetTechLevel: number;         // 1-3 for MC omni

  // RealAntennas
  raEnabled: boolean;
  raRangeMultiplier: number;
  raConsumptionMultiplier: number;
  raPlannerActiveTxTime: number;     // 0-1 duty cycle
  raMultipleAntennaMultiplier: number;
  raTargetTechLevel: number;         // 0-9 for ground station
}
```

---

## Chain Object

```typescript
interface Chain {
  body: string;              // Body name
  count: number;             // Satellites in chain (1-30)
  altitude: number;          // Target orbit altitude (km)
  elcNeeded: number;         // Probe EC/s (excluding antennas)
  antennas: AntennaSlot[];   // [{ antenna: string, quantity: number }]
  antennaIndex: number;      // Selected antenna (-1 = MAM)
  parkingAlt: number;        // Parking orbit altitude (km)
}

interface AntennaSlot {
  antenna: string;   // Antenna name
  quantity: number;  // How many on each satellite
}
```

---

## Persistence Keys

| Key | Version | Content |
|-----|---------|---------|
| `kspRemoteTechPlanner.settings` | 4 | Settings object |
| `kspRemoteTechPlanner.inputData` | 2 | Chain object |
| `kspRemoteTechPlanner.userBody` | 2 | User bodies `{name: Body}` |
| `kspRemoteTechPlanner.userAntenna` | 2 | User antennas `{name: Antenna}` |
| `kspRemoteTechPlanner.userCraft` | 1 | User crafts `{name: {name, antennas}}` |

**Prefix:** `kspRemoteTechPlanner.` (from angular-local-storage)

---

## Migrations

```javascript
migrateSettings(json)  // v4: adds commSystem, RT/RA settings
migrateChain(json)     // v2: converts single antenna → array, extracts names
migrateUserAntennas(json)  // v2: numeric type → "omni"/"dish"
migrateUserBodies(json)    // v2: validates fields
migrateUserCrafts(json)    // v1: converts legacy format
```

- Chain stores **names** not copies → editing stock picks up immediately
- `rangeModelType` dropped (was unused)

---

## Actions (Mutate State)

```javascript
updateSettings(patch)    // Merges, handles commSystem/rtEnabled/raEnabled changes
updateChain(patch)       // Merges
addAntenna(name)         // Appends slot
removeAntenna(index)     // Removes, adjusts antennaIndex
setAntenna(index, name)  // Replaces antenna at index
setQuantity(index, qty)  // Updates quantity (min 1)

saveBody(name, body)     // Adds/updates user body
removeBody(name)         // Removes, falls back chain if needed

saveAntenna(name, antenna)  // Adds/updates user antenna
removeAntennaDefinition(name)  // Removes, cleans chain slots

saveCraft(name, antennas)     // Stores current chain as craft
removeCraft(name)
renameCraft(oldName, newName)
loadCraft(name)               // Replaces chain antennas, resets index

reset()  // Clears all storage, restores defaults
```

---

## CommSystem Switching Logic

In `updateSettings(patch)`:

1. **commSystem changed** → Reset chain antennas to first available from new system
2. **stockData changed** → Fall back chain body to first body in new list
3. **rtEnabled/raEnabled changed** → If chain has now-unavailable antennas, reset to first available

---

## MAM (Multiple Antenna Multiplier) Details

**File:** `js/store.js` lines ~786-850

```javascript
const mam = computed(() => {
  const omni = antennas.value.filter((s) => s.antenna.type === "omni");
  const longest = Math.max(0, ...omni.map((s) => s.antenna.range));
  const combined = omni.reduce((t, s) => t + s.antenna.range * s.quantity, 0);

  let range, elcTotal;

  if (stock) {
    range = longest + (combined - longest) * multipleAntennaMultiplier;
    elcTotal = sum(baseEC * qty);  // baseEC from stockComputeEC or antenna.elcNeeded
  } else if (remoteTech) {
    bonus = computeMultipleAntennaBonus(longest/rm, combined/rm, rtMAM);
    range = (longest + bonus) * rangeMultiplier;
    elcTotal = sum(baseEC * qty);  // baseEC from rtComputeEC or antenna.elcNeeded
  } else {  // RealAntennas
    bonus = computeMultipleAntennaBonus(longest/rm, combined/rm, raMAM);
    range = (longest + bonus) * rangeMultiplier;
    elcTotal = sum(baseEC * qty);  // baseEC from raComputeEC or antenna.elcNeeded
  }

  return { name: "Multiple Antenna Multiplier", type: "omni", range, elcNeeded: elcTotal };
});
```

**Key:** EC is sum of individual EC/s × quantity. **No rangeMultiplier applied to EC.**

---

## Settings Defaults

```javascript
const DEFAULT_SETTINGS = {
  stockData: "stock",
  commSystem: "stock",
  rangeMultiplier: 1,
  multipleAntennaMultiplier: 0,
  rangeModifier: 1.0,
  DSNModifier: 1.0,
  targetDSN: "level3",
  rangeDisplayMode: "antenna",
  rtEnabled: false,
  rtRangeMultiplier: 1.0,
  rtConsumptionMultiplier: 1.0,
  rtMissionControlRangeMultiplier: 1.0,
  rtOmniRangeClampFactor: 100,
  rtDishRangeClampFactor: 1000,
  rtMultipleAntennaMultiplier: 0,
  rtRangeModelType: "Standard",
  rtTargetTechLevel: 3,
  raEnabled: false,
  raRangeMultiplier: 1.0,
  raConsumptionMultiplier: 1.0,
  raPlannerActiveTxTime: 0,
  raMultipleAntennaMultiplier: 0,
  raTargetTechLevel: 9,
};
```

---

## Chain Defaults

```javascript
const DEFAULT_CHAIN = {
  body: "Kerbin",
  count: 4,
  altitude: 1000,
  elcNeeded: 0.029,
  antennas: [{ antenna: "Communotron 16", quantity: 1 }],
  antennaIndex: 0,
  parkingAlt: 70,
};
```

---

## Usage in Views

```javascript
// In view module:
export function myView(store) {
  const body = store.body;           // Computed
  const chain = store.chain;         // Signal
  const antennas = store.antennas;   // Computed
  const mam = store.mam;             // Computed
  const selectedAntenna = store.selectedAntenna;  // Computed
  const availableAntennas = store.availableAntennas;  // Computed

  return html`
    <select @change=${(e) => store.updateChain({ body: e.target.value })}>
      ${each(bodyOptions(store), ...)}
    </select>
  `;
}
```

- Views import store and read signals/computed directly
- Mutations via `store.updateSettings()`, `store.updateChain()`, etc.
- All derived state auto-updates via reactive graph