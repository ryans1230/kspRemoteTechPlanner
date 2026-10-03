# Vendor Data Mapping

How source cfg files in `vendor/` map to JS data files.

---

## Directory Structure

```
vendor/
├── RemoteTech/
│   └── GameData/RemoteTech/
│       ├── RemoteTech_Antennas.cfg          # Main antenna definitions
│       ├── RemoteTech_Squad_Antennas.cfg    # Stock antenna RT patches
│       └── RemoteTech_*_Antennas.cfg        # Mod compat patches
├── Squad/
│   └── Parts/Utility/
│       ├── DirectAntennas/
│       │   ├── C16S.cfg                     # Communotron 16-S
│       │   └── HG-5.cfg                     # HG-5 High Gain Antenna
│       ├── commsDish16/
│       │   └── commsAntenna16.cfg           # Communotron 16
│       ├── commDish88-88/
│       │   └── commDish88-88.cfg            # Communotron 88-88
│       ├── commsAntennaDTS-M1/
│       │   └── commsAntennaDTS-M1.cfg       # Comms DTS-M1
│       └── RelayAntennas/
│           ├── RA-5.cfg                     # RA-2 Relay Antenna
│           ├── RA-50.cfg                    # RA-15 Relay Antenna
│           └── RA-100.cfg                   # RA-100 Relay Antenna
├── RealAntennas/
│   └── GameData/RealAntennas/
│       ├── RealAntennas.cfg                 # Stock antenna conversions
│       └── Parts/
│           ├── ReStock.cfg                  # ReStock antenna patches
│           ├── AIES.cfg                     # AIES antenna patches
│           ├── NFE_CAE_RTREDEV.cfg          # NearFuture/CommNet extension
│           ├── Vens.cfg
│           ├── SXT.cfg
│           ├── Coatl.cfg
│           └── JX2.cfg
├── RealSolarSystem/
│   └── GameData/RealSolarSystem/
│       └── DSN_Ranges.cfg                   # DSN power levels for RSS
└── NearFutureExploration/
    └── GameData/NearFutureExploration/
        ├── Parts/Antenna/                   # 22 antenna parts
        │   ├── nfex-antenna-rover-1.cfg     # AX-4 Pointable Helical Antenna
        │   ├── nfex-antenna-rover-2.cfg     # AX-5 Aerial Micro-Antenna
        │   ├── nfex-antenna-rover-3.cfg     # AX-30 High Gain Micro-Antenna
        │   ├── nfex-antenna-phased-single-1.cfg # PH-1 Phased Array Element
        │   ├── nfex-antenna-phased-single-2.cfg # PH-2 Phased Array Element
        │   ├── nfex-antenna-phased-single-3.cfg # PH-3 Phased Array Element
        │   ├── nfex-antenna-phased-array-1.cfg  # RA-X1 Phased Relay Antenna
        │   ├── nfex-antenna-phased-array-2.cfg  # RA-X2 Phased Relay Antenna
        │   ├── nfex-antenna-phased-array-3.cfg  # RA-X3 Phased Relay Antenna
        │   ├── nfex-antenna-top-dish-1.cfg      # D-2 Spot Antenna
        │   ├── nfex-antenna-top-dish-2.cfg      # D-50 Large Spot Antenna
        │   ├── nfex-antenna-reflector-side-1.cfg # RFL-1 Dish Reflector
        │   ├── nfex-antenna-reflector-side-2.cfg # RFL-2 Medium Dish Reflector
        │   ├── nfex-antenna-reflector-side-3.cfg # RFL-3 Dish Reflector Array
        │   ├── nfex-antenna-reflector-large-1.cfg # RFL-50 Large Dish Reflector
        │   ├── nfex-antenna-reflector-huge-1.cfg  # RFL-100 Giant Dish Reflector
        │   ├── nfex-antenna-reflector-giant-1.cfg # RFL-2000 Dish Reflector Array
        │   ├── nfex-antenna-relay-tdrs-1.cfg      # RA-0-8 Relay Antenna
        │   ├── nfex-antenna-relay-tdrs-2.cfg      # RA-5B Advanced Relay Antenna
        │   ├── nfex-antenna-relay-tiny-1.cfg      # RA-00-2 Micro-Relay Antenna
        │   ├── nfex-antenna-feeder-relay-1.cfg    # F-RA Relay Antenna Feed
        │   ├── nfex-antenna-feeder-direct-1.cfg   # F-DA Direct Antenna Feed
        │   ├── nfex-antenna-static-mini-1.cfg     # DR-1 High Gain Antenna
        │   └── nfex-antenna-deploy-wv3-1.cfg      # DR-3 Deployable High Gain Antenna
        ├── Localization/en-us.cfg       # Display names
        └── Patches/                     # Community Tech Tree, other mod compat
```

