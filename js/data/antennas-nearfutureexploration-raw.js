/**
 * NearFutureExploration antenna raw parameters extracted from part cfg files.
 * These use ModuleDataTransmitter (CommNet stock system).
 * Range and EC/s are computed at runtime based on user-selected target.
 *
 * @typedef {object} NearFutureExplorationAntennaRaw
 * @property {string} name           unique key, display name
 * @property {"omni"|"dish"} type    DIRECT=omni, RELAY=dish
 * @property {number} antennaPower   meters (raw cfg value)
 * @property {number} packetInterval seconds per packet
 * @property {number} packetSize     Mits per packet
 * @property {number} packetResourceCost EC per packet
 * @property {boolean} antennaCombinable
 * @property {number} antennaCombinableExponent default 0.75
 * @property {"NearFutureExploration"} source
 */

/** @type {readonly NearFutureExplorationAntennaRaw[]} */
export const NEAR_FUTURE_EXPLORATION_ANTENNAS_RAW = Object.freeze([
  // Rover / small direct antennas
  {
    name: "AX-4 Pointable Helical Antenna",
    type: "omni",
    antennaPower: 40000,
    packetInterval: 0.75,
    packetSize: 2,
    packetResourceCost: 8.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
  {
    name: "AX-5 Aerial Micro-Antenna",
    type: "omni",
    antennaPower: 150000,
    packetInterval: 0.75,
    packetSize: 2,
    packetResourceCost: 8.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
  {
    name: "AX-30 High Gain Micro-Antenna",
    type: "omni",
    antennaPower: 300000,
    packetInterval: 0.65,
    packetSize: 2,
    packetResourceCost: 10.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },

  // Phased array elements (direct, combinable exponent 1.0)
  {
    name: "PH-1 Phased Array Antenna Element",
    type: "omni",
    antennaPower: 125000,
    packetInterval: 0.4,
    packetSize: 2,
    packetResourceCost: 14.0,
    antennaCombinable: true,
    antennaCombinableExponent: 1.0,
    source: "NearFutureExploration",
  },
  {
    name: "PH-2 Phased Array Antenna Element",
    type: "omni",
    antennaPower: 200000,
    packetInterval: 0.4,
    packetSize: 2,
    packetResourceCost: 14.0,
    antennaCombinable: true,
    antennaCombinableExponent: 1.0,
    source: "NearFutureExploration",
  },
  {
    name: "PH-3 Phased Array Antenna Element",
    type: "omni",
    antennaPower: 800000,
    packetInterval: 0.4,
    packetSize: 3,
    packetResourceCost: 20.0,
    antennaCombinable: true,
    antennaCombinableExponent: 1.0,
    source: "NearFutureExploration",
  },

  // Phased arrays (relay)
  {
    name: "RA-X1 Phased Relay Antenna",
    type: "dish",
    antennaPower: 6000000,
    packetInterval: 0.5,
    packetSize: 3,
    packetResourceCost: 20.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.25,
    source: "NearFutureExploration",
  },
  {
    name: "RA-X2 Phased Relay Antenna",
    type: "dish",
    antennaPower: 10000000,
    packetInterval: 0.5,
    packetSize: 6,
    packetResourceCost: 35.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.25,
    source: "NearFutureExploration",
  },
  {
    name: "RA-X3 Phased Relay Antenna",
    type: "dish",
    antennaPower: 100000000,
    packetInterval: 0.5,
    packetSize: 8,
    packetResourceCost: 45.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.25,
    source: "NearFutureExploration",
  },

  // Geosat top deck antennas (direct)
  {
    name: "D-2 Spot Antenna",
    type: "omni",
    antennaPower: 2000000,
    packetInterval: 0.1,
    packetSize: 1,
    packetResourceCost: 6.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
  {
    name: "D-50 Large Spot Antenna",
    type: "omni",
    antennaPower: 50000000,
    packetInterval: 0.1,
    packetSize: 2,
    packetResourceCost: 6.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },

  // Relay antennas (TDRS-based)
  {
    name: "RA-0-8 Relay Antenna",
    type: "dish",
    antennaPower: 85000000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
  {
    name: "RA-5B Advanced Relay Antenna",
    type: "dish",
    antennaPower: 500000000,
    packetInterval: 0.6,
    packetSize: 3,
    packetResourceCost: 28.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
  {
    name: "RA-00-2 Micro-Relay Antenna",
    type: "dish",
    antennaPower: 2000000,
    packetInterval: 0.35,
    packetSize: 1,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },

  // Feeder antennas (very low power standalone, meant for reflectors)
  {
    name: "F-RA Relay Antenna Feed",
    type: "dish",
    antennaPower: 5000,
    packetInterval: 0.6,
    packetSize: 2,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.5,
    source: "NearFutureExploration",
  },
  {
    name: "F-DA Direct Antenna Feed",
    type: "omni",
    antennaPower: 5000,
    packetInterval: 0.6,
    packetSize: 2,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.5,
    source: "NearFutureExploration",
  },

  // High gain direct antennas
  {
    name: "DR-1 High Gain Antenna",
    type: "omni",
    antennaPower: 300000,
    packetInterval: 0.25,
    packetSize: 2,
    packetResourceCost: 10.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
  {
    name: "DR-3 Deployable High Gain Antenna",
    type: "omni",
    antennaPower: 500000,
    packetInterval: 0.25,
    packetSize: 4,
    packetResourceCost: 12.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
    source: "NearFutureExploration",
  },
]);

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
