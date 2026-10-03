/**
 * RealAntennas link budget calculator.
 * Pure functions for range, data rate, and EC calculations.
 * Based on RealAntennas source code (Physics.cs, Precompute.cs, RealAntenna.cs).
 */

/** @type {Readonly<{L: object, S: object, X: object, K: object}>} */
export const RA_BANDS = Object.freeze({
  L: { name: "L", techLevel: 0, frequency: 1.62e9, channelWidth: 31.5e3 },
  S: { name: "S", techLevel: 3, frequency: 2.25e9, channelWidth: 0.33e6 },
  X: { name: "X", techLevel: 7, frequency: 8.45e9, channelWidth: 1.36e6 },
  K: { name: "K", techLevel: 9, frequency: 26.25e9, channelWidth: 20e6 },
});

/** @type {Readonly<Record<string, object>>} */
export const RA_ENCODERS = Object.freeze({
  None: { name: "None", techLevel: 0, codingRate: 1, requiredEbN0: 10 },
  "Reed-Solomon 255/223": {
    name: "Reed-Solomon 255/223",
    techLevel: 3,
    codingRate: 0.8745,
    requiredEbN0: 6.1,
  },
  "Convolutional 7, 1/2": {
    name: "Convolutional 7, 1/2",
    techLevel: 6,
    codingRate: 0.5,
    requiredEbN0: 4.5,
  },
  "Turbo 1/2": { name: "Turbo 1/2", techLevel: 8, codingRate: 0.5, requiredEbN0: 1 },
});

/** @type {Readonly<Record<number, object>>} */
export const RA_TECH_LEVELS = Object.freeze({
  0: {
    level: 0,
    powerEfficiency: 0.0555 / 1000,
    reflectorEfficiency: 0.5,
    minDataRate: 4,
    maxDataRate: 4,
    maxPower: 20,
    massPerWatt: 1.6,
    baseMass: 34,
    basePower: 42,
    baseCost: 10,
    costPerWatt: 5,
    receiverNoiseTemp: 27000,
  },
  1: {
    level: 1,
    powerEfficiency: 0.0769 / 1000,
    reflectorEfficiency: 0.52,
    minDataRate: 4,
    maxDataRate: 4,
    maxPower: 30,
    massPerWatt: 1.34,
    baseMass: 31,
    basePower: 38,
    baseCost: 15,
    costPerWatt: 4,
    receiverNoiseTemp: 11500,
  },
  2: {
    level: 2,
    powerEfficiency: 0.1 / 1000,
    reflectorEfficiency: 0.54,
    minDataRate: 1,
    maxDataRate: 64,
    maxPower: 37,
    massPerWatt: 1.16,
    baseMass: 28,
    basePower: 34,
    baseCost: 25,
    costPerWatt: 3.5,
    receiverNoiseTemp: 7000,
  },
  3: {
    level: 3,
    powerEfficiency: 0.1304 / 1000,
    reflectorEfficiency: 0.56,
    minDataRate: 8,
    maxDataRate: 64,
    maxPower: 37,
    massPerWatt: 1,
    baseMass: 25,
    basePower: 29,
    baseCost: 35,
    costPerWatt: 3,
    receiverNoiseTemp: 5800,
  },
  4: {
    level: 4,
    powerEfficiency: 0.1667 / 1000,
    reflectorEfficiency: 0.58,
    minDataRate: 8,
    maxDataRate: 4096,
    maxPower: 40,
    massPerWatt: 0.86,
    baseMass: 22,
    basePower: 25.7,
    baseCost: 45,
    costPerWatt: 2.5,
    receiverNoiseTemp: 4500,
  },
  5: {
    level: 5,
    powerEfficiency: 0.2222 / 1000,
    reflectorEfficiency: 0.6,
    minDataRate: 16,
    maxDataRate: 16384,
    maxPower: 43,
    massPerWatt: 0.75,
    baseMass: 19,
    basePower: 23,
    baseCost: 60,
    costPerWatt: 2,
    receiverNoiseTemp: 3000,
  },
  6: {
    level: 6,
    powerEfficiency: 0.25 / 1000,
    reflectorEfficiency: 0.62,
    minDataRate: 16,
    maxDataRate: 131072,
    maxPower: 43,
    massPerWatt: 0.6444,
    baseMass: 16,
    basePower: 21.4,
    baseCost: 75,
    costPerWatt: 1.7,
    receiverNoiseTemp: 1540,
  },
  7: {
    level: 7,
    powerEfficiency: 0.3 / 1000,
    reflectorEfficiency: 0.64,
    minDataRate: 16,
    maxDataRate: 262144,
    maxPower: 46,
    massPerWatt: 0.6,
    baseMass: 13,
    basePower: 18.3,
    baseCost: 90,
    costPerWatt: 1.2,
    receiverNoiseTemp: 1100,
  },
  8: {
    level: 8,
    powerEfficiency: 0.3724 / 1000,
    reflectorEfficiency: 0.66,
    minDataRate: 16,
    maxDataRate: 262144,
    maxPower: 46,
    massPerWatt: 0.54,
    baseMass: 10,
    basePower: 14.3,
    baseCost: 110,
    costPerWatt: 0.5,
    receiverNoiseTemp: 500,
  },
  9: {
    level: 9,
    powerEfficiency: 0.4397 / 1000,
    reflectorEfficiency: 0.68,
    minDataRate: 16,
    maxDataRate: 134217728,
    maxPower: 50,
    massPerWatt: 0.1418,
    baseMass: 7.5,
    basePower: 11.7,
    baseCost: 125,
    costPerWatt: 0.4,
    receiverNoiseTemp: 200,
  },
});

