/**
 * Stock KSP antenna raw parameters extracted from part cfg files.
 * These are the direct ModuleDataTransmitter field values.
 * Range and EC/s are computed at runtime based on user-selected target.
 *
 * @typedef {object} StockAntennaRaw
 * @property {string} name           unique key, display name
 * @property {"omni"|"dish"} type    DIRECT=omni, RELAY=dish
 * @property {number} antennaPower   meters (raw cfg value)
 * @property {number} packetInterval seconds per packet
 * @property {number} packetSize     Mits per packet
 * @property {number} packetResourceCost EC per packet
 * @property {boolean} antennaCombinable
 * @property {number} antennaCombinableExponent default 0.75
 * @property {"Squad"} source
 * @property {boolean} [hidden]      legacy save compat
 */

/** @type {readonly StockAntennaRaw[]} */
export const STOCK_ANTENNAS_RAW = Object.freeze([
  {
    name: "Communotron 16-S",
    type: "omni",
    antennaPower: 500000,
    packetInterval: 0.6,
    packetSize: 2,
    packetResourceCost: 12.0,
    antennaCombinable: false,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "Communotron 16",
    type: "omni",
    antennaPower: 500000,
    packetInterval: 0.6,
    packetSize: 2,
    packetResourceCost: 12.0,
    antennaCombinable: true,
    antennaCombinableExponent: 1.0,
    source: "Squad",
  },
  {
    name: "Comms DTS-M1",
    type: "omni",
    antennaPower: 2000000000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 12.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "Communotron HG-55",
    type: "omni",
    antennaPower: 15000000000,
    packetInterval: 0.15,
    packetSize: 3,
    packetResourceCost: 20.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "Communotron HG-5",
    type: "dish",
    antennaPower: 5000000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 18.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "RA-100",
    type: "dish",
    antennaPower: 100000000000,
    packetInterval: 0.35,
    packetSize: 4,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "RA-15",
    type: "dish",
    antennaPower: 15000000000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "RA-2",
    type: "dish",
    antennaPower: 2000000000,
    packetInterval: 0.35,
    packetSize: 1,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },
  {
    name: "Communotron 88-88",
    type: "omni",
    antennaPower: 100000000000,
    packetInterval: 0.1,
    packetSize: 2,
    packetResourceCost: 20.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
  },

  // Hidden legacy entries (duplicates for save compatibility)
  {
    name: "HG-5 High Gain Antenna",
    type: "dish",
    antennaPower: 5000000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 18.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
    hidden: true,
  },
  {
    name: "RA-2 Relay Antenna",
    type: "dish",
    antennaPower: 2000000000,
    packetInterval: 0.35,
    packetSize: 1,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
    hidden: true,
  },
  {
    name: "RA-15 Relay Antenna",
    type: "dish",
    antennaPower: 15000000000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
    hidden: true,
  },
  {
    name: "RA-100 Relay Antenna",
    type: "dish",
    antennaPower: 100000000000,
    packetInterval: 0.35,
    packetSize: 4,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "Squad",
    hidden: true,
  },
]);

/**
 * DSN Power Levels (meters)
 * From GameVariables.GetDSNRange(level)
 */
export const DSN_POWER = Object.freeze({
  level1: 2000000000, // 2 Gm
  level2: 50000000000, // 50 Gm
  level3: 250000000000, // 250 Gm
});

/**
 * Default CommNet modifiers (user-adjustable in settings)
 */
export const COMMNET_DEFAULTS = Object.freeze({
  rangeModifier: 1.0,
  DSNModifier: 1.0,
});

/**
 * Compute EC/s from raw params
 */
export function computeECPerSecond(antenna) {
  return antenna.packetResourceCost / antenna.packetInterval;
}

/**
 * Compute max range to a target (meters → km)
 * @param {number} aPower - antenna power (already modified by rangeModifier)
 * @param {number} bPower - target power (DSN or other antenna, with modifiers)
 * @returns {number} range in km
 */
export function computeRangeKm(aPower, bPower) {
  return Math.sqrt(aPower * bPower) / 1000;
}

/**
 * Compute combined power for multiple identical combinable antennas
 * @param {number} singlePower
 * @param {number} count
 * @param {number} exponent
 * @returns {number}
 */
export function computeCombinedPower(singlePower, count, exponent = 0.75) {
  if (count <= 1) return singlePower;
  const sum = singlePower * count;
  const max = singlePower;
  return max * Math.pow(sum / max, exponent);
}
