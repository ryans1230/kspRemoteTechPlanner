import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as stockAntenna from "../js/calculator/stock-antenna.js";

const TOLERANCE = 1e-6;

function closeTo(actual, expected, tolerance = TOLERANCE) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

/** Raw antenna parameters matching the cfg files */
const ANTENNAS = {
  "Communotron 16-S": {
    antennaPower: 500_000,
    packetInterval: 0.6,
    packetSize: 2,
    packetResourceCost: 12.0,
    antennaCombinable: false,
    antennaCombinableExponent: 0.75,
  },
  "Communotron 16": {
    antennaPower: 500_000,
    packetInterval: 0.6,
    packetSize: 2,
    packetResourceCost: 12.0,
    antennaCombinable: true,
    antennaCombinableExponent: 1.0,
  },
  "Comms DTS-M1": {
    antennaPower: 2_000_000_000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 12.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
  "Communotron HG-55": {
    antennaPower: 15_000_000_000,
    packetInterval: 0.15,
    packetSize: 3,
    packetResourceCost: 20.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
  "Communotron HG-5": {
    antennaPower: 5_000_000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 18.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
  "RA-100": {
    antennaPower: 100_000_000_000,
    packetInterval: 0.35,
    packetSize: 4,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
  "RA-15": {
    antennaPower: 15_000_000_000,
    packetInterval: 0.35,
    packetSize: 2,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
  "RA-2": {
    antennaPower: 2_000_000_000,
    packetInterval: 0.35,
    packetSize: 1,
    packetResourceCost: 24.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
  "Communotron 88-88": {
    antennaPower: 100_000_000_000,
    packetInterval: 0.10,
    packetSize: 2,
    packetResourceCost: 20.0,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  },
};

describe("stock-antenna.computeECPerSecond", () => {
  it("Communotron 16-S: 12 / 0.6 = 20 EC/s", () => {
    assert.equal(stockAntenna.computeECPerSecond(ANTENNAS["Communotron 16-S"]), 20);
  });

  it("Communotron 16: 12 / 0.6 = 20 EC/s", () => {
    assert.equal(stockAntenna.computeECPerSecond(ANTENNAS["Communotron 16"]), 20);
  });

  it("Comms DTS-M1: 12 / 0.35 ≈ 34.2857 EC/s", () => {
    closeTo(stockAntenna.computeECPerSecond(ANTENNAS["Comms DTS-M1"]), 12 / 0.35);
  });

  it("Communotron HG-55: 20 / 0.15 ≈ 133.333 EC/s", () => {
    closeTo(stockAntenna.computeECPerSecond(ANTENNAS["Communotron HG-55"]), 20 / 0.15);
  });

  it("Communotron HG-5: 18 / 0.35 ≈ 51.4286 EC/s", () => {
    closeTo(stockAntenna.computeECPerSecond(ANTENNAS["Communotron HG-5"]), 18 / 0.35);
  });

  it("RA-100: 24 / 0.35 ≈ 68.5714 EC/s", () => {
    closeTo(stockAntenna.computeECPerSecond(ANTENNAS["RA-100"]), 24 / 0.35);
  });

  it("Communotron 88-88: 20 / 0.10 = 200 EC/s", () => {
    assert.equal(stockAntenna.computeECPerSecond(ANTENNAS["Communotron 88-88"]), 200);
  });
});

describe("stock-antenna.computeRangeKm", () => {
  it("geometric mean: sqrt(500000 * 2e9) / 1000 = 31622.776 km", () => {
    closeTo(stockAntenna.computeRangeKm(500_000, 2_000_000_000), 31622.776, 0.01);
  });

  it("identical: sqrt(P * P) / 1000 = P / 1000", () => {
    closeTo(stockAntenna.computeRangeKm(100_000_000_000, 100_000_000_000), 100_000_000);
  });

  it("RA-100 to DSN L3: sqrt(1e11 * 2.5e11) / 1000 ≈ 158,113,883 km", () => {
    closeTo(
      stockAntenna.computeRangeKm(100_000_000_000, 250_000_000_000),
      158_113_883,
      1,
    );
  });
});

describe("stock-antenna.computeCombinedPower", () => {
  it("exponent=1.0: linear sum (Communotron 16)", () => {
    const a = ANTENNAS["Communotron 16"];
    const power = stockAntenna.applyRangeModifier(a.antennaPower, 1.0);
    // 2x with exponent 1.0 = power * 2
    assert.equal(stockAntenna.computeCombinedPower(power, 2, 1.0), power * 2);
  });

  it("exponent=0.75: sublinear (RA-100)", () => {
    const a = ANTENNAS["RA-100"];
    const power = stockAntenna.applyRangeModifier(a.antennaPower, 1.0);
    // 2x: max * (2*max/max)^0.75 = max * 2^0.75 = max * 1.68179...
    const expected = power * Math.pow(2, 0.75);
    closeTo(stockAntenna.computeCombinedPower(power, 2, 0.75), expected);
  });

  it("count=1 returns single power", () => {
    const a = ANTENNAS["RA-100"];
    const power = stockAntenna.applyRangeModifier(a.antennaPower, 1.0);
    assert.equal(stockAntenna.computeCombinedPower(power, 1, 0.75), power);
  });

  it("non-combinable uses exponent 0.75 by default (caller decides whether to combine)", () => {
    const a = { ...ANTENNAS["Communotron 16-S"], antennaCombinableExponent: 0.75 };
    const power = stockAntenna.applyRangeModifier(a.antennaPower, 1.0);
    // Even non-combinable antennas use the formula if caller passes count>1
    // The caller (rangeToDSN etc.) checks antennaCombinable before calling
    const expected = power * Math.pow(2, 0.75);
    closeTo(stockAntenna.computeCombinedPower(power, 2, 0.75), expected);
  });
});

describe("stock-antenna.rangeToDSN", () => {
  const mods = { rangeModifier: 1.0, DSNModifier: 1.0 };

  it("DSN_POWER constants match KSP GameVariables", () => {
    assert.equal(stockAntenna.DSN_POWER.level1, 2_000_000_000);  // 2 Gm
    assert.equal(stockAntenna.DSN_POWER.level2, 50_000_000_000); // 50 Gm
    assert.equal(stockAntenna.DSN_POWER.level3, 250_000_000_000); // 250 Gm
  });

  it("Communotron 16-S → DSN L1: ~31,623 km", () => {
    closeTo(
      stockAntenna.rangeToDSN(ANTENNAS["Communotron 16-S"], "level1", 1, mods),
      31622.776,
      0.01,
    );
  });

  it("Communotron 16-S → DSN L2: ~158,113 km", () => {
    // sqrt(500k * 50G) / 1000 = sqrt(2.5e16) / 1000 = 1.581e8 / 1000 = 158,113 km
    closeTo(
      stockAntenna.rangeToDSN(ANTENNAS["Communotron 16-S"], "level2", 1, mods),
      158113.88,
      0.01,
    );
  });

  it("Communotron 16-S → DSN L3: ~353,553 km", () => {
    closeTo(
      stockAntenna.rangeToDSN(ANTENNAS["Communotron 16-S"], "level3", 1, mods),
      353553.39,
      0.01,
    );
  });

  it("RA-100 → DSN L2: ~70,710,678 km", () => {
    // sqrt(100G * 50G) / 1000 = sqrt(5e21) / 1000 = 7.071e10 / 1000 = 70,710,678 km
    closeTo(
      stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level2", 1, mods),
      70_710_678,
      1,
    );
  });

  it("RA-100 → DSN L3: ~158,113,883 km", () => {
    closeTo(
      stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, mods),
      158_113_883,
      1,
    );
  });

  it("Communotron 16 (2x, exponent=1) → DSN L3: 500,000 km", () => {
    // 2x with exponent 1.0: power = 500k * 2 = 1M
    // sqrt(1M * 250G) / 1000 = sqrt(2.5e17) / 1000 = 5e8 / 1000 = 500,000
    closeTo(
      stockAntenna.rangeToDSN(ANTENNAS["Communotron 16"], "level3", 2, mods),
      500_000,
      1,
    );
  });

  it("rangeModifier applies to antenna only", () => {
    const mods2 = { rangeModifier: 2.0, DSNModifier: 1.0 };
    const r1 = stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, mods);
    const r2 = stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, mods2);
    // sqrt(2) increase
    closeTo(r2 / r1, Math.sqrt(2), 1e-6);
  });

  it("DSNModifier applies to DSN only", () => {
    const mods2 = { rangeModifier: 1.0, DSNModifier: 2.0 };
    const r1 = stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, mods);
    const r2 = stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, mods2);
    closeTo(r2 / r1, Math.sqrt(2), 1e-6);
  });
});

describe("stock-antenna.rangeToIdentical", () => {
  it("RA-100 self-range: 100,000,000 km", () => {
    assert.equal(
      stockAntenna.rangeToIdentical(ANTENNAS["RA-100"], 1, 1.0),
      100_000_000,
    );
  });

  it("Communotron 16 (2x, exponent=1) self-range: 1,000 km", () => {
    // 2x power = 1M, sqrt(1M * 1M) / 1000 = 1000
    assert.equal(
      stockAntenna.rangeToIdentical(ANTENNAS["Communotron 16"], 2, 1.0),
      1000,
    );
  });

  it("RA-100 (2x) self-range: ~168,179,283 km", () => {
    // 2x with exp 0.75: 1e11 * 2^0.75 = 1.68179e11
    // sqrt(1.68179e11 * 1.68179e11) / 1000 = 168,179,283
    closeTo(
      stockAntenna.rangeToIdentical(ANTENNAS["RA-100"], 2, 1.0),
      168_179_283,
      1,
    );
  });
});

describe("stock-antenna.rangeBetween", () => {
  it("RA-100 to RA-15 (1 each): ~38,729,833 km", () => {
    // sqrt(1e11 * 1.5e10) / 1000 = sqrt(1.5e21) / 1000 = 3.8729833e10 / 1000
    closeTo(
      stockAntenna.rangeBetween(ANTENNAS["RA-100"], ANTENNAS["RA-15"], 1, 1, 1.0),
      38_729_833,
      1,
    );
  });

  it("symmetric: rangeBetween(A,B) === rangeBetween(B,A)", () => {
    const r1 = stockAntenna.rangeBetween(
      ANTENNAS["RA-100"],
      ANTENNAS["RA-15"],
      1,
      1,
      1.0,
    );
    const r2 = stockAntenna.rangeBetween(
      ANTENNAS["RA-15"],
      ANTENNAS["RA-100"],
      1,
      1,
      1.0,
    );
    assert.equal(r1, r2);
  });
});

describe("stock-antenna modifiers", () => {
  it("rangeModifier=0.8 (Hard difficulty) reduces all ranges by sqrt(0.8)", () => {
    const easy = { rangeModifier: 1.5, DSNModifier: 1.0 };
    const hard = { rangeModifier: 0.65, DSNModifier: 1.0 };
    const rEasy = stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, easy);
    const rHard = stockAntenna.rangeToDSN(ANTENNAS["RA-100"], "level3", 1, hard);
    closeTo(rHard / rEasy, Math.sqrt(0.65 / 1.5), 1e-6);
  });
});