---

## RemoteTech → `js/data/antennas-remotetech-raw.js`

### Source Files

- Primary: `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Antennas.cfg`
- Localization: `vendor/RemoteTech/GameData/RemoteTech/RemoteTech_Squad_Antennas.cfg` (and other compat files)

### CFG Pattern

```cfg
@PART[RTShortAntenna1]:FOR[RemoteTech]
{
    %MODULE[ModuleRTAntenna] {
        %Mode1OmniRange = 500000      // meters
        %EnergyCost = 0.01            // EC/s
    }
}

@PART[RTShortDish2]:FOR[RemoteTech]
{
    %MODULE[ModuleRTAntenna] {
        %Mode1DishRange = 90000000    // meters
        %EnergyCost = 0.82            // EC/s
        %DishAngle = 25.0             // degrees
    }
}
```

### Field Mapping

| JS Field | CFG Source | Conversion |
|----------|------------|------------|
| `name` | `PART.title` (from localization) | Use display name |
| `type` | `Mode1OmniRange > 0` → "omni", `Mode1DishRange > 0` → "dish" | Check which is non-zero |
| `omniRange` | `Mode1OmniRange` | Direct (meters) |
| `dishRange` | `Mode1DishRange` | Direct (meters) |
| `energyCost` | `EnergyCost` | Direct (EC/s) |
| `dishAngle` | `DishAngle` | Direct (degrees, 0 for omni) |
| `maxQ` | `MaxQ` | Direct (kPa, -1 if none) |
| `combinable` | — | Always `true` for RT |
| `combinableExponent` | — | Default `0.75` (compat) |
| `source` | — | Hardcode `"RemoteTech"` |

### Name Resolution

1. Get `@PART[PartName]` from `RemoteTech_Antennas.cfg`
2. Find `title = #autoLOC_XXXX` in Squad part cfg or RT compat cfg
3. Use localized display name (e.g., "Reflectron DP-10")

### Current Entries (7 antennas)

| JS Name | CFG Part | Type | omniRange | dishRange | energyCost |
|---------|----------|------|-----------|-----------|------------|
| Reflectron DP-10 | RTShortAntenna1 | omni | 500,000 | 0 | 0.01 |
| Communotron 32 | RTLongAntenna2 | omni | 5,000,000 | 0 | 0.6 |
| CommTech EXP-VR-2T | RTLongAntenna3 | omni | 3,000,000 | 0 | 0.18 |
| Reflectron KR-7 | RTShortDish2 | dish | 0 | 90,000,000 | 0.82 |
| Reflectron KR-14 | RTLongDish2 | dish | 0 | 60,000,000,000 | 0.93 |
| CommTech-1 | RTGigaDish2 | dish | 0 | 350,000,000,000 | 2.6 |
| Reflectron GX-128 | RTGigaDish1 | dish | 0 | 400,000,000,000 | 2.8 |

**Note:** RTShortDish1 (Reflectron SS-5) also 90M/0.82 but NOT in JS (only KR-7 listed).

---

## Squad (Stock) → `js/data/antennas-stock-raw.js`

### Source Files

