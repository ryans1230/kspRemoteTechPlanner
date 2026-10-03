# Settings Schema Reference

Complete documentation of the settings object in `js/store.js`.

---

## Root Settings Object

```typescript
interface Settings {
  // Stock/General
  stockData: "stock" | "rss";
  commSystem: "stock" | "remoteTech";
  rangeMultiplier: number;
  multipleAntennaMultiplier: number;
  rangeModifier: number;
  DSNModifier: number;
  targetDSN: "level1" | "level2" | "level3";
  rangeDisplayMode: "dsn" | "antenna";

  // RemoteTech
  rtEnabled: boolean;
  rtRangeMultiplier: number;
  rtConsumptionMultiplier: number;
  rtMissionControlRangeMultiplier: number;
  rtOmniRangeClampFactor: number;
  rtDishRangeClampFactor: number;
  rtMultipleAntennaMultiplier: number;
  rtRangeModelType: "Standard" | "Root";
  rtTargetTechLevel: number;

  // RealAntennas
  raEnabled: boolean;
  raRangeMultiplier: number;
  raConsumptionMultiplier: number;
  raPlannerActiveTxTime: number;
  raMultipleAntennaMultiplier: number;
  raTargetTechLevel: number;
}
```

---

## Stock/General Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `stockData` | `"stock" \| "rss"` | `"stock"` | Which body list to use: stock KSP or Real Solar System |
| `commSystem` | `"stock" \| "remoteTech"` | `"stock"` | Comm system for antenna data and range formulas |
| `rangeMultiplier` | `number` | `1` | Global multiplier applied to **all antenna ranges** (after system-specific computation) |
| `multipleAntennaMultiplier` | `number` | `0` | MAM factor for **Stock** comm system (0-1). Linear interpolation between longest and sum of omni ranges |
| `rangeModifier` | `number` | `1.0` | Difficulty modifier for Stock: multiplies antenna power before range calc. 0.8 = Hard |
| `DSNModifier` | `number` | `1.0` | Difficulty modifier for Stock: multiplies DSN power before range calc. 0.8 = Hard |
| `targetDSN` | `"level1" \| "level2" \| "level3"` | `"level3"` | DSN level for Stock range display when `rangeDisplayMode === "dsn"` |
| `rangeDisplayMode` | `"dsn" \| "antenna"` | `"antenna"` | Stock range display: `"dsn"` = to selected DSN level, `"antenna"` = antenna-to-identical |

### Stock Range Display Modes

| Mode | Target | Formula |
|------|--------|---------|
| `antenna` | Identical antenna | `rangeToIdentical(antenna, 1, rangeModifier)` |
| `dsn` + `level1` | DSN Level 1 (2 Gm) | `rangeToDSN(antenna, "level1", 1, modifiers)` |
| `dsn` + `level2` | DSN Level 2 (50 Gm) | `rangeToDSN(antenna, "level2", 1, modifiers)` |
| `dsn` + `level3` | DSN Level 3 (250 Gm) | `rangeToDSN(antenna, "level3", 1, modifiers)` |

### Stock DSN Power Levels

| Level | Power (m) | Power (Gm) |
|-------|-----------|------------|
| 1 | 2,000,000,000 | 2 |
| 2 | 50,000,000,000 | 50 |
| 3 | 250,000,000,000 | 250 |

---

## RemoteTech Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `rtEnabled` | `boolean` | `false` | Enable RemoteTech antenna data and formulas |
| `rtRangeMultiplier` | `number` | `1.0` | Multiplier applied to RemoteTech antenna ranges (omniRange & dishRange) |
| `rtConsumptionMultiplier` | `number` | `1.0` | Multiplier applied to RemoteTech EC/s (`energyCost * multiplier`) |
| `rtMissionControlRangeMultiplier` | `number` | `1.0` | Multiplier applied to Mission Control ground station omni range |
| `rtOmniRangeClampFactor` | `number` | `100` | Clamp factor for omni antennas: max range = omniRange × clampFactor |
| `rtDishRangeClampFactor` | `number` | `1000` | Clamp factor for dish antennas: max range = dishRange × clampFactor |
| `rtMultipleAntennaMultiplier` | `number` | `0` | MAM factor for RemoteTech (0-1). Bonus = (sum - max) × multiplier added to **each** omni |
| `rtRangeModelType` | `"Standard" \| "Root"` | `"Standard"` | Range model: `"Standard"` = min(r1,r2), `"Root"` = min(r1,r2) + √(r1×r2) |
| `rtTargetTechLevel` | `number` | `3` | Mission Control tech level (1-3) for omni range: 1=4M, 2=30M, 3=75M |

