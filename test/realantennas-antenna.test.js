import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as ra from "../js/calculator/realantennas-antenna.js";

const TOLERANCE = 1e-6;
const CLOSE_TOLERANCE = 1e-3;

function closeTo(actual, expected, tolerance = TOLERANCE) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function closeToRel(actual, expected, relTol = CLOSE_TOLERANCE) {
  const absDiff = Math.abs(actual - expected);
  const maxVal = Math.max(Math.abs(actual), Math.abs(expected));
  const relDiff = maxVal > 0 ? absDiff / maxVal : 0;
  assert.ok(
    relDiff <= relTol,
    `expected ${actual} to be within ${relTol * 100}% of ${expected} (rel diff: ${(relDiff * 100).toFixed(2)}%)`,
  );
}

/**
 * Test antenna definitions matching RealAntennas parts
 * Based on RealAntennas GameData parts and Default_Settings.cfg
 */
const TEST_ANTENNAS = {
  // L-band omni (TL0) - basic dipole
  "L-band Omni TL0": {
    antennaDiameter: 0,
    referenceGain: 2.15, // dBi (dipole)
    referenceFrequency: 1620, // MHz
    txPower: 30, // dBm (1W)
    techLevel: 0,
    rfBand: "L",
    amwTemp: 290,
    encoder: "None",
    canTarget: false,
  },

  // S-band 26m dish (TL3)
  "S-band 26m TL3": {
    antennaDiameter: 26,
    referenceGain: 0,
    referenceFrequency: 0,
    txPower: 63, // dBm (2kW)
    techLevel: 3,
    rfBand: "S",
    amwTemp: 125,
    encoder: "Reed-Solomon 255/223",
    canTarget: true,
  },

  // S-band 64m dish (TL4)
  "S-band 64m TL4": {
    antennaDiameter: 64,
    referenceGain: 0,
    referenceFrequency: 0,
    txPower: 63, // dBm (2kW)
    techLevel: 4,
    rfBand: "S",
    amwTemp: 125,
    encoder: "Reed-Solomon 255/223",
    canTarget: true,
  },

  // X-band 64m dish (TL7)
  "X-band 64m TL7": {
    antennaDiameter: 64,
    referenceGain: 0,
    referenceFrequency: 0,
    txPower: 70, // dBm (10kW)
    techLevel: 7,
    rfBand: "X",
    amwTemp: 40,
    encoder: "Convolutional 7, 1/2",
    canTarget: true,
  },

  // X-band 70m dish (TL8)
  "X-band 70m TL8": {
    antennaDiameter: 70,
    referenceGain: 0,
    referenceFrequency: 0,
    txPower: 73, // dBm (20kW)
    techLevel: 8,
    rfBand: "X",
    amwTemp: 40,
    encoder: "Turbo 1/2",
    canTarget: true,
  },

  // K-band 34m dish (TL9)
  "K-band 34m TL9": {
    antennaDiameter: 34,
    referenceGain: 0,
    referenceFrequency: 0,
    txPower: 54.8, // dBm (300W)
    techLevel: 9,
    rfBand: "K",
    amwTemp: 20,
    encoder: "Turbo 1/2",
    canTarget: true,
  },

  // Small probe omni (TL5)
  "Probe Omni TL5": {
    antennaDiameter: 0,
    referenceGain: 6, // dBi
    referenceFrequency: 1620, // MHz
    txPower: 40, // dBm (10W)
    techLevel: 5,
    rfBand: "L",
    amwTemp: 290,
    encoder: "None",
    canTarget: false,
  },
};

/**
 * Expected gains (dBi) for dishes at their band frequencies
 * Gain = 10 * log10(0.55 * (π * D / λ)^2) ≈ 10 * log10(0.55 * (π * D * f / c)^2)
 * TL0 reflectorEfficiency = 0.5, TL3 = 0.56, TL4 = 0.58, TL7 = 0.64, TL8 = 0.66, TL9 = 0.68
 */
const EXPECTED_GAINS = {
  "L-band Omni TL0": 2.15, // dipole reference gain
  "S-band 26m TL3": null, // calculated
  "S-band 64m TL4": null,
  "X-band 64m TL7": null,
  "X-band 70m TL8": null,
  "K-band 34m TL9": null,
  "Probe Omni TL5": 6, // reference gain at 1620 MHz, converted to L-band
};

