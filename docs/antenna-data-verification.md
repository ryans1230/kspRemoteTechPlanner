# Antenna Data Verification Report

This document verifies the antenna data in `js/data/antennas*.js` against the source cfg files in `vendor/`.

## Summary

- **RemoteTech antennas** (`js/data/antennas-remotetech-raw.js`): Values match the cfg files almost perfectly (ranges in meters → km conversion, EnergyCost → elcNeeded direct mapping). Source: `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg`
- **Squad (Stock) antennas** (`js/data/antennas-stock-raw.js`): Raw cfg values stored directly (`antennaPower`, `packetInterval`, `packetResourceCost`, `antennaCombinable`, `antennaCombinableExponent`). Range and EC/s are computed at runtime via `js/calculator/stock-antenna.js` using CommNet formula: `range = sqrt(aPower * bPower) / 1000`, `EC/s = packetResourceCost / packetInterval`. Source: `vendor/Squad/Parts/Utility/*/*.cfg`
- **RealAntennas antennas** (`js/data/antennas-realantennas-raw.js`): Values are raw parameters from ModuleManager patches; range and EC/s are computed at runtime via link budget calculator in `js/calculator/realantennas-antenna.js`. Source: `vendor/RealAntennas/GameData/RealAntennas/Parts/*.cfg`

---

## RemoteTech Antennas (Verified ✓)

Source: `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg`

| JS Name | JS Type | JS Range (km) | JS elcNeeded | Cfg Part | Cfg Range (m) | Cfg EnergyCost | Match |
|---------|---------|---------------|--------------|----------|---------------|----------------|-------|
| Reflectron DP-10 | omni | 500 | 0.01 | RTShortAntenna1 | 500,000 (Mode1OmniRange) | 0.01 | ✓ |
| Communotron 32 | omni | 5000 | 0.6 | RTLongAntenna2 | 5,000,000 (Mode1OmniRange) | 0.6 | ✓ |
| CommTech EXP-VR-2T | omni | 3000 | 0.18 | RTLongAntenna3 | 3,000,000 (Mode1OmniRange) | 0.18 | ✓ |
| Reflectron KR-7 | dish | 90000 | 0.82 | RTShortDish2 | 90,000,000 (Mode1DishRange) | 0.82 | ✓ |
| Reflectron KR-14 | dish | 60000000 | 0.93 | RTLongDish2 | 60,000,000,000 (Mode1DishRange) | 0.93 | ✓ |
| CommTech-1 | dish | 350000000 | 2.6 | RTGigaDish2 | 350,000,000,000 (Mode1DishRange) | 2.6 | ✓ |
| Reflectron GX-128 | dish | 400000000 | 2.8 | RTGigaDish1 | 400,000,000,000 (Mode1DishRange) | 2.8 | ✓ |

**Notes:**
- RTShortDish1 (Reflectron SS-5) also has 90M range / 0.82 EC/s but is NOT in the JS file (only KR-7 is listed)
- All RemoteTech values: `range_km = Mode1*Range / 1000`, `elcNeeded = EnergyCost`

---

## Squad (Stock) Antennas (Mismatch ⚠)

The JS values do not match raw cfg `antennaPower` (meters) or `packetResourceCost/packetInterval` directly.

| JS Name | JS Type | JS Range (km) | JS elcNeeded | Cfg Part | Cfg antennaPower (m) | Cfg packetResourceCost | Cfg packetInterval | Calc EC/s |
|---------|---------|---------------|--------------|----------|----------------------|------------------------|-------------------|-----------|
| Communotron 16-S | omni | 1500 | 0.02 | C16S (SurfAntenna) | 500,000 | 12.0 | 0.6 | 20.0 |
| Communotron 16 | omni | 2500 | 0.13 | longAntenna | 500,000 | 12.0 | 0.6 | 20.0 |
| Comms DTS-M1 | dish | 50000 | 0.82 | mediumDishAntenna | 2,000,000,000 | 12.0 | 0.35 | 34.3 |
| Communotron HG-55 | dish | 25000000 | 1.04 | — | — | — | — | — |
| Communotron HG-5 | dish | 20000 | 0.55 | HighGainAntenna5 | 5,000,000 | 18.0 | 0.35 | 51.4 |
| RA-100 | dish | 100000000 | 1.1 | RelayAntenna100 | 100,000,000,000 | 24.0 | 0.35 | 68.6 |
| RA-15 | dish | 10000000 | 1.1 | RelayAntenna50 | 15,000,000,000 | 24.0 | 0.35 | 68.6 |
| RA-2 | dish | 200000 | 1.15 | RelayAntenna5 | 2,000,000,000 | 24.0 | 0.35 | 68.6 |
| Communotron 88-88 | dish | 40000000 | 0.93 | commDish | 100,000,000,000 | 20.0 | 0.1 | 200.0 |