`vendor/Squad/Parts/Utility/*/*.cfg`

### CFG Pattern

```cfg
MODULE
{
    name = ModuleDataTransmitter
    antennaType = DIRECT          // DIRECT=omni, RELAY=dish
    antennaPower = 500000         // meters
    packetInterval = 0.6
    packetSize = 2
    packetResourceCost = 12.0
    antennaCombinable = True
    antennaCombinableExponent = 1
}
```

### Field Mapping

| JS Field | CFG Source | Conversion |
|----------|------------|------------|
| `name` | `PART.title` (localized) | Direct |
| `type` | `antennaType`: DIRECT → "omni", RELAY → "dish" | Direct mapping |
| `antennaPower` | `antennaPower` | Direct (meters) |
| `packetInterval` | `packetInterval` | Direct (seconds) |
| `packetSize` | `packetSize` | Direct (Mits) |
| `packetResourceCost` | `packetResourceCost` | Direct (EC/packet) |
| `antennaCombinable` | `antennaCombinable` | Direct (boolean) |
| `antennaCombinableExponent` | `antennaCombinableExponent` | Direct (default 0.75) |
| `source` | — | Hardcode `"Squad"` |

### Current Entries (9 antennas + 4 hidden)

| JS Name | CFG Part | Type | antennaPower | packetInterval | packetResourceCost | combinable | exponent |
|---------|----------|------|--------------|----------------|-------------------|------------|----------|
| Communotron 16-S | SurfAntenna (C16S) | omni | 500,000 | 0.6 | 12.0 | false | 0.75 |
| Communotron 16 | longAntenna | omni | 500,000 | 0.6 | 12.0 | true | 1.0 |
| Comms DTS-M1 | mediumDishAntenna | omni | 2,000,000,000 | 0.35 | 12.0 | true | 0.75 |
| Communotron HG-55 | (planner-specific) | omni | 15,000,000,000 | 0.15 | 20.0 | true | 0.75 |
| Communotron HG-5 | HighGainAntenna5 | dish | 5,000,000 | 0.35 | 18.0 | true | 0.75 |
| RA-100 | RelayAntenna100 | dish | 100,000,000,000 | 0.35 | 24.0 | true | 0.75 |
| RA-15 | RelayAntenna50 | dish | 15,000,000,000 | 0.35 | 24.0 | true | 0.75 |
| RA-2 | RelayAntenna5 | dish | 2,000,000,000 | 0.35 | 24.0 | true | 0.75 |
| Communotron 88-88 | commDish | omni | 100,000,000,000 | 0.1 | 20.0 | true | 0.75 |

**Hidden entries** (duplicates for save compat):
- HG-5 High Gain Antenna = Communotron HG-5
- RA-2 Relay Antenna = RA-2
- RA-15 Relay Antenna = RA-15
- RA-100 Relay Antenna = RA-100

### Note on HG-55

No matching cfg part found in `vendor/Squad/Parts/Utility/`. Appears to be planner-specific entry.

---

## RealAntennas → `js/data/antennas-realantennas-raw.js`

### Source Files

`vendor/RealAntennas/GameData/RealAntennas/Parts/*.cfg` (ModuleManager patches)

### CFG Pattern (Dish)

```cfg
@PART[restock-relay-radial-2]:HAS[!MODULE[ModuleRealAntenna]]:FOR[RealAntennas]
{
    !MODULE[ModuleDataTransmitter] {}
    %MODULE[ModuleRealAntenna] { %antennaDiameter = 1.0 }
}
```

### CFG Pattern (Omni)

```cfg
@PART[AntennaDF2]:HAS[!MODULE[ModuleRealAntenna]]:FOR[RealAntennas]
{
    !MODULE[ModuleDataTransmitter] {}
    %MODULE[ModuleRealAntenna] { %referenceGain = 2.0 }
}
```

### Full ModuleRealAntenna Fields

