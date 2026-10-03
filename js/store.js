/**
 * Everything the app remembers between visits: the settings, the chain being
 * planned, and the bodies and antennas the user has added.
 *
 * The localStorage keys, the shapes and the version numbers are those of
 * 1.6.x, so data saved by that version still loads. Each {@link module} entry
 * brings older data up to the current shape; see {@link migrateChain} for the
 * oldest case.
 *
 * The chain is held as names rather than as copies of the records they point
 * at, so editing a stock antenna is picked up straight away instead of
 * leaving a stale copy behind in the chain.
 *
 * @module
 */

import { computed, effect, signal } from "./reactive.js";
import { STOCK_ANTENNAS_RAW } from "./data/antennas-stock-raw.js";
import { REMOTE_TECH_ANTENNAS_RAW } from "./data/antennas-remotetech-raw.js";
import { REAL_ANTENNAS_RAW } from "./data/antennas-realantennas-raw.js";
import { NEAR_FUTURE_EXPLORATION_ANTENNAS_RAW } from "./data/antennas-nearfutureexploration-raw.js";
import { STOCK_BODIES } from "./data/bodies.js";
import {
  computeECPerSecond as stockComputeEC,
  rangeToDSN,
  rangeToIdentical,
} from "./calculator/stock-antenna.js";
import {
  computeECPerSecond as rssStockComputeEC,
  rangeToDSN as rssRangeToDSN,
  rangeToIdentical as rssRangeToIdentical,
} from "./calculator/rss-antenna.js";
import {
  computeECPerSecond as rtComputeEC,
  applyRangeMultiplier as rtApplyRangeMultiplier,
  rangeToMissionControl,
  computeMultipleAntennaBonus,
  metersToKm,
  computeRange as rtComputeRange,
} from "./calculator/remote-tech-antenna.js";
import {
  computeECPerSecond as raComputeEC,
  computeGain,
  RA_BANDS,
  RA_TECH_LEVELS,
  RA_ENCODERS,
} from "./calculator/realantennas-antenna.js";
import {
  computeECPerSecond as nfeComputeEC,
  computeRangeKm as nfeComputeRangeKm,
  computeCombinedPower as nfeComputeCombinedPower,
} from "./data/antennas-nearfutureexploration-raw.js";

/** @typedef {import("./data/bodies.js").Body} Body */
/** @typedef {import("./data/antennas-stock-raw.js").StockAntennaRaw} AntennaRaw */
/** @typedef {import("./data/antennas-remotetech-raw.js").RemoteTechAntennaRaw} RemoteTechAntennaRaw */
/** @typedef {import("./data/antennas-realantennas-raw.js").RealAntennasAntennaRaw} RealAntennasAntennaRaw */
/** @typedef {import("./data/antennas-nearfutureexploration-raw.js").NearFutureExplorationAntennaRaw} NearFutureExplorationAntennaRaw */
/** @typedef {{
 *   name: string,
 *   type: "omni"|"dish",
 *   range: number,
 *   elcNeeded: number,
 *   source?: "Squad"|"RemoteTech"|"Real Solar System"|"NearFutureExploration",
 *   hidden?: boolean
 * }} Antenna */
/** @typedef {"stock"|"remoteTech"} CommSystem */
/** @typedef {{
 *   stockData: "stock"|"rss",
 *   commSystem: CommSystem,
 *   rangeMultiplier: number,
 *   multipleAntennaMultiplier: number,
 *   rangeModifier: number,
 *   DSNModifier: number,
 *   targetDSN: "level1"|"level2"|"level3",
 *   rangeDisplayMode: "dsn"|"antenna",
 *   // RemoteTech settings
 *   rtEnabled: boolean,
 *   rtRangeMultiplier: number,
 *   rtConsumptionMultiplier: number,
 *   rtMissionControlRangeMultiplier: number,
 *   rtOmniRangeClampFactor: number,
 *   rtDishRangeClampFactor: number,
 *   rtMultipleAntennaMultiplier: number,
 *   rtRangeModelType: "Standard"|"Root",
 *   rtTargetTechLevel: number,
 *   // RealAntennas settings
 *   raEnabled: boolean,
 *   raRangeMultiplier: number,
 *   raConsumptionMultiplier: number,
 *   raPlannerActiveTxTime: number,
 *   raMultipleAntennaMultiplier: number,
 *   raTargetTechLevel: number,
 *   // NearFutureExploration settings
 *   nfeEnabled: boolean,
 *   nfeRangeMultiplier: number,
 *   nfeConsumptionMultiplier: number,
 *   nfeMultipleAntennaMultiplier: number,
 * }} Settings */
/** @typedef {{antenna: string, quantity: number}} AntennaSlot */
/** @typedef {{body: string, count: number, altitude: number, elcNeeded: number, antennas: AntennaSlot[], antennaIndex: number, parkingAlt: number}} Chain */
/** @typedef {{name: string, antennas: AntennaSlot[]}} Craft */

/** @typedef {{nfeEnabled: boolean, nfeRangeMultiplier: number, nfeConsumptionMultiplier: number, nfeMultipleAntennaMultiplier: number}} NFESettings */

/** How angularly separated the omnidirectional antennas count as being. */
const MAM_INDEX = -1;

/** angular-local-storage wrote this in front of every key it owned. */
const PREFIX = "kspRemoteTechPlanner.";

