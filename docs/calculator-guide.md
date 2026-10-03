# Calculator Guide

Four independent calculator systems for the three comm systems. All pure functions.

---

## Stock (CommNet)

**File:** `js/calculator/stock-antenna.js`

### Core Formula

```
range = sqrt(antennaPower_A * antennaPower_B) / 1000  // km
EC/s  = packetResourceCost / packetInterval
```

### Functions

| Function | Purpose |
|----------|---------|
| `computeECPerSecond(antenna)` | Returns `antenna.packetResourceCost / antenna.packetInterval` |
| `applyRangeModifier(power, modifier)` | `power * modifier` |
| `applyDSNModifier(dsnPower, modifier)` | `dsnPower * modifier` |
| `computeRangeKm(aPower, bPower)` | `sqrt(aPower * bPower) / 1000` |
| `computeCombinedPower(singlePower, count, exponent=0.75)` | `max * (sum/max)^exponent` where `sum = singlePower * count`, `max = singlePower` |
| `rangeToDSN(antenna, level, quantity, modifiers)` | Range from antenna (or combined array) to DSN level |
| `rangeToIdentical(antenna, quantity, rangeModifier)` | Range between two identical antennas (relay-to-relay) |
| `rangeBetween(antennaA, antennaB, quantityA, quantityB, rangeModifier)` | Range between two different antennas |

### Combining Antennas (MAM)

- **Combinable** antennas: `combinedPower = max * (sum/max)^exponent`
- **Non-combinable**: no combining (exponent effectively 0)
- Default exponent: 0.75 (stock), 1.0 (Communotron 16)

### DSN Power Levels

| Level | Power (meters) |
|-------|----------------|
| 1 | 2,000,000,000 (2 Gm) |
| 2 | 50,000,000,000 (50 Gm) |
| 3 | 250,000,000,000 (250 Gm) |

### Raw Data (`js/data/antennas-stock-raw.js`)

```typescript
interface StockAntennaRaw {
  name: string;
  type: "omni" | "dish";           // DIRECT=omni, RELAY=dish
  antennaPower: number;            // meters (raw cfg)
  packetInterval: number;          // seconds
  packetSize: number;              // Mits
  packetResourceCost: number;      // EC/packet
  antennaCombinable: boolean;
  antennaCombinableExponent: number; // default 0.75
  source: "Squad";
  hidden?: boolean;
}
```

---

## Stock (RSS - Real Solar System)

**File:** `js/calculator/rss-antenna.js`

Uses the same CommNet formula but with RSS-specific constants:

- **Antenna power multiplier**: 20x (from `DSN_Ranges.cfg` `@antennaPower *= 20`)
- **DSN power levels** (20x stock, from `CustomBarnKit` `DSNRange`):

| Level | Power (meters) |
|-------|----------------|
| 1 | 5,000,000,000 (5 Gm) |
| 2 | 500,000,000,000 (500 Gm) |
| 3 | 50,000,000,000,000 (50 Tm) |

### Functions

Same API as `stock-antenna.js` but uses `RSS_DSN_POWER` and `RSS_ANTENNA_POWER_MULTIPLIER`.

The `rangeModifier` and `DSNModifier` settings still apply on top of RSS multipliers.

### Raw Data

Same `js/data/antennas-stock-raw.js` — RSS uses the same antenna definitions, just scaled by 20x.

---

## RemoteTech

**File:** `js/calculator/remote-tech-antenna.js`

### Core Formula

```
EC/s = energyCost * consumptionMultiplier

Range between two antennas:
  maxDist = Standard: min(r1, r2)
            Root:   min(r1, r2) + sqrt(r1 * r2)
  clamp1 = r1 * (omni:100, dish:1000)
  clamp2 = r2 * (omni:100, dish:1000)
  result = min(maxDist, clamp1, clamp2)
  Take max of all 4 combinations (omni/omni, omni/dish, dish/omni, dish/dish)

Range to Mission Control:
  Only omni/omni and dish/omni (MC is omni-only)
  MC omni ranges: 4M, 30M, 75M (tech levels 1,2,3)
```

### Functions