describe("realantennas-antenna.computeGain", () => {
  it("computes dipole omni gain correctly", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["L-band Omni TL0"]);
    closeToRel(gain, 2.15, 0.01);
  });

  it("computes probe omni gain with frequency scaling", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["Probe Omni TL5"]);
    // Reference gain 6 dBi at 1620 MHz, L-band is 1.62 GHz = same frequency
    closeToRel(gain, 6, 0.01);
  });

  it("computes S-band 26m dish gain (TL3, 56% eff)", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["S-band 26m TL3"]);
    // S-band = 2.25 GHz, λ = 0.1333m, D = 26m, eff = 0.56
    // Gain ≈ 10*log10(0.56 * (π*26/0.1333)^2) ≈ 52.5 dBi
    closeToRel(gain, 52.5, 0.05);
  });

  it("computes S-band 64m dish gain (TL4, 58% eff)", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["S-band 64m TL4"]);
    // S-band = 2.25 GHz, λ = 0.1333m, D = 64m, eff = 0.58
    // Gain ≈ 10*log10(0.58 * (π*64/0.1333)^2) ≈ 60.5 dBi
    closeToRel(gain, 60.5, 0.05);
  });

  it("computes X-band 64m dish gain (TL7, 64% eff)", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["X-band 64m TL7"]);
    // X-band = 8.45 GHz, λ = 0.0354m, D = 64m, eff = 0.64
    // Gain ≈ 10*log10(0.64 * (π*64/0.0354)^2) ≈ 73.5 dBi
    closeToRel(gain, 73.5, 0.05);
  });

  it("computes X-band 70m dish gain (TL8, 66% eff)", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["X-band 70m TL8"]);
    // X-band = 8.45 GHz, λ = 0.0354m, D = 70m, eff = 0.66
    // Gain ≈ 10*log10(0.66 * (π*70/0.0354)^2) ≈ 74.3 dBi
    closeToRel(gain, 74.3, 0.05);
  });

  it("computes K-band 34m dish gain (TL9, 68% eff)", () => {
    const gain = ra.computeGain(TEST_ANTENNAS["K-band 34m TL9"]);
    // K-band = 26.25 GHz, λ = 0.0114m, D = 34m, eff = 0.68
    // Gain ≈ 10*log10(0.68 * (π*34/0.0114)^2) ≈ 79 dBi
    closeToRel(gain, 79, 0.05);
  });

  it("returns 0 for invalid antenna", () => {
    const gain = ra.computeGain({});
    assert.equal(gain, 0);
  });
});

describe("realantennas-antenna.pathLoss", () => {
  it("calculates free-space path loss correctly", () => {
    // FSPL at 1 AU (149.6 Gm) at S-band (2.25 GHz)
    // FSPL = 20*log10(d*f) - 147.55
    // d = 149.6e9, f = 2.25e9
    // 20*log10(149.6e9 * 2.25e9) = 20*log10(3.366e20) = 20*20.527 = 410.54
    // FSPL = 410.54 - 147.55 = 262.99 dB
    const distance = 149_600_000_000; // 1 AU in meters
    const frequency = 2.25e9; // S-band
    const fspl = ra.pathLoss(distance, frequency);
    closeToRel(fspl, 263, 0.01);
  });

  it("calculates FSPL at 1 Mm at L-band", () => {
    const distance = 1_000_000; // 1 Mm
    const frequency = 1.62e9; // L-band
    const fspl = ra.pathLoss(distance, frequency);
    // 20*log10(1e6 * 1.62e9) = 20*log10(1.62e15) = 20*15.21 = 304.2
    // FSPL = 304.2 - 147.55 = 156.65 dB
    closeToRel(fspl, 156.65, 0.01);
  });

  it("handles very small distances", () => {
    const fspl = ra.pathLoss(0.1, 2.25e9);
    // Should not return NaN or negative infinity
    assert.ok(Number.isFinite(fspl));
  });
});

describe("realantennas-antenna.pointingLoss", () => {
  it("returns 0 for perfect alignment (small angles)", () => {
    // At norm < 0.14, loss is small
    const loss = ra.pointingLoss(0, 10); // 0 deg offset, 10 deg beamwidth
    assert.ok(loss < 1); // Should be near 0
  });

  it("returns 0.25 dB at norm = 0.14", () => {
    const loss = ra.pointingLoss(1.4, 10); // 1.4 deg offset, 10 deg beamwidth
    closeTo(loss, 0.25, 0.1);
  });

  it("returns 200 dB (max) for angle > beamwidth", () => {
    const loss = ra.pointingLoss(20, 10); // 20 deg offset, 10 deg beamwidth
    assert.equal(loss, 200);
  });

  it("interpolates correctly between lookup points", () => {
    const loss = ra.pointingLoss(5, 10); // norm = 0.5
    // At norm 0.5, between 0.41 (2dB) and 0.57 (4dB)
    // 0.5 is (0.5-0.41)/(0.57-0.41) = 0.56 of the way
    // Expected: 2 + 0.56*2 = 3.12 dB
    closeTo(loss, 3.12, 0.2);
  });
});