**Hidden entries (duplicates for legacy save compatibility):**
- HG-5 High Gain Antenna (same as Communotron HG-5)
- RA-2 Relay Antenna (same as RA-2)
- RA-15 Relay Antenna (same as RA-15)
- RA-100 Relay Antenna (same as RA-100)

**Missing from JS (exist in cfg):**
- Comms DTS-M1 appears in cfg but Communotron HG-55 in JS has no matching cfg part found
- Several probe cores with built-in antennas (not in JS as they're not selectable parts)

---

## RealAntennas Antennas (Raw Parameters, Computed at Runtime)

The RealAntennas antennas live in `js/data/antennas-realantennas-raw.js` as raw parameters from ModuleManager patches (`vendor/RealAntennas/GameData/RealAntennas/Parts/*.cfg`). Range and EC/s are computed at runtime via the link budget calculator in `js/calculator/realantennas-antenna.js`.

Key formulas from `js/calculator/realantennas-antenna.js`:

**Gain from dish diameter (dBi):**
```
gain = 10 * log10(9.87 * efficiency * diameter² / wavelength²)
where wavelength = c / frequency, c = 2.998e8
```

**Free-space path loss (dB):**
```
FSPL = 20 * log10(distance * frequency) - 147.55
```

**Received power (dBm):**
```
RxPower = TxPower + TxGain - FSPL - PointingLossTx - PointingLossRx + RxGain
```

**EC/s (kW = EC/s):**
```
idlePower = basePower / 1000  (kW)
activePower = (10^(TxPower/10) / powerEfficiency) * 1e-6  (kW)
EC/s = (idlePower + activePower * plannerActiveTxTime) * consumptionMultiplier
```

**Link budget for range:**
```
At max range: Eb/N0 = requiredEbN0
RxPower - N0 - 10*log10(DataRate) = requiredEbN0
FSPL = TxPower + TxGain + RxGain - N0 - 10*log10(minDataRate) - requiredEbN0 - pointingLoss
distance = 10^((FSPL + 147.55) / 20) / frequency
```

Source data (from ModuleManager patches):
- `antennaDiameter` (meters) for dishes
- `referenceGain` (dBi) and `referenceFrequency` (MHz) for omnis
- `txPower` (dBm)
- `techLevel` (0-9) → determines `powerEfficiency`, `reflectorEfficiency`, `receiverNoiseTemp`, `minDataRate`, `basePower`
- `rfBand` (L/S/X/K) → determines `frequency`
- `encoder` → determines `requiredEbN0`
- `amwTemp` (antenna microwave temp K)

See `js/calculator/realantennas-antenna.js` for full implementation.

---

## Field Mapping for Future Agents

### JS Antenna Object Fields
```typescript
interface Antenna {
  name: string;           // Unique key, displayed in selector
  type: "omni" | "dish";  // Antenna type
  range: number;          // Range in km (before user's range multiplier)
  elcNeeded: number;      // Electricity per second (EC/s)
  source?: "Squad" | "RemoteTech" | "RealAntennas";  // Mod origin
  hidden?: boolean;       // True = not shown in selector (legacy save compat)
}
```

### Cfg → JS Field Mapping

| JS Field | RemoteTech Cfg Source | Squad Cfg Source | Notes |
|----------|----------------------|------------------|-------|
| `name` | `PART.title` (localized) | `PART.title` (localized) | Use display name from title field |
| `type` | `ModuleRTAntenna` Mode0/Mode1: OmniRange → "omni", DishRange → "dish" | `ModuleDataTransmitter.antennaType`: DIRECT → "omni", RELAY → "dish" | |
| `range` | `Mode1OmniRange` or `Mode1DishRange` / 1000 (m → km) | **Not directly mapped** - uses pre-calculated effective CommNet range | Squad ranges are NOT `antennaPower/1000` |
| `elcNeeded` | `ModuleRTAntenna.EnergyCost` (EC/s) | **Not directly mapped** - uses pre-calculated value | Squad EC/s is NOT `packetResourceCost/packetInterval` |
| `source` | Hardcoded "RemoteTech" | Hardcoded "Squad" | |
| `hidden` | Not applicable | Set true for legacy names (e.g., "HG-5 High Gain Antenna" vs "Communotron HG-5") | |

### RemoteTech Cfg Structure (Reference)
```cfg
@PART[PartName]:FOR[RemoteTech]
{
    %MODULE[ModuleRTAntenna] {
        %Mode0OmniRange = 0
        %Mode1OmniRange = 500000        // meters → JS range = 500 km
        %Mode0DishRange = 0
        %Mode1DishRange = 90000000      // meters → JS range = 90000 km
        %EnergyCost = 0.82              // EC/s → JS elcNeeded = 0.82
        %DishAngle = 25.0
    }
}
```

### Squad Cfg Structure (Reference)
```cfg
PART
{
    name = PartName
    MODULE
    {
        name = ModuleDataTransmitter
        antennaType = DIRECT|RELAY       // DIRECT=omni, RELAY=dish
        antennaPower = 5000000           // meters (NOT directly JS range)
        packetInterval = 0.35
        packetSize = 2
        packetResourceCost = 18.0        // EC/packet (NOT directly JS elcNeeded)
        requiredResource = ElectricCharge
    }
}
```

### RealAntennas Cfg Structure (Reference — ModuleManager patches)
```cfg
// Dish example (from vendor/RealAntennas/GameData/RealAntennas/Parts/ReStock.cfg)
@PART[restock-relay-radial-2]:HAS[!MODULE[ModuleRealAntenna]]:FOR[RealAntennas]
{
    !MODULE[ModuleDataTransmitter] {}
    %MODULE[ModuleRealAntenna] { %antennaDiameter = 1.0 }
}

// Omni example (from vendor/RealAntennas/GameData/RealAntennas/Parts/AIES.cfg)
@PART[AntennaDF2]:HAS[!MODULE[ModuleRealAntenna]]:FOR[RealAntennas]
{
    !MODULE[ModuleDataTransmitter] {}
    %MODULE[ModuleRealAntenna] { %referenceGain = 2.0 }
}

// Full ModuleRealAntenna fields (set via ModuleManager or part cfg):
MODULE
{
    name = ModuleRealAntenna
    antennaDiameter = 1.0              // meters (for dishes)
    referenceGain = 2.0                // dBi (for omnis)
    referenceFrequency = 1620          // MHz (for omnis)
    txPower = 30                       // dBm
    techLevel = 0                      // 0-9
    rfBand = L                         // L|S|X|K
    amwTemp = 290                      // K
    encoder = None                     // None|Reed-Solomon 255/223|Convolutional 7, 1/2|Turbo 1/2
    canTarget = false                  // true for dishes
}
```

---

## Recommendations

1. **RemoteTech data**: Considered accurate; update only if RemoteTech mod changes. Update `js/data/antennas-remotetech-raw.js` from `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg`.
2. **Squad data**: Values are planner-specific; do not attempt to auto-generate from cfg files. Update `js/data/antennas-stock-raw.js` from `vendor/Squad/Parts/Utility/*/*.cfg`.
3. **RealAntennas data**: Raw parameters from ModuleManager patches; range/EC computed at runtime via link budget. Update `js/data/antennas-realantennas-raw.js` from `vendor/RealAntennas/GameData/RealAntennas/Parts/*.cfg`.
4. **Hidden entries**: Keep for save compatibility; do not remove.
5. **Future updates**: When game/mods update, verify RemoteTech values against `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg`; Squad/RealAntennas values require manual verification against in-game testing.