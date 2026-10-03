# Antenna CFG → JS Field Mapping Guide

Quick reference for mapping KSP part cfg files to `js/data/antennas*.js` entries.

## RemoteTech Antennas (Direct Mapping ✓)

Source: `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg` and `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Squad_Antennas.cfg` (plus other mod compat files)

| JS Field | Cfg Path | Conversion |
|----------|----------|------------|
| `name` | `@PART[PartName]` → `title` (e.g., `#RT_ShortAntenna1_title` → "Reflectron DP-10") | Use localized title |
| `type` | `ModuleRTAntenna.Mode1OmniRange > 0` → "omni", `Mode1DishRange > 0` → "dish" | Check which range is non-zero |
| `range` | `ModuleRTAntenna.Mode1OmniRange` OR `Mode1DishRange` | Divide by 1000 (meters → km) |
| `elcNeeded` | `ModuleRTAntenna.EnergyCost` | Direct copy (EC/s) |
| `source` | — | Hardcode `"RemoteTech"` |

**Example:**
```cfg
@PART[RTShortAntenna1]:FOR[RemoteTech]
{
    %MODULE[ModuleRTAntenna] {
        %Mode1OmniRange = 500000      // → range: 500
        %EnergyCost = 0.01            // → elcNeeded: 0.01
    }
}
```

---

## Squad (Stock) Antennas (Raw CFG Values, Computed at Runtime)

Source: `vendor/Squad/Parts/Utility/*/*.cfg`

Raw cfg values are stored directly in `js/data/antennas-stock-raw.js`:
- `antennaPower` (meters)
- `packetInterval` (seconds)
- `packetResourceCost` (EC/packet)
- `antennaCombinable` (boolean)
- `antennaCombinableExponent` (default 0.75)

Range and EC/s are computed at runtime via `js/calculator/stock-antenna.js`:
- `EC/s = packetResourceCost / packetInterval`
- `range = sqrt(antennaPower * targetPower) / 1000` (targetPower = DSN or other antenna)

| JS Field | Cfg Field | Relation |
|----------|-----------|----------|
| `name` | `PART.title` | Direct (localized) |
| `type` | `ModuleDataTransmitter.antennaType` | DIRECT → "omni", RELAY → "dish" |
| `antennaPower` | `ModuleDataTransmitter.antennaPower` | Direct (meters) |
| `packetInterval` | `ModuleDataTransmitter.packetInterval` | Direct (seconds) |
| `packetResourceCost` | `ModuleDataTransmitter.packetResourceCost` | Direct (EC/packet) |
| `antennaCombinable` | `ModuleDataTransmitter.antennaCombinable` | Direct (boolean) |
| `antennaCombinableExponent` | `ModuleDataTransmitter.antennaCombinableExponent` | Direct (default 0.75) |
| `source` | — | Hardcode `"Squad"` |

**Why?** KSP CommNet range depends on BOTH antennas (sqrt(antennaPower1 * antennaPower2)). The planner computes range at runtime based on user's selected target (DSN level or antenna-to-antenna).

---

## RealAntennas Antennas (Raw Parameters, Computed at Runtime)

Source: `vendor/RealAntennas/GameData/RealAntennas/Parts/*.cfg` (ModuleManager patches)

Raw parameters stored in `js/data/antennas-realantennas-raw.js`:
- `antennaDiameter` (meters) for dishes
- `referenceGain` (dBi) and `referenceFrequency` (MHz) for omnis
- `txPower` (dBm)
- `techLevel` (0-9)
- `rfBand` (L/S/X/K)
- `encoder` (None|Reed-Solomon 255/223|Convolutional 7, 1/2|Turbo 1/2)
- `amwTemp` (K)
- `canTarget` (boolean)

Range and EC/s are computed at runtime via link budget calculator in `js/calculator/realantennas-antenna.js`.

**Note**: The JS data for RealAntennas lives in `js/data/antennas-realantennas-raw.js` (raw parameters from ModuleManager patches) and `js/calculator/realantennas-antenna.js` (link budget calculator).

---

## Hidden Entries (Legacy Save Compat)

Entries with `hidden: true` are OLD names kept so saved chains still resolve. They duplicate an existing antenna with a different `name`.

| Hidden Name | Active Equivalent |
|-------------|-------------------|
| "HG-5 High Gain Antenna" | "Communotron HG-5" |
| "RA-2 Relay Antenna" | "RA-2" |
| "RA-15 Relay Antenna" | "RA-15" |
| "RA-100 Relay Antenna" | "RA-100" |

**Rule**: Never remove hidden entries; only add new ones if display names change.

---

## Quick Verification Checklist

When updating RemoteTech data:
1. Open `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg`
2. For each `@PART` with `ModuleRTAntenna`:
   - Extract `title` → `name`
   - Check `Mode1OmniRange` vs `Mode1DishRange` → `type`
   - `Mode1*Range / 1000` → `range`
   - `EnergyCost` → `elcNeeded`
3. Cross-reference with `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Squad_Antennas.cfg` (and other compat files) for `title` localization
4. Update `js/data/antennas-remotetech-raw.js` (keep alphabetical-ish order)

When Squad data changes: **Manual verification required** — compare in-game or with planner maintainers. Update `js/data/antennas-stock-raw.js`.

When RealAntennas data changes: Update `js/data/antennas-realantennas-raw.js` from `vendor/RealAntennas/GameData/RealAntennas/Parts/*.cfg`.