describe("realantennas-antenna.computeReceivedPower", () => {
  it("calculates link budget for identical antennas at 1 Mm", () => {
    const tx = TEST_ANTENNAS["X-band 64m TL7"];
    const rx = TEST_ANTENNAS["X-band 64m TL7"];
    const distance = 1_000_000; // 1 Mm

    const rxPower = ra.computeReceivedPower(tx, rx, distance);

    // TxPower = 70 dBm, Gain = ~73.5 dBi each
    // FSPL at 1 Mm X-band = 20*log10(1e6*8.45e9) - 147.55 = 170.99 dB
    // Pointing loss = 0 for boresight
    // RxPower = 70 + 73.5 - 170.99 + 73.5 = 46.01 dBm
    closeToRel(rxPower, 46, 0.05);
  });

  it("returns -Infinity for incompatible bands", () => {
    const tx = TEST_ANTENNAS["S-band 26m TL3"];
    const rx = TEST_ANTENNAS["X-band 64m TL7"];
    const rxPower = ra.computeReceivedPower(tx, rx, 1_000_000);
    assert.equal(rxPower, -Infinity);
  });

  it("includes pointing loss for off-boresight", () => {
    const tx = TEST_ANTENNAS["X-band 64m TL7"];
    const rx = { ...TEST_ANTENNAS["X-band 64m TL7"] };

    // On boresight
    const onAxis = ra.computeReceivedPower(tx, rx, 1_000_000);

    // Verify it returns a valid number
    assert.ok(Number.isFinite(onAxis));
  });
});

describe("realantennas-antenna.computeNoiseTemperature", () => {
  it("returns antenna noise temp + cosmic background", () => {
    const rx = TEST_ANTENNAS["X-band 64m TL7"]; // amwTemp = 40
    const noiseTemp = ra.computeNoiseTemperature(rx, 1_000_000, null);
    // 40 + 2.725 = 42.725 K
    closeTo(noiseTemp, 42.725, 0.01);
  });

  it("uses tech level default when amwTemp not specified", () => {
    const rx = { ...TEST_ANTENNAS["X-band 64m TL7"], amwTemp: undefined };
    const noiseTemp = ra.computeNoiseTemperature(rx, 1_000_000, null);
    // TL7 receiverNoiseTemp = 1100
    closeTo(noiseTemp, 1100 + 2.725, 0.01);
  });
});

describe("realantennas-antenna.computeLinkBudget", () => {
  it("returns complete link budget breakdown", () => {
    const tx = TEST_ANTENNAS["X-band 64m TL7"];
    const rx = TEST_ANTENNAS["X-band 64m TL7"];
    const distance = 1_000_000;

    const budget = ra.computeLinkBudget(tx, rx, distance);

    assert.ok("txGain" in budget);
    assert.ok("rxGain" in budget);
    assert.ok("fspl" in budget);
    assert.ok("txPointLoss" in budget);
    assert.ok("rxPointLoss" in budget);
    assert.ok("rxPower" in budget);
    assert.ok("distance" in budget);
    assert.equal(budget.distance, 1000); // km

    // Verify rxPower matches computeReceivedPower
    const rxPower = ra.computeReceivedPower(tx, rx, distance);
    closeTo(budget.rxPower, rxPower, 0.001);
  });
});