```cfg
MODULE
{
    name = ModuleRealAntenna
    antennaDiameter = 1.0              // meters (dishes)
    referenceGain = 2.0                // dBi (omnis)
    referenceFrequency = 1620          // MHz (omnis)
    txPower = 30                       // dBm
    techLevel = 0                      // 0-9
    rfBand = L                         // L|S|X|K
    amwTemp = 290                      // K
    encoder = None                     // None|Reed-Solomon 255/223|Convolutional 7, 1/2|Turbo 1/2
    canTarget = false                  // true for dishes
}
```

### Field Mapping

| JS Field | CFG Source | Notes |
|----------|------------|-------|
| `name` | `PART.title` + " (RealAntennas)" | Add suffix for disambiguation |
| `type` | `antennaDiameter > 0` → "dish", `referenceGain > 0` → "omni" | |
| `antennaDiameter` | `antennaDiameter` | Meters (dishes only) |
| `referenceGain` | `referenceGain` | dBi (omnis only) |
| `referenceFrequency` | `referenceFrequency` | MHz (omnis only) |
| `txPower` | `txPower` | dBm |
| `techLevel` | `techLevel` | 0-9 |
| `rfBand` | `rfBand` | L/S/X/K |
| `amwTemp` | `amwTemp` | K |
| `encoder` | `encoder` | Encoder key |
| `canTarget` | `canTarget` | Boolean |
| `source` | — | Hardcode `"RealAntennas"` |

### Current Entries (27 antennas)

**Stock conversions** (from `RealAntennas.cfg`):
- Communotron 16-S, 16, 88-88, DTS-M1, HG-5, RA-2, RA-15, RA-100

**ReStock** (from `ReStock.cfg`):
- HG-20 / restock-relay-radial-2
- Communotron DTS-J1 / restock-antenna-stack-2
- Communotron HG-61 / restock-antenna-stack-3

**AIES** (from `AIES.cfg`):
- CommTech CL-1 / Dishcl1
- CommTech Omega-2G / Dishomega2g
- Comlar 1 / dishcomlar1
- CommTech CM-60 / Dishmccomu
- CommTech-1 / Antennacomtec1
- CommTech-2 / Antennacomtec2
- CommTech PCF-5 / Dishpcf
- CommTech DF-RD / AntennaDF2
- CommTech ESC-EXP / Antennaesc
- CommTech EXP-VR-2T / Antennaexpatvr2

**NearFuture/CommNet Extension** (from `NFE_CAE_RTREDEV.cfg`):
- C2+ HG-32, AX-30, AX-4, AX-5, DR-3, RA-0-8, RA-5B, RA-X1, RA-X2, RFL-1, RFL-2, RFL-2000, RFL-3, RFL-50, C3+ RA-7, C4+ RA-25, C5+ Tigger, C5+ RelayTech One, D-2, D-50, DR-1, RFL-100, RA-X3, RA-00-2, F-DA, F-RA, PH-1, PH-2, PH-3, CommTech EXP-VR-2T

---

## RealSolarSystem → DSN Power & Antenna Scaling

### Source Files

- `vendor/RealSolarSystem/GameData/RealSolarSystem/DSN_Ranges.cfg`
- `vendor/RealSolarSystem/GameData/RealSolarSystem/RSS_CommNet_Stations.cfg` (ground station positions)
- `vendor/RealSolarSystem/GameData/RealSolarSystem/RemoteTech_Settings.cfg` (RT ground stations)
- `vendor/RealSolarSystem/GameData/RealSolarSystem/RSSKopernicus/*/*.cfg` (celestial body data)

### DSN_Ranges.cfg

```cfg
@PART[*]:HAS[@MODULE[ModuleDataTransmitter]]
{
      @MODULE[ModuleDataTransmitter]
      {
            @antennaPower *= 20
            
            @UPGRADES
            {
                  @UPGRADE,*
                  {
                        @antennaPower *= 20
                  }
            }
      }
}

@CUSTOMBARNKIT
{   
      @TRACKING
      {
            @DSNRange = 5000000000, 500000000000, 50000000000000
      }
}
```