### RemoteTech Range Models

| Model | Formula |
|-------|---------|
| Standard | `min(r1, r2)` |
| Root | `min(r1, r2) + sqrt(r1 * r2)` |

### RemoteTech Clamp Factors

| Antenna Type | Clamp Factor | Effective Max |
|--------------|--------------|---------------|
| Omni | 100 | omniRange × 100 |
| Dish | 1000 | dishRange × 1000 |

Final range = `min(maxDist, range1×clamp1, range2×clamp2)`

### Mission Control Omni Ranges

| Tech Level | Omni Range (m) | Omni Range (Mm) |
|------------|----------------|-----------------|
| 1 | 4,000,000 | 4 |
| 2 | 30,000,000 | 30 |
| 3 | 75,000,000 | 75 |

---

## RealAntennas Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `raEnabled` | `boolean` | `false` | Enable RealAntennas antenna data and link budget |
| `raRangeMultiplier` | `number` | `1.0` | Multiplier applied to computed RealAntennas ranges |
| `raConsumptionMultiplier` | `number` | `1.0` | Multiplier applied to computed EC/s |
| `raPlannerActiveTxTime` | `number` | `0` | Duty cycle for active transmission (0-1). 0 = idle only, 1 = continuous TX |
| `raMultipleAntennaMultiplier` | `number` | `0` | MAM factor for RealAntennas (0-1). Same formula as RemoteTech |
| `raTargetTechLevel` | `number` | `9` | Ground station tech level (0-9) for link budget range calc |

### RealAntennas EC/s Formula

```
idlePower = basePower / 1000  (kW)
activePower = (10^(TxPower/10) / powerEfficiency) * 1e-6  (kW)
EC/s = (idlePower + activePower * raPlannerActiveTxTime) * raConsumptionMultiplier
```

- `basePower` and `powerEfficiency` from antenna's tech level
- `TxPower` in dBm from antenna
- `raPlannerActiveTxTime = 0` → only idle power (receive mode)
- `raPlannerActiveTxTime = 1` → continuous transmission

### RealAntennas Ground Station Tech Levels

| Level | Bands Available | Notes |
|-------|-----------------|-------|
| 0 | L | L-band omni (6 dBi, 40 dBm) |
| 3 | L, S | S-band 26m dish (TL3) |
| 4 | L, S | S-band 64m dish (TL4) |
| 5 | L, S | S-band 64m + better encoder/noise (TL5) |
| 7 | L, S, X | X-band 64m dish (TL7) |
| 8 | L, S, X | X-band 64m + Turbo encoder (TL8) |
| 9 | L, S, X, K | All bands, best noise/encoders (TL9) |

---

## CommSystem vs raEnabled

| System | Controlled By | Antenna Data Source | Range Formula |
|--------|---------------|---------------------|---------------|
| Stock | `commSystem: "stock"` | `antennas-stock-raw.js` | CommNet (sqrt) |
| RemoteTech | `commSystem: "remoteTech"` + `rtEnabled: true` | `antennas-remotetech-raw.js` | RT clamp + min/root |
| RealAntennas | `raEnabled: true` (independent) | `antennas-realantennas-raw.js` | Link budget (physics) |

- `commSystem` is mutually exclusive: Stock OR RemoteTech
- `raEnabled` is independent: can be combined with either
- When `raEnabled: true`, RealAntennas antennas added to `availableAntennas`
- When `commSystem: "remoteTech"`, RemoteTech antennas added
- When `commSystem: "stock"`, Stock antennas always present

---

## Defaults