export const KEYS = {
  settings: `${PREFIX}settings`,
  settingsVersion: `${PREFIX}settingsVersion`,
  chain: `${PREFIX}inputData`,
  chainVersion: `${PREFIX}inputDataVersion`,
  userBodies: `${PREFIX}userBody`,
  userBodiesVersion: `${PREFIX}userBodyVersion`,
  userAntennas: `${PREFIX}userAntenna`,
  userAntennasVersion: `${PREFIX}userAntennaVersion`,
  userCrafts: `${PREFIX}userCraft`,
  userCraftsVersion: `${PREFIX}userCraftVersion`,
};

/**
 * The version written alongside each key, telling a later version of the app
 * what shape to expect. Settings reached 4 when commSystem was added.
 */
const VERSIONS = {
  settings: 4,
  chain: 2,
  userBodies: 2,
  userAntennas: 2,
  userCrafts: 1,
};

/** @type {Readonly<Storage>} */
const NO_STORAGE = {
  length: 0,
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {},
};

/** @type {Settings} */
const DEFAULT_SETTINGS = {
  stockData: "stock",
  commSystem: "stock",
  rangeMultiplier: 1,
  multipleAntennaMultiplier: 0,
  rangeModifier: 1.0,
  DSNModifier: 1.0,
  targetDSN: "level3",
  rangeDisplayMode: "antenna",
  // RemoteTech defaults
  rtEnabled: false,
  rtRangeMultiplier: 1.0,
  rtConsumptionMultiplier: 1.0,
  rtMissionControlRangeMultiplier: 1.0,
  rtOmniRangeClampFactor: 100,
  rtDishRangeClampFactor: 1000,
  rtMultipleAntennaMultiplier: 0,
  rtRangeModelType: "Standard",
  rtTargetTechLevel: 3,
  // RealAntennas defaults
  raEnabled: false,
  raRangeMultiplier: 1.0,
  raConsumptionMultiplier: 1.0,
  raPlannerActiveTxTime: 0,
  raMultipleAntennaMultiplier: 0,
  raTargetTechLevel: 9,
  // NearFutureExploration defaults
  nfeEnabled: false,
  nfeRangeMultiplier: 1.0,
  nfeConsumptionMultiplier: 1.0,
  nfeMultipleAntennaMultiplier: 0,
};

/** @type {Chain} */
const DEFAULT_CHAIN = {
  body: "Kerbin",
  count: 4,
  altitude: 1000,
  elcNeeded: 0.029,
  antennas: [{ antenna: "Communotron 16", quantity: 1 }],
  antennaIndex: 0,
  parkingAlt: 70,
};

/**
 * The stock body a chain that names a body we no longer have falls back to.
 * @type {string}
 */
const FALLBACK_BODY = "Kerbin";

/**
 * @template T
 * @param {Storage} storage
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
function readJson(storage, key, fallback) {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? /** @type {T} */ (parsed) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {Storage} storage
 * @param {string} key
 * @param {unknown} data
 */