| Function | Purpose |
|----------|---------|
| `computeECPerSecond(antenna, consumptionMultiplier=1.0)` | `energyCost * multiplier` |
| `applyRangeMultiplier(antenna, multiplier)` | Multiplies both omniRange and dishRange |
| `computeMultipleAntennaBonus(maxOmni, totalOmni, multiplier)` | `(totalOmni - maxOmni) * multiplier` added to each omni |
| `standardMaxDistance(r1, r2)` | `min(r1, r2)` |
| `rootMaxDistance(r1, r2)` | `min(r1, r2) + sqrt(r1 * r2)` |
| `checkRange(range1, clamp1, range2, clamp2, maxDistFn)` | `min(maxDist, range1*clamp1, range2*clamp2)` |
| `computeRange(antennaA, antennaB, settings)` | Max of 4 connection types with clamps |
| `rangeToMissionControl(antenna, settings, mcOmni=75M)` | Max of omni/omni and dish/omni to MC |
| `metersToKm(meters)` | `/ 1000` |

### Combining Antennas (MAM)

- Bonus = `(sum of all omni ranges - max omni range) * MultipleAntennaMultiplier`
- Bonus added to **each** omni antenna's range
- Only affects omni antennas

### Raw Data (`js/data/antennas-remotetech-raw.js`)

```typescript
interface RemoteTechAntennaRaw {
  name: string;
  type: "omni" | "dish";
  omniRange: number;      // meters (0 if dish-only)
  dishRange: number;      // meters (0 if omni-only)
  energyCost: number;     // EC/s (direct from cfg)
  dishAngle: number;      // degrees (0 for omni)
  maxQ: number;           // kPa (-1 if none)
  combinable: true;       // always true for RT
  combinableExponent: 0.75; // not used by RT, for compat
  source: "RemoteTech";
  hidden?: boolean;
}
```

### Settings

```typescript
interface RTSettings {
  rtEnabled: boolean;
  rtRangeMultiplier: number;
  rtConsumptionMultiplier: number;
  rtMissionControlRangeMultiplier: number;
  rtOmniRangeClampFactor: number;   // default 100
  rtDishRangeClampFactor: number;   // default 1000
  rtMultipleAntennaMultiplier: number; // default 0
  rtRangeModelType: "Standard" | "Root";
  rtTargetTechLevel: number; // 1-3 for MC omni
}
```

---

## RealAntennas

**File:** `js/calculator/realantennas-antenna.js`

### Core Physics (Link Budget)

```
Gain (dBi) = 10 * log10(9.87 * efficiency * diameter² / wavelength²)
  where wavelength = c / frequency, c = 2.998e8

FSPL (dB) = 20 * log10(distance * frequency) - 147.55

RxPower (dBm) = TxPower + TxGain - FSPL - PointingLossTx - PointingLossRx + RxGain

NoiseTemp (K) = amwTemp + 2.725 (cosmic)
N0 (dBm/Hz) = -198.599 + 10*log10(NoiseTemp)

Eb/N0 = RxPower - N0 - 10*log10(DataRate)

At max range: Eb/N0 = requiredEbN0 (from encoder)
```

### EC/s (kW = EC/s)

```
idlePower = basePower / 1000  (kW)
activePower = (10^(TxPower/10) / powerEfficiency) * 1e-6  (kW)
EC/s = (idlePower + activePower * plannerActiveTxTime) * consumptionMultiplier
```

- `basePower` from tech level (W)
- `powerEfficiency` from tech level (mW/dBm, already /1000)
- `TxPower` in dBm
- `plannerActiveTxTime` = fraction of time actively transmitting (0-1)

### Functions

| Function | Purpose |
|----------|---------|
| `computeGain(antenna)` | Dish: from diameter + freq + efficiency. Omni: from referenceGain + freq scaling |
| `gainFromDishDiameter(diameter, freq, efficiency)` | Dish gain in dBi |
| `gainFromReference(refGain, refFreq, newFreq)` | Omni gain scaling (≤5 dBi not scaled) |
| `beamwidth(gain)` | HPBW = sqrt(52525 / linear(gain)) degrees |
| `pathLoss(distance, frequency)` | FSPL in dB |
| `pointingLoss(angle, beamwidth)` | Lookup table (0-200 dB) |
| `computeReceivedPower(tx, rx, distance)` | Full link budget |
| `computeNoiseTemperature(rx, distance, targetBody)` | amwTemp + cosmic (placeholder for body noise) |
| `computeECPerSecond(antenna, consumptionMultiplier, plannerActiveTxTime)` | Idle + active * dutyCycle |
| `computeLinkBudget(tx, rx, distance)` | Debug breakdown |
| `linkToMissionControl(antenna, settings)` | Placeholder (ground station) |

### Tech Levels (0-9)