**Effect:** All stock antenna `antennaPower` × 20, DSN ranges × 20.

### JS Implementation

**New calculator:** `js/calculator/rss-antenna.js`
- Same CommNet formula as stock
- `RSS_ANTENNA_POWER_MULTIPLIER = 20`
- `RSS_DSN_POWER`: level1=5Gm, level2=500Gm, level3=50Tm

**Store integration:** `store.js` → `computeStockAntennaRange()` detects `stockData === "rss"` and uses RSS calculator.

### Celestial Bodies (RSS)

Source: `vendor/RealSolarSystem/GameData/RealSolarSystem/RSSKopernicus/*/*.cfg`

| Body | Radius (km) | GM (km³/s²) | SOI (km) | Parent |
|------|-------------|-------------|----------|--------|
| Sun | 696,342 | 132,712,440,041.9 | ∞ | — |
| Mercury | 2,439.7 | 22,031.78 | 112,410 | Sun |
| Venus | 6,049 | 324,858.59 | 616,210 | Sun |
| Earth | 6,371 | 398,600.44 | 923,895 | Sun |
| Moon | 1,737.1 | 4,902.8 | 66,167 | Earth |
| Mars | 3,375.8 | 42,828.37 | 577,231 | Sun |
| Phobos | 7.25 | 0.0007088 | 47 | Mars |
| Deimos | 5.456 | 0.00009616 | 45 | Mars |
| Jupiter | 69,373 | 126,686,534.92 | 48,190,353 | Sun |
| Io | 1,811.3 | 5,959.92 | 7,841 | Jupiter |
| Europa | 1,550.8 | 3,202.74 | 9,728 | Jupiter |
| Ganymede | 2,624.1 | 9,887.83 | 10,856.5 | Jupiter |
| Callisto | 2,409.3 | 7,179.29 | 37,706 | Jupiter |
| Saturn | 57,216 | 37,931,207.5 | 54,468,720 | Sun |
| Titan | 2,573.3 | 8,978.14 | 43,324 | Saturn |
| Uranus | 24,702 | 5,793,951.32 | 51,686,225 | Sun |
| Neptune | 24,085 | 6,835,099.5 | 51,686,225 | Sun |
| Triton | 1,353.4 | 1,427.6 | 375,000 | Neptune |
| Pluto | 1,187 | 869.61 | 3,116,132 | Sun |

**Note:** Ceres and Vesta (asteroids) excluded per project requirements.

### RemoteTech Ground Stations (RSS)

Source: `vendor/RealSolarSystem/GameData/RealSolarSystem/RemoteTech_Settings.cfg`

Defines custom RT ground stations with specific omni ranges:
- Launch sites: 5 Mm omni (except Wenchang 2 Tm, Kodiak 75 Mm)
- DSN stations (Goldstone, Madrid, Canberra): 114 Tm omni
- ESTRACK (New Norcia, Cebreros, Malargüe): 1.781 Tm omni
- MSFN: 1.717 Gm omni
- Various others: 967 Mm - 4.677 Gm omni

### Updating Data

#### RealSolarSystem (RSS)

1. **Celestial bodies**: Update `js/data/bodies.js` from `vendor/RealSolarSystem/GameData/RealSolarSystem/RSSKopernicus/*/*.cfg`
   - Extract `radius`, `gravParameter` → `stdGravity`, `sphereOfInfluence` → `soi`
   - Convert from meters to km
   - Parent body from `referenceBody` in Orbit block

2. **DSN/antenna scaling**: Already handled by `rss-antenna.js` using constants from `DSN_Ranges.cfg`

3. **RT ground stations**: Update `js/calculator/remote-tech-antenna.js` if Mission Control ranges change

---

## NearFutureExploration → `js/data/antennas-nearfutureexploration-raw.js`

### Source Files