function writeJson(storage, key, data) {
  if (data && typeof data === "object" && Object.keys(data).length > 0) {
    storage.setItem(key, JSON.stringify(data));
  } else {
    storage.removeItem(key);
  }
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function number(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * @param {unknown} json
 * @returns {Settings}
 */
export function migrateSettings(json) {
  const saved = /** @type {Record<string, unknown>} */ (json);
  return {
    stockData: saved.stockData === "rss" ? "rss" : "stock",
    commSystem: saved.commSystem === "remoteTech" ? "remoteTech" : "stock",
    rangeMultiplier: number(saved.rangeMultiplier, 1),
    multipleAntennaMultiplier: number(saved.multipleAntennaMultiplier, 0),
    rangeModifier: number(saved.rangeModifier, 1.0),
    DSNModifier: number(saved.DSNModifier, 1.0),
    targetDSN:
      saved.targetDSN === "level1" || saved.targetDSN === "level2" ? saved.targetDSN : "level3",
    rangeDisplayMode: saved.rangeDisplayMode === "dsn" ? "dsn" : "antenna",
    rtEnabled: saved.rtEnabled !== false,
    rtRangeMultiplier: number(saved.rtRangeMultiplier, 1.0),
    rtConsumptionMultiplier: number(saved.rtConsumptionMultiplier, 1.0),
    rtMissionControlRangeMultiplier: number(saved.rtMissionControlRangeMultiplier, 1.0),
    rtOmniRangeClampFactor: number(saved.rtOmniRangeClampFactor, 100),
    rtDishRangeClampFactor: number(saved.rtDishRangeClampFactor, 1000),
    rtMultipleAntennaMultiplier: number(saved.rtMultipleAntennaMultiplier, 0),
    rtRangeModelType: saved.rtRangeModelType === "Root" ? "Root" : "Standard",
    rtTargetTechLevel: Math.min(3, Math.max(1, Math.round(number(saved.rtTargetTechLevel, 3)))),
    raEnabled: saved.raEnabled !== false,
    raRangeMultiplier: number(saved.raRangeMultiplier, 1.0),
    raConsumptionMultiplier: number(saved.raConsumptionMultiplier, 1.0),
    raPlannerActiveTxTime: number(saved.raPlannerActiveTxTime, 0),
    raMultipleAntennaMultiplier: number(saved.raMultipleAntennaMultiplier, 0),
    raTargetTechLevel: Math.min(9, Math.max(0, Math.round(number(saved.raTargetTechLevel, 9)))),
    nfeEnabled: saved.nfeEnabled !== false,
    nfeRangeMultiplier: number(saved.nfeRangeMultiplier, 1.0),
    nfeConsumptionMultiplier: number(saved.nfeConsumptionMultiplier, 1.0),
    nfeMultipleAntennaMultiplier: number(saved.nfeMultipleAntennaMultiplier, 0),
  };
}

/**
 * @param {unknown} json
 * @returns {Chain}
 */
export function migrateChain(json) {
  const saved = /** @type {Record<string, any>} */ (json);

  const slots = Array.isArray(saved.antennas)
    ? saved.antennas
    : [{ antenna: saved.antenna, quantity: 1 }];
  const antennas = slots
    .map((slot) => ({
      antenna: typeof slot?.antenna === "string" ? slot.antenna : slot?.antenna?.name,
      quantity: Math.max(1, Math.round(number(slot?.quantity, 1))),
    }))
    .filter((slot) => slot.antenna !== undefined);

  const body = typeof saved.body === "string" ? saved.body : saved.body?.name;

  return {
    body: body ?? DEFAULT_CHAIN.body,
    count: Math.max(1, Math.round(number(saved.count, DEFAULT_CHAIN.count))),
    altitude: number(saved.altitude, DEFAULT_CHAIN.altitude),
    elcNeeded: number(saved.elcNeeded, DEFAULT_CHAIN.elcNeeded),
    antennas: antennas.length > 0 ? antennas : DEFAULT_CHAIN.antennas.map((slot) => ({ ...slot })),
    antennaIndex: Math.round(number(saved.antennaIndex, 0)),
    parkingAlt: number(saved.parkingAlt, DEFAULT_CHAIN.parkingAlt),
  };
}

/**
 * @param {unknown} json
 * @returns {Record<string, Antenna>}
 */
export function migrateUserAntennas(json) {
  /** @type {Record<string, Antenna>} */
  const antennas = {};
  for (const [name, value] of Object.entries(/** @type {Record<string, any>} */ (json))) {
    const type = value.type === "dish" || value.type === 1 || value.type === "1" ? "dish" : "omni";
    antennas[name] = {
      name: value.name ?? name,
      type,
      range: number(value.range, 0),
      elcNeeded: number(value.elcNeeded, 0),
    };
  }
  return antennas;
}

/**
 * @param {unknown} json
 * @returns {Record<string, Body>}
 */
export function migrateUserBodies(json) {
  /** @type {Record<string, Body>} */
  const bodies = {};
  for (const [name, value] of Object.entries(/** @type {Record<string, any>} */ (json))) {
    bodies[name] = {
      name: value.name ?? name,
      color: value.color ?? "rgb(128,128,128)",
      radius: number(value.radius, 0),
      stdGravity: number(value.stdGravity, 0),
      soi: number(value.soi, 0),
    };
  }
  return bodies;
}

/**
 * @param {unknown} json
 * @returns {Record<string, Craft>}
 */
export function migrateUserCrafts(json) {
  /** @type {Record<string, Craft>} */
  const crafts = {};
  if (!json || typeof json !== "object") return crafts;
  for (const [name, value] of Object.entries(/** @type {Record<string, any>} */ (json))) {
    const antennas = Array.isArray(value.antennas)
      ? value.antennas
          .map((slot) => ({
            antenna: typeof slot?.antenna === "string" ? slot.antenna : slot?.antenna?.name,
            quantity: Math.max(1, Math.round(number(slot?.quantity, 1))),
          }))
          .filter((slot) => slot.antenna !== undefined)
      : [];
    crafts[name] = { name: value.name ?? name, antennas };
  }
  return crafts;
}

/**
 * The app's state, wired to a place to keep it between visits.
 *
 * @param {Readonly<Storage>} [storage] defaults to this origin's localStorage
 * @returns {object}
 */
export function createStore(storage = globalThis.localStorage ?? NO_STORAGE) {
  const settings = signal(migrateSettings(readJson(storage, KEYS.settings, DEFAULT_SETTINGS)));
  const chain = signal(migrateChain(readJson(storage, KEYS.chain, DEFAULT_CHAIN)));
  const userBodies = signal(migrateUserBodies(readJson(storage, KEYS.userBodies, {})));
  const userAntennas = signal(migrateUserAntennas(readJson(storage, KEYS.userAntennas, {})));
  const userCrafts = signal(migrateUserCrafts(readJson(storage, KEYS.userCrafts, {})));

  storage.setItem(KEYS.settingsVersion, String(VERSIONS.settings));
  storage.setItem(KEYS.chainVersion, String(VERSIONS.chain));
  storage.setItem(KEYS.userBodiesVersion, String(VERSIONS.userBodies));
  storage.setItem(KEYS.userAntennasVersion, String(VERSIONS.userAntennas));
  storage.setItem(KEYS.userCraftsVersion, String(VERSIONS.userCrafts));

  effect(() => writeJson(storage, KEYS.settings, settings.value));
  effect(() => writeJson(storage, KEYS.chain, chain.value));
  effect(() => writeJson(storage, KEYS.userBodies, userBodies.value));
  effect(() => writeJson(storage, KEYS.userAntennas, userAntennas.value));
  effect(() => writeJson(storage, KEYS.userCrafts, userCrafts.value));

  /**
   * Compute range for a Stock raw antenna based on current settings target.
   * @param {AntennaRaw} raw
   * @param {Settings} settings
   * @returns {number} range in km
   */
  function computeStockAntennaRange(raw, settings) {
    const isRSS = settings.stockData === "rss";
    const modifiers = { rangeModifier: settings.rangeModifier, DSNModifier: settings.DSNModifier };
    const quantity = 1;
    if (settings.rangeDisplayMode === "antenna") {
      return isRSS
        ? rssRangeToIdentical(raw, quantity, modifiers.rangeModifier)
        : rangeToIdentical(raw, quantity, modifiers.rangeModifier);
    }
    switch (settings.targetDSN) {
      case "level1":
        return isRSS
          ? rssRangeToDSN(raw, "level1", quantity, modifiers)
          : rangeToDSN(raw, "level1", quantity, modifiers);
      case "level2":
        return isRSS
          ? rssRangeToDSN(raw, "level2", quantity, modifiers)
          : rangeToDSN(raw, "level2", quantity, modifiers);
      case "level3":
      default:
        return isRSS
          ? rssRangeToDSN(raw, "level3", quantity, modifiers)
          : rangeToDSN(raw, "level3", quantity, modifiers);
    }
  }

  /**
   * Compute range for a RemoteTech raw antenna.
   * @param {AntennaRaw} raw
   * @param {Settings} settings
   * @returns {number} range in km
   */
  function computeRTAntennaRange(raw, settings) {
    const antenna = {
      omniRange: raw.omniRange ?? 0,
      dishRange: raw.dishRange ?? 0,
    };
    const multiplied = rtApplyRangeMultiplier(antenna, settings.rtRangeMultiplier);

    if (settings.rangeDisplayMode === "antenna") {
      // Antenna-to-antenna: compute range between two identical antennas
      return metersToKm(
        rtComputeRange(multiplied, multiplied, {
          OmniRangeClampFactor: settings.rtOmniRangeClampFactor,
          DishRangeClampFactor: settings.rtDishRangeClampFactor,
          RangeModelType: settings.rtRangeModelType,
        }),
      );
    }

    // Default: range to Mission Control (ground station)
    // Mission Control upgradeable omni ranges: 4 Mm, 30 Mm, 75 Mm (tiers 1, 2, 3)
    const missionControlOmni = [4e6, 30e6, 75e6][
      Math.min(2, Math.max(0, (settings.rtTargetTechLevel ?? 3) - 1))
    ];
    return metersToKm(
      rangeToMissionControl(
        multiplied,
        {
          OmniRangeClampFactor: settings.rtOmniRangeClampFactor,
          DishRangeClampFactor: settings.rtDishRangeClampFactor,
          RangeModelType: settings.rtRangeModelType,
        },
        missionControlOmni,
      ),
    );
  }

  /**
   * Compute range for a RealAntennas raw antenna.
   * @param {RealAntennasAntennaRaw} raw
   * @param {Settings} settings
   * @returns {number} range in km
   */
  function computeRealAntennasRange(raw, settings) {
    const rangeMultiplier = settings.raRangeMultiplier ?? 1.0;

    // Create antenna object with computed values
    const antenna = {
      antennaDiameter: raw.antennaDiameter ?? 0,
      referenceGain: raw.referenceGain ?? 0,
      referenceFrequency: raw.referenceFrequency ?? 0,
      txPower: raw.txPower ?? 0,
      techLevel: raw.techLevel ?? 0,
      rfBand: raw.rfBand ?? "S",
      amwTemp: raw.amwTemp ?? 290,
      encoder: raw.encoder ?? "None",
      canTarget: raw.canTarget ?? false,
    };

    const band = RA_BANDS[antenna.rfBand];
    if (!band) return 0;

    // For antenna-to-antenna mode, compute range between two identical antennas
    // using link budget: find distance where received power = noise floor
    if (settings.rangeDisplayMode === "antenna") {
      return computeAntennaToAntennaRange(antenna, band) * rangeMultiplier;
    }

    // Ground station mode: build ground station antennas for target tech level
    // and find the best compatible match
    const targetTechLevel = Math.min(9, Math.max(0, settings.raTargetTechLevel ?? 9));
    const groundStations = buildGroundStationAntennas(targetTechLevel);
    const bestGS = findBestGroundStation(antenna, groundStations, band);
    if (!bestGS) return 0;

    return computeAntennaToGroundStationRange(antenna, bestGS, band) * rangeMultiplier;
  }

  /**
   * Build ground station antennas for a given tech level based on RealAntennasCommNetParams.cfg
   * @param {number} techLevel - 0-9
   * @returns {Array<{antenna: object, band: string}>}
   */
  function buildGroundStationAntennas(techLevel) {
    const stations = [];

    // L-band omni (TL0, always available if techLevel >= 0)
    if (techLevel >= 0) {
      const band = RA_BANDS.L;
      if (band) {
        stations.push({
          antenna: {
            antennaDiameter: 0,
            referenceGain: 6, // dBi
            referenceFrequency: 1620, // MHz
            txPower: 40, // dBm (10W)
            techLevel: 0,
            rfBand: "L",
            amwTemp: 290,
            encoder: "None",
            canTarget: true,
          },
          band,
        });
      }
    }

    // S-band dish (TL3 base, upgrades at TL4, TL5)
    if (techLevel >= 3) {
      const band = RA_BANDS.S;
      if (band) {
        let refGain = 52.5; // 26m antenna
        let txPower = 63; // 2kW
        let amwTemp = 125;
        let encoder = "Reed-Solomon 255/223"; // TL3
        if (techLevel >= 5) {
          refGain = 52.5; // same dish
          amwTemp = 80; // noise reduction
          encoder = "Convolutional 7, 1/2"; // TL5
        } else if (techLevel >= 4) {
          refGain = 60.5; // 64m antenna
          encoder = "Reed-Solomon 255/223";
        }
        stations.push({
          antenna: {
            antennaDiameter: techLevel >= 4 ? 64 : 26,
            referenceGain: refGain,
            referenceFrequency: 2250,
            txPower,
            techLevel: Math.min(techLevel, 5),
            rfBand: "S",
            amwTemp,
            encoder,
            canTarget: true,
          },
          band,
        });
      }
    }

    // X-band dish (TL7 base, upgrades at TL8, TL9)
    if (techLevel >= 7) {
      const band = RA_BANDS.X;
      if (band) {
        let refGain = 73.5; // X-band 64m
        let txPower = 70; // 10kW
        let amwTemp = 40;
        let encoder = "Convolutional 7, 1/2"; // TL7
        if (techLevel >= 9) {
          amwTemp = 12.8; // super-cooled
          encoder = "Turbo 1/2"; // TL9
        } else if (techLevel >= 8) {
          refGain = 74.3;
          txPower = 73;
          encoder = "Turbo 1/2"; // TL8
        }
        stations.push({
          antenna: {
            antennaDiameter: 64,
            referenceGain: refGain,
            referenceFrequency: 8450,
            txPower,
            techLevel: Math.min(techLevel, 9),
            rfBand: "X",
            amwTemp,
            encoder,
            canTarget: true,
          },
          band,
        });
      }
    }

    // K-band dish (TL9 only)
    if (techLevel >= 9) {
      const band = RA_BANDS.K;
      if (band) {
        stations.push({
          antenna: {
            antennaDiameter: 34,
            referenceGain: 79, // K-band 34m
            referenceFrequency: 26250,
            txPower: 54.8,
            techLevel: 9,
            rfBand: "K",
            amwTemp: 20,
            encoder: "Turbo 1/2",
            canTarget: true,
          },
          band,
        });
      }
    }

    return stations;
  }

  /**
   * Find the best ground station antenna compatible with the vessel antenna
   * @param {object} vesselAntenna
   * @param {Array<{antenna: object, band: object}>} groundStations
   * @param {object} vesselBand
   * @returns {object|null}
   */
  function findBestGroundStation(vesselAntenna, groundStations, vesselBand) {
    // Filter to same band and compatible (both can target)
    const compatible = groundStations.filter(
      (gs) => gs.band.name === vesselBand.name && gs.antenna.canTarget && vesselAntenna.canTarget,
    );
    if (compatible.length === 0) return null;

    // Pick highest gain (best for link budget)
    return compatible.reduce((best, gs) =>
      computeGain(gs.antenna) > computeGain(best.antenna) ? gs : best,
    ).antenna;
  }

  /**
   * Compute range between two identical antennas (antenna-to-antenna)
   * @param {object} antenna
   * @param {object} band
   * @returns {number} range in km
   */
  function computeAntennaToAntennaRange(antenna, band) {
    const gain = computeGain(antenna);
    const tech = RA_TECH_LEVELS[antenna.techLevel];
    if (!tech) return 0;

    const txPower = antenna.txPower;
    const noiseTemp = antenna.amwTemp + 2.725; // cosmic background
    const n0 = -198.599 + 10 * Math.log10(noiseTemp); // dBm/Hz

    // Required Eb/N0 from encoder
    const encoder = RA_ENCODERS[antenna.encoder] || { requiredEbN0: 10 };
    const requiredEbN0 = encoder.requiredEbN0;

    // Minimum data rate at this tech level
    const minDataRate = tech.minDataRate;

    // Link budget: RxPower = TxPower + TxGain - FSPL - PointingLoss + RxGain
    // For identical antennas pointing at each other: pointing loss ~0
    // RxPower = TxPower + 2*Gain - FSPL
    // Eb/N0 = RxPower - N0 - 10*log10(DataRate)
    // At max range: Eb/N0 = requiredEbN0
    // So: TxPower + 2*Gain - FSPL - N0 - 10*log10(DataRate) = requiredEbN0
    // FSPL = TxPower + 2*Gain - N0 - 10*log10(DataRate) - requiredEbN0

    const fsplMax = txPower + 2 * gain - n0 - 10 * Math.log10(minDataRate) - requiredEbN0;

    // FSPL = 20*log10(distance * frequency) + PATH_LOSS_CONSTANT
    // distance = 10^((FSPL - PATH_LOSS_CONSTANT) / 20) / frequency
    const PATH_LOSS_CONSTANT = -147.552435289803;
    const distanceM = Math.pow(10, (fsplMax - PATH_LOSS_CONSTANT) / 20) / band.frequency;

    return Math.max(0, distanceM / 1000); // km
  }

  /**
   * Compute range from vessel antenna to ground station
   * @param {object} vesselAntenna
   * @param {object} gsAntenna
   * @param {object} band
   * @returns {number} range in km
   */
  function computeAntennaToGroundStationRange(vesselAntenna, gsAntenna, band) {
    const txGain = computeGain(vesselAntenna);
    const rxGain = computeGain(gsAntenna);
    const tech = RA_TECH_LEVELS[vesselAntenna.techLevel];
    if (!tech) return 0;

    const txPower = vesselAntenna.txPower;
    const noiseTemp = gsAntenna.amwTemp + 2.725;
    const n0 = -198.599 + 10 * Math.log10(noiseTemp);

    const encoder = RA_ENCODERS[vesselAntenna.encoder] || { requiredEbN0: 10 };
    const requiredEbN0 = encoder.requiredEbN0;
    const minDataRate = tech.minDataRate;

    // RxPower = TxPower + TxGain - FSPL - PointingLossTx - PointingLossRx + RxGain
    // For ground station: assume good pointing, small loss
    const pointingLoss = 3; // dB total (vessel + ground)

    const fsplMax =
      txPower + txGain - pointingLoss + rxGain - n0 - 10 * Math.log10(minDataRate) - requiredEbN0;

    const PATH_LOSS_CONSTANT = -147.552435289803;
    const distanceM = Math.pow(10, (fsplMax - PATH_LOSS_CONSTANT) / 20) / band.frequency;

    return Math.max(0, distanceM / 1000);
  }

  /**
   * Compute range for a NearFutureExploration raw antenna.
   * Uses standard CommNet formula like Stock.
   * @param {NearFutureExplorationAntennaRaw} raw
   * @param {Settings} settings
   * @returns {number} range in km
   */
  function computeNearFutureExplorationRange(raw, settings) {
    const rangeMultiplier = settings.nfeRangeMultiplier ?? 1.0;
    const modifiers = { rangeModifier: settings.rangeModifier, DSNModifier: settings.DSNModifier };
    const quantity = 1;

    // Apply combinable exponent for combined power
    const singlePower = raw.antennaPower * modifiers.rangeModifier * rangeMultiplier;
    let effectivePower = singlePower;

    if (settings.rangeDisplayMode === "antenna") {
      // Antenna-to-antenna: use combined power for identical antennas
      effectivePower = nfeComputeCombinedPower(
        singlePower,
        quantity,
        raw.antennaCombinableExponent,
      );
      const targetPower = effectivePower;
      return nfeComputeRangeKm(effectivePower, targetPower);
    }

    // DSN mode
    let dsnPower;
    switch (settings.targetDSN) {
      case "level1":
        dsnPower = 2000000000; // 2 Gm
        break;
      case "level2":
        dsnPower = 50000000000; // 50 Gm
        break;
      case "level3":
      default:
        dsnPower = 250000000000; // 250 Gm
        break;
    }
    dsnPower = dsnPower * modifiers.DSNModifier;

    return nfeComputeRangeKm(effectivePower, dsnPower);
  }

  /**
   * Every antenna the chain could name: filtered by commSystem/rtEnabled/raEnabled, with computed range/EC.
   *
   * @param {Settings} current
   * @param {Record<string, Antenna>} mine
   * @returns {Map<string, Antenna>}
   */
  function availableAntennas(current, mine) {
    const all = new Map();

    // Stock antennas are always available
    for (const raw of STOCK_ANTENNAS_RAW) {
      if (raw.hidden) continue;
      if (raw.source !== "Squad") continue;
      const computedRange = computeStockAntennaRange(raw, current);
      const isRSS = current.stockData === "rss";
      const computedEC = isRSS ? rssStockComputeEC(raw) : stockComputeEC(raw);
      all.set(raw.name, {
        name: raw.name,
        type: raw.type,
        range: computedRange,
        elcNeeded: computedEC,
        source: raw.source,
      });
    }

    // RemoteTech antennas only if enabled
    if (current.rtEnabled) {
      for (const raw of REMOTE_TECH_ANTENNAS_RAW) {
        if (raw.hidden) continue;
        const computedRange = computeRTAntennaRange(raw, current);
        const computedEC = rtComputeEC(raw, current.rtConsumptionMultiplier);
        all.set(raw.name, {
          name: raw.name,
          type: raw.type,
          range: computedRange,
          elcNeeded: computedEC,
          source: raw.source,
        });
      }
    }

    // RealAntennas antennas only if enabled
    if (current.raEnabled) {
      for (const raw of REAL_ANTENNAS_RAW) {
        if (raw.hidden) continue;
        const computedRange = computeRealAntennasRange(raw, current);
        const computedEC = raComputeEC(
          raw,
          current.raConsumptionMultiplier,
          current.raPlannerActiveTxTime || 0,
        );
        all.set(raw.name, {
          name: raw.name,
          type: raw.type,
          range: computedRange,
          elcNeeded: computedEC,
          source: raw.source,
        });
      }
    }

    // NearFutureExploration antennas only if enabled
    if (current.nfeEnabled) {
      for (const raw of NEAR_FUTURE_EXPLORATION_ANTENNAS_RAW) {
        if (raw.hidden) continue;
        const computedRange = computeNearFutureExplorationRange(raw, current);
        const computedEC = nfeComputeEC(raw) * (current.nfeConsumptionMultiplier ?? 1.0);
        all.set(raw.name, {
          name: raw.name,
          type: raw.type,
          range: computedRange,
          elcNeeded: computedEC,
          source: raw.source,
        });
      }
    }

    // User antennas always available
    for (const antenna of Object.values(mine)) {
      all.set(antenna.name, antenna);
    }

    return new Map(
      [...all].map(([name, antenna]) => [
        name,
        { ...antenna, range: antenna.range * current.rangeMultiplier },
      ]),
    );
  }

  /**
   * @param {Record<string, Body>} mine
   * @param {string} name
   * @returns {Body|undefined}
   */
  function findBody(mine, name) {
    return STOCK_BODIES.find((body) => body.name === name) ?? mine[name];
  }

  const body = computed(() => {
    const current = chain.value;
    return findBody(userBodies.value, current.body) ?? findBody(userBodies.value, FALLBACK_BODY);
  });

  const antennas = computed(() => {
    const current = chain.value;
    const known = availableAntennas(settings.value, userAntennas.value);
    return current.antennas
      .map((slot) => ({ ...slot, antenna: known.get(slot.antenna) }))
      .filter((slot) => slot.antenna !== undefined);
  });

  /**
   * The omnidirectional antennas of the chain, counted as one antenna of
   * their combined range. Works for both Stock and RemoteTech.
   */
  const mam = computed(() => {
    const currentSettings = settings.value;
    const omni = antennas.value.filter((slot) => slot.antenna.type === "omni");
    const longest = Math.max(0, ...omni.map((slot) => slot.antenna.range));
    const combined = omni.reduce((total, slot) => total + slot.antenna.range * slot.quantity, 0);

    let range;
    let elcTotal = 0;

    if (currentSettings.commSystem === "stock" && currentSettings.nfeEnabled) {
      // NearFutureExploration: uses Stock CommNet formula but with NFE-specific multiplier
      range = longest + (combined - longest) * (currentSettings.nfeMultipleAntennaMultiplier || 0);

      elcTotal = omni.reduce((total, slot) => {
        const raw = NEAR_FUTURE_EXPLORATION_ANTENNAS_RAW.find((a) => a.name === slot.antenna.name);
        const baseEC = raw
          ? nfeComputeEC(raw) * (currentSettings.nfeConsumptionMultiplier || 1.0)
          : slot.antenna.elcNeeded;
        return total + baseEC * slot.quantity;
      }, 0);
    } else if (currentSettings.commSystem === "stock") {
      // Stock: linear interpolation between longest and sum
      range = longest + (combined - longest) * currentSettings.multipleAntennaMultiplier;

      elcTotal = omni.reduce((total, slot) => {
        const raw = STOCK_ANTENNAS_RAW.find((a) => a.name === slot.antenna.name);
        const baseEC = raw
          ? currentSettings.stockData === "rss"
            ? rssStockComputeEC(raw)
            : stockComputeEC(raw)
          : slot.antenna.elcNeeded;
        return total + baseEC * slot.quantity;
      }, 0);
    } else if (currentSettings.commSystem === "remoteTech") {
      // RemoteTech: bonus = (sum - max) * multiplier added to each omni
      const bonus = computeMultipleAntennaBonus(
        longest / currentSettings.rangeMultiplier,
        combined / currentSettings.rangeMultiplier,
        currentSettings.rtMultipleAntennaMultiplier,
      );
      range = (longest + bonus) * currentSettings.rangeMultiplier;

      elcTotal = omni.reduce((total, slot) => {
        const raw = STOCK_ANTENNAS_RAW.find((a) => a.name === slot.antenna.name);
        const baseEC = raw
          ? rtComputeEC(raw, currentSettings.rtConsumptionMultiplier)
          : slot.antenna.elcNeeded;
        return total + baseEC * slot.quantity;
      }, 0);
    } else {
      // RealAntennas: similar to RemoteTech but with RA-specific multiplier
      const bonus = computeMultipleAntennaBonus(
        longest / currentSettings.rangeMultiplier,
        combined / currentSettings.rangeMultiplier,
        currentSettings.raMultipleAntennaMultiplier || 0,
      );
      range = (longest + bonus) * currentSettings.rangeMultiplier;

      elcTotal = omni.reduce((total, slot) => {
        const raw = REAL_ANTENNAS_RAW.find((a) => a.name === slot.antenna.name);
        const baseEC = raw
          ? raComputeEC(
              raw,
              currentSettings.raConsumptionMultiplier,
              currentSettings.raPlannerActiveTxTime || 0,
            )
          : slot.antenna.elcNeeded;
        return total + baseEC * slot.quantity;
      }, 0);
    }

    return {
      name: "Multiple Antenna Multiplier",
      type: /** @type {const} */ ("omni"),
      range,
      elcNeeded: elcTotal,
    };
  });

  const selectedAntenna = computed(() =>
    chain.value.antennaIndex === MAM_INDEX
      ? mam.value
      : antennas.value[chain.value.antennaIndex]?.antenna,
  );

  /**
   * @param {Partial<Settings>} patch
   * @returns {void}
   */
  function updateSettings(patch) {
    const nextSettings = { ...settings.value, ...patch };
    const commSystemChanged =
      patch.commSystem !== undefined && patch.commSystem !== settings.value.commSystem;
    const stockDataChanged =
      patch.stockData !== undefined && patch.stockData !== settings.value.stockData;
    const rtEnabledChanged =
      patch.rtEnabled !== undefined && patch.rtEnabled !== settings.value.rtEnabled;
    const raEnabledChanged =
      patch.raEnabled !== undefined && patch.raEnabled !== settings.value.raEnabled;
    const nfeEnabledChanged =
      patch.nfeEnabled !== undefined && patch.nfeEnabled !== settings.value.nfeEnabled;
    settings.set(nextSettings);

    if (commSystemChanged) {
      // Reset chain antennas to first available antenna from enabled part groups
      const known = availableAntennas(nextSettings, userAntennas.value);
      const firstAvailable = known.keys().next().value ?? "Communotron 16";
      updateChain({
        antennas: [{ antenna: firstAvailable, quantity: 1 }],
        antennaIndex: 0,
      });
    }

    if (stockDataChanged) {
      for (const body of STOCK_BODIES) {
        if (body.game === nextSettings.stockData) {
          updateChain({ body: body.name });
          break;
        }
      }
    }

    // If a part list was disabled (or stock data changed), check if any antennas
    // in the chain are no longer available from the enabled part groups
    if (rtEnabledChanged || raEnabledChanged || nfeEnabledChanged || stockDataChanged) {
      const known = availableAntennas(nextSettings, userAntennas.value);
      const hasInvalidAntenna = chain.value.antennas.some((slot) => !known.has(slot.antenna));
      if (hasInvalidAntenna) {
        // Fall back to the first available antenna from enabled part groups
        const firstAvailable = known.keys().next().value;
        if (firstAvailable) {
          updateChain({
            antennas: [{ antenna: firstAvailable, quantity: 1 }],
            antennaIndex: 0,
          });
        }
      }
    }
  }

  /**
   * @param {Partial<Chain>} patch
   * @returns {void}
   */
  function updateChain(patch) {
    chain.set({ ...chain.value, ...patch });
  }

  /**
   * @param {string} name
   * @returns {void}
   */
  function addAntenna(name) {
    updateChain({ antennas: [...chain.value.antennas, { antenna: name, quantity: 1 }] });
  }

  /**
   * @param {number} index
   * @returns {void}
   */
  function removeAntenna(index) {
    const current = chain.value;
    const antennas = current.antennas.filter((_, position) => position !== index);
    const antennaIndex =
      current.antennaIndex < index
        ? current.antennaIndex
        : Math.min(current.antennaIndex, Math.max(antennas.length - 1, MAM_INDEX));
    updateChain({ antennas, antennaIndex });
  }

  /**
   * @param {number} index
   * @param {string} name
   * @returns {void}
   */
  function setAntenna(index, name) {
    updateChain({
      antennas: chain.value.antennas.map((slot, position) =>
        position === index ? { antenna: name, quantity: slot.quantity } : slot,
      ),
    });
  }

  /**
   * @param {number} index
   * @param {number} quantity
   * @returns {void}
   */
  function setQuantity(index, quantity) {
    updateChain({
      antennas: chain.value.antennas.map((slot, position) =>
        position === index ? { ...slot, quantity: Math.max(1, Math.round(quantity)) } : slot,
      ),
    });
  }

  /**
   * @param {string} name
   * @param {Body} body
   * @returns {void}
   */
  function saveBody(name, body) {
    userBodies.set({ ...userBodies.value, [name]: { ...body, name } });
  }

  /**
   * @param {string} name
   * @returns {void}
   */
  function removeBody(name) {
    const mine = { ...userBodies.value };
    delete mine[name];
    userBodies.set(mine);
    if (chain.value.body === name) updateChain({ body: FALLBACK_BODY });
  }

  /**
   * @param {string} name
   * @param {Antenna} antenna
   * @returns {void}
   */
  function saveAntenna(name, antenna) {
    userAntennas.set({ ...userAntennas.value, [name]: { ...antenna, name } });
  }

  /**
   * @param {string} name
   * @returns {void}
   */
  function removeAntennaDefinition(name) {
    const mine = { ...userAntennas.value };
    delete mine[name];
    userAntennas.set(mine);
    if (chain.value.antennas.some((slot) => slot.antenna === name)) {
      const antennas = chain.value.antennas.filter((slot) => slot.antenna !== name);
      updateChain({
        antennas,
        antennaIndex: Math.min(chain.value.antennaIndex, Math.max(antennas.length - 1, MAM_INDEX)),
      });
    }
  }

  /**
   * @param {string} name
   * @param {AntennaSlot[]} antennas
   * @returns {void}
   */
  function saveCraft(name, antennas) {
    userCrafts.set({
      ...userCrafts.value,
      [name]: { name, antennas: antennas.map((slot) => ({ ...slot })) },
    });
  }

  /**
   * @param {string} name
   * @returns {void}
   */
  function removeCraft(name) {
    const mine = { ...userCrafts.value };
    delete mine[name];
    userCrafts.set(mine);
  }

  /**
   * @param {string} oldName
   * @param {string} newName
   * @returns {void}
   */
  function renameCraft(oldName, newName) {
    const mine = { ...userCrafts.value };
    const craft = mine[oldName];
    if (craft) {
      delete mine[oldName];
      mine[newName] = { ...craft, name: newName };
      userCrafts.set(mine);
    }
  }

  /**
   * @param {string} name
   * @returns {boolean} true if loaded successfully
   */
  function loadCraft(name) {
    const craft = userCrafts.value[name];
    if (!craft) return false;

    const available = availableAntennas(settings.value, userAntennas.value);
    const validAntennas = craft.antennas.filter((slot) => available.has(slot.antenna));

    if (validAntennas.length === 0) return false;

    updateChain({ antennas: validAntennas, antennaIndex: 0 });
    return true;
  }

  /**
   * @returns {void}
   */
  function reset() {
    for (const key of [
      KEYS.settings,
      KEYS.chain,
      KEYS.userBodies,
      KEYS.userAntennas,
      KEYS.userCrafts,
    ]) {
      storage.removeItem(key);
    }
    settings.set({ ...DEFAULT_SETTINGS });
    chain.set({
      ...DEFAULT_CHAIN,
      antennas: DEFAULT_CHAIN.antennas.map((slot) => ({ ...slot })),
    });
    userBodies.set({});
    userAntennas.set({});
    userCrafts.set({});
  }

  return {
    settings,
    chain,
    userBodies,
    userAntennas,
    userCrafts,
    body,
    antennas,
    mam,
    selectedAntenna,
    availableAntennas: computed(() => availableAntennas(settings.value, userAntennas.value)),
    updateSettings,
    updateChain,
    addAntenna,
    removeAntenna,
    setAntenna,
    setQuantity,
    saveBody,
    removeBody,
    saveAntenna,
    removeAntennaDefinition,
    saveCraft,
    removeCraft,
    renameCraft,
    loadCraft,
    reset,
  };
}

/** @typedef {ReturnType<typeof createStore>} Store */