/** Boltzmann constant in dBm/Hz/K */
const BOLTZMANN_DBM = -228.599168683097 + 30; // -198.599...
const PATH_LOSS_CONSTANT = -147.552435289803;
const _MAX_POINTING_LOSS = 200;
const _MAX_OMNI_GAIN = 5;
const C = 2.998e8;

/**
 * Convert linear to dB
 * @param {number} x
 * @returns {number}
 */
function db(x) {
  return 10 * Math.log10(x);
}

/**
 * Convert dB to linear
 * @param {number} db
 * @returns {number}
 */
function linear(db) {
  return Math.pow(10, db / 10);
}

/**
 * Gain from dish diameter (dBi)
 * @param {number} diameter - meters
 * @param {number} freq - Hz
 * @param {number} efficiency - 0-1
 * @returns {number} dBi
 */
export function gainFromDishDiameter(diameter, freq, efficiency = 1) {
  if (diameter <= 0 || efficiency <= 0) return 0;
  const wavelength = C / freq;
  return db((9.87 * efficiency * diameter * diameter) / (wavelength * wavelength));
}

/**
 * Gain from reference (for omnis)
 * @param {number} refGain - dBi
 * @param {number} refFreq - MHz
 * @param {number} newFreq - Hz
 * @returns {number} dBi
 */
export function gainFromReference(refGain, refFreq, newFreq) {
  if (refGain <= 0) return 0;
  if (refGain <= 5) return refGain; // Omni
  return refGain + db(newFreq / (refFreq * 1e6));
}

/**
 * Beamwidth in degrees (full side-to-side HPBW)
 * @param {number} gain - dBi
 * @returns {number} degrees
 */
export function beamwidth(gain) {
  return Math.sqrt(52525 / linear(gain));
}

/**
 * Free-space path loss (dB)
 * @param {number} distance - meters
 * @param {number} frequency - Hz
 * @returns {number} dB
 */
export function pathLoss(distance, frequency) {
  const df = Math.max(distance * frequency, 0.1);
  return 20 * Math.log10(df) + PATH_LOSS_CONSTANT;
}

/**
 * Pointing loss (dB) - from RealAntennas lookup table
 * @param {number} angle - degrees
 * @param {number} beamwidth - degrees
 * @returns {number} dB loss
 */