- Primary: `vendor/NearFutureExploration/GameData/NearFutureExploration/Parts/Antenna/*.cfg`
- Localization: `vendor/NearFutureExploration/GameData/NearFutureExploration/Localization/en-us.cfg`

### CFG Pattern

```cfg
@PART[nfex-antenna-rover-1]:FOR[NearFutureExploration]
{
    MODULE
    {
        name = ModuleDataTransmitter
        antennaType = DIRECT            // or RELAY
        packetInterval = 0.75           // seconds
        packetSize = 2                  // Mits
        packetResourceCost = 8.0        // EC/packet
        antennaPower = 40000            // meters
        antennaCombinable = True
        antennaCombinableExponent = 0.75
    }
    MODULE
    {
        name = ModuleAntennaFeed        // for reflector pairing
        FeedTransformName = AntennaFeedVector
        FeedScale = 0.5
    }
}
```

### Field Mapping

| JS Field | CFG Source | Conversion |
|----------|------------|------------|
| `name` | `PART.title` (from localization) | Use display name |
| `type` | `antennaType = DIRECT` → "omni", `antennaType = RELAY` → "dish" | Direct |
| `antennaPower` | `antennaPower` | Direct (meters) |
| `packetInterval` | `packetInterval` | Direct (seconds) |
| `packetSize` | `packetSize` | Direct (Mits) |
| `packetResourceCost` | `packetResourceCost` | Direct (EC/packet) |
| `antennaCombinable` | `antennaCombinable` | Direct (boolean) |
| `antennaCombinableExponent` | `antennaCombinableExponent` | Direct (default 0.75) |
| `source` | — | Hardcode `"NearFutureExploration"` |

### Name Resolution

1. Get `@PART[PartName]` from antenna cfg files
2. Find `title = #LOC_NFEX_XXXX` in `Localization/en-us.cfg`
3. Use localized display name (e.g., "AX-4 Pointable Helical Antenna")

### Current Entries (22 antennas)

| JS Name | CFG Part | Type | antennaPower | packetInterval | packetSize | packetResourceCost | combinable | exponent |
|---------|----------|------|--------------|----------------|------------|--------------------|------------|----------|
| AX-4 Pointable Helical Antenna | nfex-antenna-rover-1 | omni | 40,000 | 0.75 | 2 | 8.0 | true | 0.75 |
| AX-5 Aerial Micro-Antenna | nfex-antenna-rover-2 | omni | 150,000 | 0.75 | 2 | 8.0 | true | 0.75 |
| AX-30 High Gain Micro-Antenna | nfex-antenna-rover-3 | omni | 300,000 | 0.65 | 2 | 10.0 | true | 0.75 |
| PH-1 Phased Array Antenna Element | nfex-antenna-phased-single-1 | omni | 125,000 | 0.4 | 2 | 14.0 | true | 1.0 |
| PH-2 Phased Array Antenna Element | nfex-antenna-phased-single-2 | omni | 200,000 | 0.4 | 2 | 14.0 | true | 1.0 |
| PH-3 Phased Array Antenna Element | nfex-antenna-phased-single-3 | omni | 800,000 | 0.4 | 3 | 20.0 | true | 1.0 |
| RA-X1 Phased Relay Antenna | nfex-antenna-phased-array-1 | dish | 6,000,000 | 0.5 | 3 | 20.0 | true | 0.25 |
| RA-X2 Phased Relay Antenna | nfex-antenna-phased-array-2 | dish | 10,000,000 | 0.5 | 6 | 35.0 | true | 0.25 |
| RA-X3 Phased Relay Antenna | nfex-antenna-phased-array-3 | dish | 100,000,000 | 0.5 | 8 | 45.0 | true | 0.25 |
| D-2 Spot Antenna | nfex-antenna-top-dish-1 | omni | 2,000,000 | 0.1 | 1 | 6.0 | true | 0.75 |
| D-50 Large Spot Antenna | nfex-antenna-top-dish-2 | omni | 50,000,000 | 0.1 | 2 | 6.0 | true | 0.75 |
| RFL-1 Dish Reflector | nfex-antenna-reflector-side-1 | — | — | — | — | — | — | — |
| RFL-2 Medium Dish Reflector | nfex-antenna-reflector-side-2 | — | — | — | — | — | — | — |
| RFL-3 Dish Reflector Array | nfex-antenna-reflector-side-3 | — | — | — | — | — | — | — |
| RFL-50 Large Dish Reflector | nfex-antenna-reflector-large-1 | — | — | — | — | — | — | — |
| RFL-100 Giant Dish Reflector | nfex-antenna-reflector-huge-1 | — | — | — | — | — | — | — |
| RFL-2000 Dish Reflector Array | nfex-antenna-reflector-giant-1 | — | — | — | — | — | — | — |
| RA-0-8 Relay Antenna | nfex-antenna-relay-tdrs-1 | dish | 85,000,000 | 0.35 | 2 | 24.0 | true | 0.75 |
| RA-5B Advanced Relay Antenna | nfex-antenna-relay-tdrs-2 | dish | 500,000,000 | 0.6 | 3 | 28.0 | true | 0.75 |
| RA-00-2 Micro-Relay Antenna | nfex-antenna-relay-tiny-1 | dish | 2,000,000 | 0.35 | 1 | 24.0 | true | 0.75 |
| F-RA Relay Antenna Feed | nfex-antenna-feeder-relay-1 | dish | 5,000 | 0.6 | 2 | 24.0 | true | 0.5 |
| F-DA Direct Antenna Feed | nfex-antenna-feeder-direct-1 | omni | 5,000 | 0.6 | 2 | 24.0 | true | 0.5 |
| DR-1 High Gain Antenna | nfex-antenna-static-mini-1 | omni | 300,000 | 0.25 | 2 | 10.0 | true | 0.75 |
| DR-3 Deployable High Gain Antenna | nfex-antenna-deploy-wv3-1 | omni | 500,000 | 0.25 | 4 | 12.0 | true | 0.75 |

