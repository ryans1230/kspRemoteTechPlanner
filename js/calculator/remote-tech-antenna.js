/**
 * RemoteTech antenna raw parameters extracted from ModuleRTAntenna cfg files.
 * These are the direct ModuleRTAntenna field values.
 * Range and EC/s are computed at runtime based on user-selected target and settings.
 *
 * @typedef {object} RemoteTechAntennaRaw
 * @property {string} name           unique key, display name
 * @property {"omni"|"dish"} type    OmniRange>0=omni, DishRange>0=dish
 * @property {number} omniRange      meters (Mode1OmniRange from cfg, 0 if dish-only)
 * @property {number} dishRange      meters (Mode1DishRange from cfg, 0 if omni-only)
 * @property {number} energyCost     EC/s (EnergyCost from cfg)
 * @property {number} dishAngle      degrees (DishAngle from cfg, 0 for omni)
 * @property {number} maxQ           max dynamic pressure kPa (MaxQ from cfg, -1 if none)
 * @property {boolean} combinable    always true for RemoteTech
 * @property {number} combinableExponent default 0.75 (not used by RT, but for compat)
 * @property {"RemoteTech"} source
 * @property {boolean} [hidden]      legacy save compat
 */

/** @type {readonly RemoteTechAntennaRaw[]} */
export const REMOTE_TECH_ANTENNAS_RAW = Object.freeze([
  // Omni antennas
  {
    name: "Reflectron DP-10",
    type: "omni",
    omniRange: 500000,
    dishRange: 0,
    energyCost: 0.01,
    dishAngle: 0,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },
  {
    name: "CommTech EXP-VR-2T",
    type: "omni",
    omniRange: 3000000,
    dishRange: 0,
    energyCost: 0.18,
    dishAngle: 0,
    maxQ: 6000,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },
  {
    name: "Communotron 32",
    type: "omni",
    omniRange: 5000000,
    dishRange: 0,
    energyCost: 0.6,
    dishAngle: 0,
    maxQ: 3000,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },

  // Dish antennas
  {
    name: "Reflectron KR-7",
    type: "dish",
    omniRange: 0,
    dishRange: 90000000,
    energyCost: 0.82,
    dishAngle: 25.0,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },
  {
    name: "Reflectron KR-14",
    type: "dish",
    omniRange: 0,
    dishRange: 60000000000,
    energyCost: 0.93,
    dishAngle: 0.04,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },
  {
    name: "CommTech-1",
    type: "dish",
    omniRange: 0,
    dishRange: 350000000000,
    energyCost: 2.6,
    dishAngle: 0.006,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },
  {
    name: "Reflectron GX-128",
    type: "dish",
    omniRange: 0,
    dishRange: 400000000000,
    energyCost: 2.8,
    dishAngle: 0.005,
    maxQ: 6000,
    combinable: true,
    combinableExponent: 0.75,
    source: "RemoteTech",
  },
]);

/**
 * Default RemoteTech settings (from Default_Settings.cfg)
 */
export const REMOTE_TECH_DEFAULTS = Object.freeze({
  RangeMultiplier: 1.0,
  ConsumptionMultiplier: 1.0,
  MissionControlRangeMultiplier: 1.0,
  OmniRangeClampFactor: 100,
  DishRangeClampFactor: 1000,
  MultipleAntennaMultiplier: 0,
  RangeModelType: "Standard", // "Standard" or "Root"
  SignalDelay: false,
  SpeedOfLight: 299792458, // m/s
});

/**
 * Ground station (Mission Control) default antenna (from Default_Settings.cfg)
 * Omni = 75,000,000 m, upgradeable to 4M, 30M, 75M
 */
export const MISSION_CONTROL = Object.freeze({
  name: "Mission Control (KSC)",
  omniRange: 75000000,
  dishRange: 0,
  upgradeableOmni: [4000000, 30000000, 75000000],
});

/**
 * Compute EC/s for RemoteTech antenna
 * @param {{energyCost: number}} antenna
 * @param {number} [consumptionMultiplier=1.0]
 * @returns {number} EC/s
 */
export function computeECPerSecond(antenna, consumptionMultiplier = 1.0) {
  return antenna.energyCost * consumptionMultiplier;
}

/**
 * Apply RangeMultiplier to antenna ranges
 * @param {{omniRange: number, dishRange: number}} antenna
 * @param {number} rangeMultiplier
 * @returns {{omniRange: number, dishRange: number}}
 */
export function applyRangeMultiplier(antenna, rangeMultiplier) {
  return {
    omniRange: antenna.omniRange * rangeMultiplier,
    dishRange: antenna.dishRange * rangeMultiplier,
  };
}

/**
 * Apply MultipleAntennaMultiplier bonus to omni antennas
 * bonus = (sum of all omni ranges - max omni range) * MultipleAntennaMultiplier
 * @param {number} maxOmni - the max single omni range
 * @param {number} totalOmni - sum of all omni ranges on the vessel
 * @param {number} multiplier - MultipleAntennaMultiplier (0 to 1)
 * @returns {number} bonus to add to each omni range
 */