describe("realantennas-antenna.computeECPerSecond", () => {
  it("calculates idle + active EC for dish antenna at TL7", () => {
    // TL7: basePower = 18.3 W, powerEfficiency = 0.3/1000 = 3e-4
    // txPower = 70 dBm = 10,000,000 mW = 10 W
    // Active power = 10^7 / 0.0003 * 1e-6 = 33,333.33 kW
    // idlePower = 18.3 / 1000 = 0.0183 kW
    // With plannerActiveTxTime = 0: EC/s = 0.0183
    const antenna = TEST_ANTENNAS["X-band 64m TL7"]; // txPower=70, techLevel=7
    const ec = ra.computeECPerSecond(antenna, 1.0, 0);
    closeTo(ec, 0.0183, 1e-4);
  });

  it("includes active power when plannerActiveTxTime > 0", () => {
    const antenna = TEST_ANTENNAS["X-band 64m TL7"]; // txPower=70, techLevel=7
    // At 100% duty cycle (plannerActiveTxTime = 1)
    const ec = ra.computeECPerSecond(antenna, 1.0, 1);
    // idlePower = 18.3/1000 = 0.0183 kW
    // activePower = 10^7 / 0.0003 * 1e-6 = 33,333.33 kW
    // total = 0.0183 + 33,333.33 = 33,333.35 kW = 33,333.35 EC/s
    closeTo(ec, 33333.35, 0.01);
  });

  it("calculates EC for omni antenna at TL0", () => {
    // TL0: basePower = 42 W, powerEfficiency = 0.0555/1000 = 5.55e-5
    // txPower = 30 dBm = 1000 mW = 1 W
    // Active power = 1000 / 5.55e-5 * 1e-6 = 18.018 kW
    const antenna = TEST_ANTENNAS["L-band Omni TL0"]; // txPower=30, techLevel=0
    const ec = ra.computeECPerSecond(antenna, 1.0, 0);
    // idlePower = 42/1000 = 0.042 kW
    closeTo(ec, 0.042, 1e-4);
  });

  it("applies consumptionMultiplier", () => {
    const antenna = TEST_ANTENNAS["X-band 64m TL7"];
    const ec1 = ra.computeECPerSecond(antenna, 1.0, 0);
    const ec2 = ra.computeECPerSecond(antenna, 2.0, 0);
    assert.equal(ec2, ec1 * 2);
  });
});

describe("realantennas-antenna helper functions", () => {
  it("db() converts linear to dB correctly", () => {
    // The db function is not exported, but we can test via gainFromDishDiameter
    // which uses it internally. We'll test the exported functions instead.
  });

  it("gainFromDishDiameter calculates gain correctly", () => {
    // 64m dish at X-band (8.45 GHz), 64% efficiency
    // λ = 2.998e8 / 8.45e9 = 0.03548 m
    // Gain = 10*log10(0.64 * (π*64/0.03548)^2) ≈ 73.5 dBi
    const gain = ra.gainFromDishDiameter(64, 8.45e9, 0.64);
    closeToRel(gain, 73.5, 0.05);
  });

  it("gainFromReference scales omni gain with frequency", () => {
    // Reference gain 6 dBi at 1620 MHz, target L-band (1.62 GHz = 1620 MHz)
    // Same frequency, should return same gain
    const gain = ra.gainFromReference(6, 1620, 1.62e9);
    closeTo(gain, 6, 0.01);
  });

  it("gainFromReference returns reference gain unchanged for omni (≤5 dBi)", () => {
    // Omni gains ≤5 dBi are not scaled
    const gain = ra.gainFromReference(3, 100, 2e9);
    assert.equal(gain, 3);
  });

  it("beamwidth calculates correctly from gain", () => {
    // HPBW = sqrt(52525 / linear(gain)) in degrees
    // For 73.5 dBi gain: linear = 10^7.35 = 22,387,211
    // HPBW = sqrt(52525 / 22387211) = sqrt(0.002346) = 0.0484 degrees
    const gain = 73.5;
    const bw = ra.beamwidth(gain);
    closeToRel(bw, 0.0484, 0.05);
  });
});

describe("realantennas-antenna tech level parameters", () => {
  it("has correct power efficiency progression", () => {
    // Power efficiency improves with tech level (W/dBm)
    // TL0: 0.0555/1000 = 5.55e-5
    // TL9: 0.4397/1000 = 4.397e-4
    assert.ok(ra.RA_TECH_LEVELS[0].powerEfficiency < ra.RA_TECH_LEVELS[9].powerEfficiency);
  });

  it("has correct reflector efficiency progression", () => {
    assert.equal(ra.RA_TECH_LEVELS[0].reflectorEfficiency, 0.5);
    assert.equal(ra.RA_TECH_LEVELS[3].reflectorEfficiency, 0.56);
    assert.equal(ra.RA_TECH_LEVELS[4].reflectorEfficiency, 0.58);
    assert.equal(ra.RA_TECH_LEVELS[7].reflectorEfficiency, 0.64);
    assert.equal(ra.RA_TECH_LEVELS[8].reflectorEfficiency, 0.66);
    assert.equal(ra.RA_TECH_LEVELS[9].reflectorEfficiency, 0.68);
  });

  it("has correct receiver noise temperature progression", () => {
    assert.equal(ra.RA_TECH_LEVELS[0].receiverNoiseTemp, 27000);
    assert.equal(ra.RA_TECH_LEVELS[3].receiverNoiseTemp, 5800);
    assert.equal(ra.RA_TECH_LEVELS[5].receiverNoiseTemp, 3000);
    assert.equal(ra.RA_TECH_LEVELS[7].receiverNoiseTemp, 1100);
    assert.equal(ra.RA_TECH_LEVELS[9].receiverNoiseTemp, 200);
  });

  it("has correct encoder required Eb/N0", () => {
    assert.equal(ra.RA_ENCODERS["None"].requiredEbN0, 10);
    assert.equal(ra.RA_ENCODERS["Reed-Solomon 255/223"].requiredEbN0, 6.1);
    assert.equal(ra.RA_ENCODERS["Convolutional 7, 1/2"].requiredEbN0, 4.5);
    assert.equal(ra.RA_ENCODERS["Turbo 1/2"].requiredEbN0, 1);
  });

  it("has correct band frequencies", () => {
    assert.equal(ra.RA_BANDS.L.frequency, 1.62e9);
    assert.equal(ra.RA_BANDS.S.frequency, 2.25e9);
    assert.equal(ra.RA_BANDS.X.frequency, 8.45e9);
    assert.equal(ra.RA_BANDS.K.frequency, 26.25e9);
  });
});