**Note:** Reflectors (RFL-*) have no `ModuleDataTransmitter` — they use `ModuleDeployableReflector` with `AddedRange`. They are not included in the raw antenna list since they don't transmit on their own; they extend the range of feeder antennas pointing at them.

### JS Implementation

**New raw data:** `js/data/antennas-nearfutureexploration-raw.js`
- Same CommNet formula as Stock
- `computeECPerSecond`, `computeRangeKm`, `computeCombinedPower` exported
- 22 antennas from the list above

**Store integration:** `store.js` → `computeNearFutureExplorationRange()` and `availableAntennas()` include NFE when `nfeEnabled === true`

**Settings UI:** `js/views/settings.js` → Part Groups checkbox + dedicated settings card when enabled

### Updating Data

#### NearFutureExploration

1. **Antennas**: Update `js/data/antennas-nearfutureexploration-raw.js` from `vendor/NearFutureExploration/GameData/NearFutureExploration/Parts/Antenna/*.cfg`
   - Extract `antennaType`, `antennaPower`, `packetInterval`, `packetSize`, `packetResourceCost`, `antennaCombinable`, `antennaCombinableExponent`
   - Names from `Localization/en-us.cfg`

---

## Version Tracking

| JS File | Vendor Source | Last Sync |
|---------|---------------|-----------|
| `antennas-remotetech-raw.js` | `RemoteTech_Antennas.cfg` | Check git log |
| `antennas-stock-raw.js` | `Squad/Parts/Utility/*` | Check git log |
| `antennas-realantennas-raw.js` | `RealAntennas/Parts/*.cfg` | Check git log |
| `antennas-nearfutureexploration-raw.js` | `NearFutureExploration/Parts/Antenna/*.cfg` | Check git log |
| `bodies.js` (RSS) | `RSSKopernicus/*/*.cfg` | Check git log |

Run `git log --oneline -1 js/data/antennas-remotetech-raw.js` to see last update.