export function computeMultipleAntennaBonus(maxOmni, totalOmni, multiplier) {
  if (multiplier <= 0) return 0;
  return (totalOmni - maxOmni) * multiplier;
}

/**
 * Standard Range Model: MaxDistance = Min(r1, r2)
 * @param {number} r1
 * @param {number} r2
 * @returns {number} max distance in meters
 */
export function standardMaxDistance(r1, r2) {
  return Math.min(r1, r2);
}

/**
 * Root/Addivite Range Model: MaxDistance = Min(r1, r2) + Sqrt(r1 * r2)
 * @param {number} r1
 * @param {number} r2
 * @returns {number} max distance in meters
 */
export function rootMaxDistance(r1, r2) {
  return Math.min(r1, r2) + Math.sqrt(r1 * r2);
}

/**
 * Get the MaxDistance function for a given range model type
 * @param {"Standard"|"Root"} modelType
 * @returns {(r1:number, r2:number)=>number}
 */
export function getMaxDistanceFn(modelType) {
  return modelType === "Root" ? rootMaxDistance : standardMaxDistance;
}

/**
 * Compute max range between two antennas with clamp factors
 * @param {number} range1 - range of antenna 1 (meters)
 * @param {number} clamp1 - clamp factor for antenna 1 (e.g., 100 for omni, 1000 for dish)
 * @param {number} range2 - range of antenna 2 (meters)
 * @param {number} clamp2 - clamp factor for antenna 2
 * @param {(r1:number, r2:number)=>number} maxDistanceFn
 * @returns {number} max range in meters
 */
export function checkRange(range1, clamp1, range2, clamp2, maxDistanceFn) {
  const maxDist = maxDistanceFn(range1, range2);
  return Math.min(maxDist, range1 * clamp1, range2 * clamp2);
}

/**
 * Compute range between two RemoteTech antennas
 * @param {{omniRange: number, dishRange: number}} antennaA - with RangeMultiplier applied
 * @param {{omniRange: number, dishRange: number}} antennaB - with RangeMultiplier applied
 * @param {object} settings
 * @param {number} settings.OmniRangeClampFactor
 * @param {number} settings.DishRangeClampFactor
 * @param {"Standard"|"Root"} settings.RangeModelType
 * @returns {number} max range in meters
 */
export function computeRange(antennaA, antennaB, settings) {
  const maxDistanceFn = getMaxDistanceFn(settings.RangeModelType);
  const omniClamp = settings.OmniRangeClampFactor;
  const dishClamp = settings.DishRangeClampFactor;

  const aOmni = antennaA.omniRange;
  const aDish = antennaA.dishRange;
  const bOmni = antennaB.omniRange;
  const bDish = antennaB.dishRange;

  // Four possible connections:
  // 1. Omni -> Omni
  const omniOmni = checkRange(aOmni, omniClamp, bOmni, omniClamp, maxDistanceFn);
  // 2. Omni -> Dish
  const omniDish = checkRange(aOmni, omniClamp, bDish, dishClamp, maxDistanceFn);
  // 3. Dish -> Omni
  const dishOmni = checkRange(aDish, dishClamp, bOmni, omniClamp, maxDistanceFn);
  // 4. Dish -> Dish
  const dishDish = checkRange(aDish, dishClamp, bDish, dishClamp, maxDistanceFn);

  return Math.max(omniOmni, omniDish, dishOmni, dishDish);
}

/**
 * Compute range from antenna to Mission Control (ground station)
 * @param {{omniRange: number, dishRange: number}} antenna - with RangeMultiplier applied
 * @param {object} settings
 * @param {number} settings.OmniRangeClampFactor
 * @param {number} settings.DishRangeClampFactor
 * @param {"Standard"|"Root"} settings.RangeModelType
 * @param {number} [missionControlOmni=75000000] - ground station omni range
 * @returns {number} max range in meters
 */
export function rangeToMissionControl(antenna, settings, missionControlOmni = 75000000) {
  const maxDistanceFn = getMaxDistanceFn(settings.RangeModelType);
  const omniClamp = settings.OmniRangeClampFactor;
  const dishClamp = settings.DishRangeClampFactor;

  const aOmni = antenna.omniRange;
  const aDish = antenna.dishRange;
  const bOmni = missionControlOmni;

  // Only Omni -> Omni and Dish -> Omni are possible
  // Mission Control is omni-only, so both connections use omniClamp for the target
  const omniOmni = checkRange(aOmni, omniClamp, bOmni, omniClamp, maxDistanceFn);
  const dishOmni = checkRange(aDish, dishClamp, bOmni, omniClamp, maxDistanceFn);

  return Math.max(omniOmni, dishOmni);
}

/**
 * Convert meters to kilometers
 * @param {number} meters
 * @returns {number} kilometers
 */
export function metersToKm(meters) {
  return meters / 1000;
}
