/**
 * RSS (Real Solar System) CommNet range and EC calculations.
 * Pure functions operating on raw antenna parameters.
 * Uses RSS DSN power levels (20x stock) and RSS antenna power multiplier (20x stock).
 */

/** @type {Readonly<{level1: number, level2: number, level3: number}>} */
export const RSS_DSN_POWER = Object.freeze({
  level1: 5_000_000_000,
  level2: 500_000_000_000,
  level3: 50_000_000_000_000,
});

/** RSS multiplies all antenna power by 20 (from DSN_Ranges.cfg) */
export const RSS_ANTENNA_POWER_MULTIPLIER = 20;

/** @type {Readonly<{rangeModifier: number, DSNModifier: number}>} */
export const DEFAULT_MODIFIERS = Object.freeze({
  rangeModifier: 1.0,
  DSNModifier: 1.0,
});

/**
 * Compute EC per second from raw antenna parameters.
 * For Stock antennas: packetResourceCost / packetInterval
 * For RemoteTech antennas: energyCost (EC/s directly)
 * @param {{packetResourceCost?: number, packetInterval?: number, energyCost?: number}} antenna
 * @returns {number} EC/s
 */
export function computeECPerSecond(antenna) {
  if (antenna.energyCost !== undefined) {
    return antenna.energyCost;
  }
  return antenna.packetResourceCost / antenna.packetInterval;
}

/**
 * Apply range modifier to antenna power (includes RSS 20x multiplier).
 * @param {number} power - raw antennaPower in meters
 * @param {number} rangeModifier
 * @returns {number} modified power in meters
 */
export function applyRangeModifier(power, rangeModifier) {
  return power * rangeModifier * RSS_ANTENNA_POWER_MULTIPLIER;
}

/**
 * Apply DSN modifier to DSN power.
 * @param {number} dsnPower - raw DSN power in meters
 * @param {number} DSNModifier
 * @returns {number} modified DSN power in meters
 */
export function applyDSNModifier(dsnPower, DSNModifier) {
  return dsnPower * DSNModifier;
}

/**
 * Compute maximum range between two antennas (CommNet geometric mean formula).
 * @param {number} aPower - antenna A power in meters (modified)
 * @param {number} bPower - antenna B power in meters (modified)
 * @returns {number} range in kilometers
 */
export function computeRangeKm(aPower, bPower) {
  return Math.sqrt(aPower * bPower) / 1000;
}

/**
 * Compute combined power for multiple identical combinable antennas.
 * Formula: max * (sum / max) ^ exponent
 * @param {number} singlePower - power of one antenna (modified)
 * @param {number} count - number of antennas
 * @param {number} exponent - antennaCombinableExponent (default 0.75)
 * @returns {number} combined power in meters
 */
export function computeCombinedPower(singlePower, count, exponent = 0.75) {
  if (count <= 1) return singlePower;
  const sum = singlePower * count;
  const max = singlePower;
  return max * Math.pow(sum / max, exponent);
}

/**
 * Compute range from an antenna (or combined array) to a DSN level (RSS).
 * @param {{antennaPower: number, antennaCombinable: boolean, antennaCombinableExponent: number}} antenna
 * @param {"level1"|"level2"|"level3"} dsnLevel
 * @param {number} quantity - number of antennas
 * @param {object} [modifiers]
 * @param {number} [modifiers.rangeModifier=1.0]
 * @param {number} [modifiers.DSNModifier=1.0]
 * @returns {number} range in km
 */
export function rangeToDSN(antenna, dsnLevel, quantity = 1, modifiers = DEFAULT_MODIFIERS) {
  const aPower = applyRangeModifier(antenna.antennaPower, modifiers.rangeModifier);
  const combinedPower = antenna.antennaCombinable
    ? computeCombinedPower(aPower, quantity, antenna.antennaCombinableExponent)
    : aPower;
  const bPower = applyDSNModifier(RSS_DSN_POWER[dsnLevel], modifiers.DSNModifier);
  return computeRangeKm(combinedPower, bPower);
}

/**
 * Compute range between two identical antennas (relay-to-relay hop).
 * @param {{antennaPower: number, antennaCombinable: boolean, antennaCombinableExponent: number}} antenna
 * @param {number} quantity - number of antennas at each end
 * @param {number} [rangeModifier=1.0]
 * @returns {number} range in km
 */
export function rangeToIdentical(antenna, quantity = 1, rangeModifier = 1.0) {
  const aPower = applyRangeModifier(antenna.antennaPower, rangeModifier);
  const combinedPower = antenna.antennaCombinable
    ? computeCombinedPower(aPower, quantity, antenna.antennaCombinableExponent)
    : aPower;
  return computeRangeKm(combinedPower, combinedPower);
}

/**
 * Compute range between two different antennas.
 * @param {{antennaPower: number, antennaCombinable: boolean, antennaCombinableExponent: number}} antennaA
 * @param {{antennaPower: number, antennaCombinable: boolean, antennaCombinableExponent: number}} antennaB
 * @param {number} quantityA
 * @param {number} quantityB
 * @param {number} [rangeModifier=1.0]
 * @returns {number} range in km
 */
export function rangeBetween(
  antennaA,
  antennaB,
  quantityA = 1,
  quantityB = 1,
  rangeModifier = 1.0,
) {
  const powerA = applyRangeModifier(antennaA.antennaPower, rangeModifier);
  const powerB = applyRangeModifier(antennaB.antennaPower, rangeModifier);
  const combinedA = antennaA.antennaCombinable
    ? computeCombinedPower(powerA, quantityA, antennaA.antennaCombinableExponent)
    : powerA;
  const combinedB = antennaB.antennaCombinable
    ? computeCombinedPower(powerB, quantityB, antennaB.antennaCombinableExponent)
    : powerB;
  return computeRangeKm(combinedA, combinedB);
}