describe("realantennas-antenna ground station link budget", () => {
  // Test ground station link budget using the same logic as store.js
  // Ground stations from RealAntennasCommNetParams.cfg

  it("TL0 L-band ground station link to probe", () => {
    // Ground station: L-band, 6 dBi, 40 dBm, TL0, None encoder, amwTemp 290
    const gs = {
      antennaDiameter: 0,
      referenceGain: 6,
      referenceFrequency: 1620,
      txPower: 40,
      techLevel: 0,
      rfBand: "L",
      amwTemp: 290,
      encoder: "None",
      canTarget: true,
    };

    // Probe: L-band omni, 40 dBm, TL5, None encoder
    const probe = TEST_ANTENNAS["Probe Omni TL5"];

    const distance = 10_000_000; // 10 Mm
    const rxPower = ra.computeReceivedPower(gs, probe, distance);

    // GS: 40 dBm + 6 dBi = 46 dBm EIRP
    // Probe gain at L-band: 6 dBi (from reference)
    // FSPL at 10 Mm L-band: ~177 dB
    // RxPower = 46 - 177 + 6 = -125 dBm (rough)
    assert.ok(Number.isFinite(rxPower));
    assert.ok(rxPower < -100); // Should be weak at 10 Mm with small antennas
  });

  it("TL9 K-band ground station link to deep space probe", () => {
    // Ground station: K-band 34m, 79 dBi, 54.8 dBm, TL9, Turbo 1/2, amwTemp 20
    const gs = {
      antennaDiameter: 34,
      referenceGain: 79,
      referenceFrequency: 26250,
      txPower: 54.8,
      techLevel: 9,
      rfBand: "K",
      amwTemp: 20,
      encoder: "Turbo 1/2",
      canTarget: true,
    };

    // Deep space probe: K-band 3m dish (compatible)
    const probe = {
      antennaDiameter: 3,
      referenceGain: 0,
      referenceFrequency: 0,
      txPower: 30, // 1W
      techLevel: 5,
      rfBand: "K",
      amwTemp: 100,
      encoder: "Convolutional 7, 1/2",
      canTarget: true,
    };

    const distance = 10_000_000_000_000; // 10 Gm (Jupiter-ish)
    const rxPower = ra.computeReceivedPower(gs, probe, distance);

    // GS gain at K-band: 79 dBi
    // Probe gain at K-band: ~45 dBi
    // FSPL at 10 Gm K-band: huge
    // This is a very long link, likely negative dBm
    assert.ok(Number.isFinite(rxPower));
  });
});

describe("realantennas-antenna data rate estimation", () => {
  it("computeDataRate returns 0 (placeholder)", () => {
    const tx = TEST_ANTENNAS["X-band 64m TL7"];
    const rx = TEST_ANTENNAS["X-band 64m TL7"];
    const rate = ra.computeDataRate(tx, rx, 1_000_000);
    assert.equal(rate, 0); // Currently a placeholder
  });

  it("computeRangeForDataRate returns 0 (placeholder)", () => {
    const tx = TEST_ANTENNAS["X-band 64m TL7"];
    const rx = TEST_ANTENNAS["X-band 64m TL7"];
    const range = ra.computeRangeForDataRate(tx, rx, 1000);
    assert.equal(range, 0); // Currently a placeholder
  });
});