| Level | powerEfficiency | reflectorEfficiency | minDataRate | maxDataRate | basePower(W) | receiverNoiseTemp(K) |
|-------|-----------------|---------------------|-------------|-------------|--------------|---------------------|
| 0 | 5.55e-5 | 0.50 | 4 | 4 | 42 | 27000 |
| 1 | 7.69e-5 | 0.52 | 4 | 4 | 38 | 11500 |
| 2 | 1.0e-4 | 0.54 | 1 | 64 | 34 | 7000 |
| 3 | 1.304e-4 | 0.56 | 8 | 64 | 29 | 5800 |
| 4 | 1.667e-4 | 0.58 | 8 | 4096 | 25.7 | 4500 |
| 5 | 2.222e-4 | 0.60 | 16 | 16384 | 23 | 3000 |
| 6 | 2.5e-4 | 0.62 | 16 | 131072 | 21.4 | 1540 |
| 7 | 3.0e-4 | 0.64 | 16 | 262144 | 18.3 | 1100 |
| 8 | 3.724e-4 | 0.66 | 16 | 262144 | 14.3 | 500 |
| 9 | 4.397e-4 | 0.68 | 16 | 134217728 | 11.7 | 200 |

### Encoders

| Encoder | codingRate | requiredEbN0 (dB) | minTech |
|---------|------------|-------------------|---------|
| None | 1.0 | 10 | 0 |
| Reed-Solomon 255/223 | 0.8745 | 6.1 | 3 |
| Convolutional 7, 1/2 | 0.5 | 4.5 | 6 |
| Turbo 1/2 | 0.5 | 1 | 8 |

### Frequency Bands

| Band | Frequency (Hz) | channelWidth (Hz) | minTech |
|------|----------------|-------------------|---------|
| L | 1.62e9 | 31.5e3 | 0 |
| S | 2.25e9 | 0.33e6 | 3 |
| X | 8.45e9 | 1.36e6 | 7 |
| K | 26.25e9 | 20e6 | 9 |

### Raw Data (`js/data/antennas-realantennas-raw.js`)

```typescript
interface RealAntennasAntennaRaw {
  name: string;
  type: "omni" | "dish";
  antennaDiameter: number;      // meters (dishes)
  referenceGain: number;        // dBi (omnis)
  referenceFrequency: number;   // MHz (omnis)
  txPower: number;              // dBm
  techLevel: number;            // 0-9
  rfBand: "L" | "S" | "X" | "K";
  amwTemp: number;              // K
  encoder: string;              // encoder key
  canTarget: boolean;           // true for dishes
  source: "RealAntennas";
}
```

### Range Computation in Store (`store.js`)

**Antenna-to-antenna:**
- Build identical Rx antenna
- Find distance where RxPower = noise floor for minDataRate
- `distance = 10^((FSPL_max - PATH_LOSS_CONSTANT) / 20) / frequency`

**Ground station:**
- Build ground station antennas for target tech level
- Find best compatible (same band, both canTarget)
- Compute link budget with small pointing loss (3 dB)

### Settings

```typescript
interface RASettings {
  raEnabled: boolean;
  raRangeMultiplier: number;
  raConsumptionMultiplier: number;
  raPlannerActiveTxTime: number; // 0-1
  raMultipleAntennaMultiplier: number;
  raTargetTechLevel: number; // 0-9
}
```

---

## MAM (Multiple Antenna Multiplier) in Store

**File:** `js/store.js` (lines ~786-850)

```typescript
// Combined range for all omni antennas
longest = max(range_i)
combined = sum(range_i * quantity_i)

if stock:
  range = longest + (combined - longest) * multipleAntennaMultiplier
if remoteTech:
  bonus = (combined - longest) * rtMultipleAntennaMultiplier
  range = (longest + bonus) * rangeMultiplier
if realAntennas:
  bonus = (combined - longest) * raMultipleAntennaMultiplier
  range = (longest + bonus) * rangeMultiplier

// EC is SUM of individual EC/s * quantity (NO range multiplier applied)
elcTotal = sum(elc_i * quantity_i)
```

---

## Range Display Modes (Stock Only)

| Mode | Target | Formula |
|------|--------|---------|
| `antenna` | Identical antenna | `rangeToIdentical(antenna, 1, rangeModifier)` |
| `dsn` + `level1` | DSN Level 1 | `rangeToDSN(antenna, "level1", 1, modifiers)` |
| `dsn` + `level2` | DSN Level 2 | `rangeToDSN(antenna, "level2", 1, modifiers)` |
| `dsn` + `level3` | DSN Level 3 | `rangeToDSN(antenna, "level3", 1, modifiers)` |

**Note:** When `stockData === "rss"`, the formulas use RSS calculator with 20x antenna/DSN multipliers.