```javascript
const DEFAULT_SETTINGS = {
  // Stock
  stockData: "stock",
  commSystem: "stock",
  rangeMultiplier: 1,
  multipleAntennaMultiplier: 0,
  rangeModifier: 1.0,
  DSNModifier: 1.0,
  targetDSN: "level3",
  rangeDisplayMode: "antenna",
  // RemoteTech
  rtEnabled: false,
  rtRangeMultiplier: 1.0,
  rtConsumptionMultiplier: 1.0,
  rtMissionControlRangeMultiplier: 1.0,
  rtOmniRangeClampFactor: 100,
  rtDishRangeClampFactor: 1000,
  rtMultipleAntennaMultiplier: 0,
  rtRangeModelType: "Standard",
  rtTargetTechLevel: 3,
  // RealAntennas
  raEnabled: false,
  raRangeMultiplier: 1.0,
  raConsumptionMultiplier: 1.0,
  raPlannerActiveTxTime: 0,
  raMultipleAntennaMultiplier: 0,
  raTargetTechLevel: 9,
};
```

---

## Persistence

- Key: `kspRemoteTechPlanner.settings`
- Version: 4 (stored in `kspRemoteTechPlanner.settingsVersion`)
- Auto-saved via effect on every change
- Migration: `migrateSettings(json)` handles older versions

---

## UI Locations

| Setting | Tab | Section |
|---------|-----|---------|
| `stockData` | Settings | Stock data |
| `commSystem` | Settings | Comm system |
| `rangeMultiplier` | Settings | Range multiplier |
| `multipleAntennaMultiplier` | Settings | Multiple Antenna Multiplier |
| `rangeModifier`, `DSNModifier` | Settings | Difficulty modifiers |
| `targetDSN`, `rangeDisplayMode` | Settings | Range display |
| `rtEnabled` | Settings | RemoteTech section |
| `rtRangeMultiplier` | Settings | RemoteTech section |
| `rtConsumptionMultiplier` | Settings | RemoteTech section |
| `rtMissionControlRangeMultiplier` | Settings | RemoteTech section |
| `rtOmniRangeClampFactor` | Settings | RemoteTech section |
| `rtDishRangeClampFactor` | Settings | RemoteTech section |
| `rtMultipleAntennaMultiplier` | Settings | RemoteTech section |
| `rtRangeModelType` | Settings | RemoteTech section |
| `rtTargetTechLevel` | Settings | RemoteTech section |
| `raEnabled` | Settings | RealAntennas section |
| `raRangeMultiplier` | Settings | RealAntennas section |
| `raConsumptionMultiplier` | Settings | RealAntennas section |
| `raPlannerActiveTxTime` | Settings | RealAntennas section |
| `raMultipleAntennaMultiplier` | Settings | RealAntennas section |
| `raTargetTechLevel` | Settings | RealAntennas section |

---

## Validation/Constraints

| Setting | Min | Max | Notes |
|---------|-----|-----|-------|
| `rangeMultiplier` | >0 | — | Applied globally |
| `multipleAntennaMultiplier` | 0 | 1 | Stock only |
| `rangeModifier` | >0 | — | Stock difficulty |
| `DSNModifier` | >0 | — | Stock difficulty |
| `rtRangeMultiplier` | >0 | — | RT only |
| `rtConsumptionMultiplier` | >0 | — | RT only |
| `rtMissionControlRangeMultiplier` | >0 | — | RT only |
| `rtOmniRangeClampFactor` | >0 | — | RT only |
| `rtDishRangeClampFactor` | >0 | — | RT only |
| `rtMultipleAntennaMultiplier` | 0 | 1 | RT only |
| `rtTargetTechLevel` | 1 | 3 | RT only |
| `raRangeMultiplier` | >0 | — | RA only |
| `raConsumptionMultiplier` | >0 | — | RA only |
| `raPlannerActiveTxTime` | 0 | 1 | RA only |
| `raMultipleAntennaMultiplier` | 0 | 1 | RA only |
| `raTargetTechLevel` | 0 | 9 | RA only |

---

## Migration Notes

- `rangeModelType` was dropped in v4 (was unused)
- `commSystem` added in v4 (was implicit before)
- RT/RA settings added in v4
- Old settings without these fields get defaults