export function pointingLoss(angle, beamwidth) {
  const norm = angle / beamwidth;
  if (norm > 1) return 200; // MaxPointingLoss
  if (norm < 0.14) return lerp(0, 0.25, norm / 0.14);
  if (norm < 0.2) return lerp(0.25, 0.5, (norm - 0.14) / 0.06);
  if (norm < 0.29) return lerp(0.5, 1, (norm - 0.2) / 0.09);
  if (norm < 0.41) return lerp(1, 2, (norm - 0.29) / 0.12);
  if (norm < 0.5) return lerp(2, 3, (norm - 0.41) / 0.09);
  if (norm < 0.57) return lerp(3, 4, (norm - 0.5) / 0.07);
  if (norm < 0.64) return lerp(4, 4.5, (norm - 0.57) / 0.07);
  if (norm < 0.7) return lerp(4.5, 5, (norm - 0.64) / 0.06);
  if (norm < 0.76) return lerp(5, 6, (norm - 0.7) / 0.06);
  if (norm < 0.81) return lerp(6, 7, (norm - 0.76) / 0.06);
  if (norm < 0.86) return lerp(7, 8, (norm - 0.81) / 0.05);
  return lerp(8, 9, (norm - 0.86) / 0.14);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Compute antenna gain (dBi)
 * @param {object} antenna
 * @returns {number} dBi
 */
export function computeGain(antenna) {
  if (antenna.antennaDiameter > 0) {
    const band = RA_BANDS[antenna.rfBand];
    if (!band) return 0;
    return gainFromDishDiameter(
      antenna.antennaDiameter,
      band.frequency,
      RA_TECH_LEVELS[antenna.techLevel].reflectorEfficiency,
    );
  }
  if (antenna.referenceGain > 0) {
    const band = RA_BANDS[antenna.rfBand];
    if (!band) return 0;
    return gainFromReference(antenna.referenceGain, antenna.referenceFrequency, band.frequency);
  }
  return 0;
}

/**
 * Compute EC/s for RealAntennas antenna
 * @param {object} antenna
 * @param {number} [consumptionMultiplier=1.0]
 * @param {number} [plannerActiveTxTime=0] - fraction of time actively transmitting
 * @returns {number} EC/s
 */
export function computeECPerSecond(antenna, consumptionMultiplier = 1.0, plannerActiveTxTime = 0) {
  const tech = RA_TECH_LEVELS[antenna.techLevel];
  if (!tech) return 0;
  // Idle power (kW) = BasePower (W) / 1000
  // Active power = 10^(TxPower/10) (mW) / PowerEfficiency * 1e-6 (mW → kW)
  // C#: PowerDrawLinear = 10^(TxPower/10) / PowerEfficiency (mW)
  // C#: ec = IdlePowerDraw + PowerDrawLinear * 1e-6 * plannerActiveTxTime
  const idlePower = tech.basePower / 1000; // kW
  const activePower = (Math.pow(10, antenna.txPower / 10) / tech.powerEfficiency) * 1e-6; // kW
  // EC/s = (idle + active * dutyCycle) * consumptionMultiplier
  return (idlePower + activePower * plannerActiveTxTime) * consumptionMultiplier;
}

/**
 * Compute received power (dBm)
 * @param {object} tx - transmitter antenna
 * @param {object} rx - receiver antenna
 * @param {number} distance - meters
 * @returns {number} dBm
 */
export function computeReceivedPower(tx, rx, distance) {
  const txGain = computeGain(tx);
  const rxGain = computeGain(rx);
  const band = RA_BANDS[tx.rfBand];
  if (!band || rx.rfBand !== tx.rfBand) return -Infinity;

  const fspl = pathLoss(distance, band.frequency);
  const txBeamwidth = beamwidth(txGain);
  const rxBeamwidth = beamwidth(rxGain);
  const txPointLoss = pointingLoss(0, txBeamwidth); // boresight = 0 deg
  const rxPointLoss = pointingLoss(0, rxBeamwidth);

  // Received power = TxPower + TxGain - PathLoss - PointingLossTx - PointingLossRx + RxGain
  return tx.txPower + txGain - fspl - txPointLoss - rxPointLoss + rxGain;
}

/**
 * Compute noise temperature (K)
 * @param {object} rx - receiver antenna
 * @param {number} _distance - meters
 * @param {object} [_targetBody] - target celestial body
 * @returns {number} noise temperature in K
 */
export function computeNoiseTemperature(rx, _distance, _targetBody) {
  const tech = RA_TECH_LEVELS[rx.techLevel];
  if (!tech) return 290;

  // Antenna microwave temp
  const amt = rx.amwTemp || tech.receiverNoiseTemp;

  // Cosmic background (simplified)
  const cosmic = 2.725;

  // For now, simplified - RealAntennas has complex body/atmosphere noise
  // This is a placeholder that could be expanded
  return amt + cosmic;
}

/**
 * Compute maximum data rate for a link (bits/sec)
 * @param {object} tx - transmitter
 * @param {object} rx - receiver
 * @param {number} distance - meters
 * @returns {number} bps
 */
export function computeDataRate(tx, rx, distance) {
  const rxPower = computeReceivedPower(tx, rx, distance);
  if (rxPower === -Infinity) return 0;

  const noiseTemp = computeNoiseTemperature(rx, distance);
  const n0 = BOLTZMANN_DBM + db(noiseTemp); // dBm/Hz

  const encoder = RA_ENCODERS[tx.encoder];
  if (!encoder) return 0;

  const band = RA_BANDS[tx.rfBand];
  if (!band) return 0;

  // Eb/N0 = RxPower - N0 - 10*log10(DataRate)
  // Required Eb/N0 from encoder
  // DataRate = RxPower - N0 - RequiredEbN0
  const _maxEbN0 = rxPower - n0 - encoder.requiredEbN0;

  // Simplified: use max theoretical rate
  // Real implementation does complex modulation selection
  return 0; // Placeholder - full implementation requires iteration
}

/**
 * Compute maximum range for a given data rate (meters)
 * @param {object} _tx - transmitter
 * @param {object} _rx - receiver
 * @param {number} _minDataRate - minimum required bps
 * @returns {number} meters
 */
export function computeRangeForDataRate(_tx, _rx, _minDataRate) {
  // This requires iterative solving - placeholder
  return 0;
}

/**
 * Compute link budget details for debugging
 * @param {object} tx
 * @param {object} rx
 * @param {number} distance - meters
 * @returns {object}
 */
export function computeLinkBudget(tx, rx, distance) {
  const txGain = computeGain(tx);
  const rxGain = computeGain(rx);
  const band = RA_BANDS[tx.rfBand];
  if (!band || rx.rfBand !== tx.rfBand) {
    return {
      txGain,
      rxGain,
      fspl: NaN,
      txPointLoss: NaN,
      rxPointLoss: NaN,
      rxPower: -Infinity,
      distance: distance / 1000,
    };
  }

  const fspl = pathLoss(distance, band.frequency);
  const txBeamwidth = beamwidth(txGain);
  const rxBeamwidth = beamwidth(rxGain);
  const txPointLoss = pointingLoss(0, txBeamwidth);
  const rxPointLoss = pointingLoss(0, rxBeamwidth);
  const rxPower = tx.txPower + txGain - fspl - txPointLoss - rxPointLoss + rxGain;

  return {
    txGain,
    rxGain,
    fspl,
    txPointLoss,
    rxPointLoss,
    rxPower,
    distance: distance / 1000, // km
  };
}

/**
 * Link budget for antenna to ground station (Mission Control)
 * @param {object} _antenna
 * @param {object} _settings
 * @returns {object} { rangeKm, rxPowerDbm, dataRateBps }
 */
export function linkToMissionControl(_antenna, _settings) {
  // Mission Control ground station (from Default_Settings.cfg)
  // Level 1: 75 Mm omni, Level 2: 75 Mm omni, Level 3: 75 Mm omni (upgradable)
  // For simplicity, use a representative ground station
  const _mcOmni = 75e6; // meters
  const _mcGain = 40; // dBi (approx for 70m dish)
  const _mcTech = RA_TECH_LEVELS[9]; // Best tech for KSC

  const _mcAntenna = {
    antennaDiameter: 70, // 70m dish
    referenceGain: 0,
    referenceFrequency: 0,
    txPower: 60,
    techLevel: 9,
    rfBand: "K",
    amwTemp: 20,
    encoder: "Turbo 1/2",
    canTarget: true,
  };

  // Compute range for various data rates
  // This is a simplified version - real implementation needs iteration
  return {
    rangeKm: 0,
    rxPowerDbm: 0,
    dataRateBps: 0,
  };
}
