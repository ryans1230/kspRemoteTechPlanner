import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as rt from "../js/calculator/remote-tech-antenna.js";

const TOLERANCE = 1e-6;

function closeTo(actual, expected, tolerance = TOLERANCE) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

/** Raw antenna parameters matching the ModuleRTAntenna cfg files */
const ANTENNAS = {
  "Reflectron DP-10": {
    name: "Reflectron DP-10",
    type: "omni",
    omniRange: 500_000,
    dishRange: 0,
    energyCost: 0.01,
    dishAngle: 0,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
  },
  "CommTech EXP-VR-2T": {
    name: "CommTech EXP-VR-2T",
    type: "omni",
    omniRange: 3_000_000,
    dishRange: 0,
    energyCost: 0.18,
    dishAngle: 0,
    maxQ: 6000,
    combinable: true,
    combinableExponent: 0.75,
  },
  "Communotron 32": {
    name: "Communotron 32",
    type: "omni",
    omniRange: 5_000_000,
    dishRange: 0,
    energyCost: 0.6,
    dishAngle: 0,
    maxQ: 3000,
    combinable: true,
    combinableExponent: 0.75,
  },
  "Reflectron KR-7": {
    name: "Reflectron KR-7",
    type: "dish",
    omniRange: 0,
    dishRange: 90_000_000,
    energyCost: 0.82,
    dishAngle: 25.0,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
  },
  "Reflectron KR-14": {
    name: "Reflectron KR-14",
    type: "dish",
    omniRange: 0,
    dishRange: 60_000_000_000,
    energyCost: 0.93,
    dishAngle: 0.04,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
  },
  "CommTech-1": {
    name: "CommTech-1",
    type: "dish",
    omniRange: 0,
    dishRange: 350_000_000_000,
    energyCost: 2.6,
    dishAngle: 0.006,
    maxQ: -1,
    combinable: true,
    combinableExponent: 0.75,
  },
  "Reflectron GX-128": {
    name: "Reflectron GX-128",
    type: "dish",
    omniRange: 0,
    dishRange: 400_000_000_000,
    energyCost: 2.8,
    dishAngle: 0.005,
    maxQ: 6000,
    combinable: true,
    combinableExponent: 0.75,
  },
};

const DEFAULT_SETTINGS = {
  RangeMultiplier: 1.0,
  ConsumptionMultiplier: 1.0,
  MissionControlRangeMultiplier: 1.0,
  OmniRangeClampFactor: 100,
  DishRangeClampFactor: 1000,
  MultipleAntennaMultiplier: 0,
  RangeModelType: "Standard",
  SignalDelay: false,
  SpeedOfLight: 299792458,
};

describe("remote-tech-antenna.computeECPerSecond", () => {
  it("Reflectron DP-10: 0.01 * 1.0 = 0.01 EC/s", () => {
    assert.equal(rt.computeECPerSecond(ANTENNAS["Reflectron DP-10"], 1.0), 0.01);
  });

  it("Reflectron KR-7: 0.82 * 1.0 = 0.82 EC/s", () => {
    assert.equal(rt.computeECPerSecond(ANTENNAS["Reflectron KR-7"], 1.0), 0.82);
  });

  it("CommTech-1: 2.6 * 1.0 = 2.6 EC/s", () => {
    assert.equal(rt.computeECPerSecond(ANTENNAS["CommTech-1"], 1.0), 2.6);
  });

  it("ConsumptionMultiplier=2 doubles EC", () => {
    assert.equal(rt.computeECPerSecond(ANTENNAS["Reflectron DP-10"], 2.0), 0.02);
  });
});

describe("remote-tech-antenna.applyRangeMultiplier", () => {
  it("RangeMultiplier=2 doubles both ranges", () => {
    const a = ANTENNAS["Reflectron DP-10"];
    const r = rt.applyRangeMultiplier(a, 2.0);
    assert.equal(r.omniRange, 1_000_000);
    assert.equal(r.dishRange, 0);
  });

  it("RangeMultiplier=0.5 halves ranges", () => {
    const a = ANTENNAS["Reflectron KR-7"];
    const r = rt.applyRangeMultiplier(a, 0.5);
    assert.equal(r.omniRange, 0);
    assert.equal(r.dishRange, 45_000_000);
  });
});

describe("remote-tech-antenna.computeMultipleAntennaBonus", () => {
  it("MultipleAntennaMultiplier=0 gives no bonus", () => {
    assert.equal(rt.computeMultipleAntennaBonus(500_000, 1_500_000, 0), 0);
  });

  it("MultipleAntennaMultiplier=1 gives full bonus (sum - max)", () => {
    // max=500k, sum=1.5M, bonus = (1.5M - 500k) * 1 = 1M
    assert.equal(rt.computeMultipleAntennaBonus(500_000, 1_500_000, 1), 1_000_000);
  });

  it("MultipleAntennaMultiplier=0.5 gives half bonus", () => {
    assert.equal(rt.computeMultipleAntennaBonus(500_000, 1_500_000, 0.5), 500_000);
  });
});

describe("remote-tech-antenna.standardMaxDistance", () => {
  it("Standard model: Min(r1, r2)", () => {
    assert.equal(rt.standardMaxDistance(100, 200), 100);
    assert.equal(rt.standardMaxDistance(500, 50), 50);
  });
});

describe("remote-tech-antenna.rootMaxDistance", () => {
  it("Root model: Min(r1, r2) + Sqrt(r1*r2)", () => {
    const r = rt.rootMaxDistance(100, 100);
    closeTo(r, 100 + 100); // 200
  });

  it("Root model with different ranges", () => {
    const r = rt.rootMaxDistance(100, 400);
    closeTo(r, 100 + 200); // 300
  });
});

describe("remote-tech-antenna.checkRange", () => {
  it("clamps at range1 * clamp1 and range2 * clamp2", () => {
    const maxDistFn = rt.standardMaxDistance;
    // range1=500k, clamp1=100 -> 50M; range2=500k, clamp2=100 -> 50M
    // MaxDistance=500k, clamped to 50M each way
    const r = rt.checkRange(500_000, 100, 500_000, 100, maxDistFn);
    assert.equal(r, 500_000); // MaxDistance wins
  });

  it("clamp limits when ranges differ greatly", () => {
    const maxDistFn = rt.standardMaxDistance;
    // range1=500k (omni), clamp1=100 -> 50M; range2=90M (dish), clamp2=1000 -> 90G
    // MaxDistance=500k, clamp1=50M, clamp2=90G
    const r = rt.checkRange(500_000, 100, 90_000_000, 1000, maxDistFn);
    assert.equal(r, 500_000);
  });

  it("clamp limits when MaxDistance exceeds clamp", () => {
    const maxDistFn = rt.standardMaxDistance;
    // range1=50M, clamp1=100 -> 5G; range2=90M, clamp2=1000 -> 90G
    // MaxDistance=50M, but clamp1 limits to 5G
    const r = rt.checkRange(50_000_000, 100, 90_000_000, 1000, maxDistFn);
    assert.equal(r, 50_000_000); // MaxDistance is 50M, less than clamps
  });
});

describe("remote-tech-antenna.computeRange", () => {
  const settings = { ...DEFAULT_SETTINGS };

  it("Omni to Omni: min of both omni ranges", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Communotron 32"], 1.0);
    const r = rt.computeRange(a, b, settings);
    // min(500k, 5M) = 500k
    assert.equal(r, 500_000);
  });

  it("Omni to Dish: min of omni and dish (with clamps)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const r = rt.computeRange(a, b, settings);
    // Omni->Omni: maxDist=min(500k, 0)=0
    // Omni->Dish: maxDist=min(500k, 90M)=500k, clamp1=50M, clamp2=90G -> 500k
    // Dish->Omni: maxDist=min(0, 0)=0
    // Dish->Dish: maxDist=min(0, 90M)=0
    // Result: 500k
    assert.equal(r, 500_000);
  });

  it("Dish to Dish: min of both dish ranges", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-14"], 1.0);
    const r = rt.computeRange(a, b, settings);
    // min(90M, 60G) = 90M
    assert.equal(r, 90_000_000);
  });

  it("DP-10 to KR-14: limited by DP-10 omni (500k)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-14"], 1.0);
    const r = rt.computeRange(a, b, settings);
    assert.equal(r, 500_000);
  });

  it("KR-7 to KR-14: limited by KR-7 dish (90M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-14"], 1.0);
    const r = rt.computeRange(a, b, settings);
    assert.equal(r, 90_000_000);
  });

  it("CommTech-1 to GX-128: limited by CommTech-1 dish (350G)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["CommTech-1"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Reflectron GX-128"], 1.0);
    const r = rt.computeRange(a, b, settings);
    assert.equal(r, 350_000_000_000);
  });

  it("RangeMultiplier applies to both antennas", () => {
    const settings2 = { ...settings, RangeMultiplier: 2.0 };
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 2.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Communotron 32"], 2.0);
    const r1 = rt.computeRange(a, b, settings2);
    const r2 = rt.computeRange(
      rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0),
      rt.applyRangeMultiplier(ANTENNAS["Communotron 32"], 1.0),
      settings,
    );
    assert.equal(r1, r2 * 2);
  });
});

describe("remote-tech-antenna.rangeToMissionControl", () => {
  const settings = { ...DEFAULT_SETTINGS };

  // Tech Level 1 (4M omni) - KSP Tracking Station Level 1 or forced
  it("DP-10 to Mission Control (4M): limited by DP-10 (500k)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 4_000_000);
    assert.equal(r, 500_000);
  });

  it("KR-7 to Mission Control (4M): limited by MC omni (4M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 4_000_000);
    // Dish->Omni: maxDist=min(90M, 4M)=4M, clamp1=90G, clamp2=400M -> 4M
    assert.equal(r, 4_000_000);
  });

  it("KR-14 to Mission Control (4M): limited by MC omni (4M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-14"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 4_000_000);
    assert.equal(r, 4_000_000);
  });

  // Tech Level 2 (30M omni) - KSP Tracking Station Level 2
  it("DP-10 to Mission Control (30M): limited by DP-10 (500k)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 30_000_000);
    assert.equal(r, 500_000);
  });

  it("KR-7 to Mission Control (30M): limited by MC omni (30M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 30_000_000);
    // Dish->Omni: maxDist=min(90M, 30M)=30M, clamp1=90G, clamp2=3B -> 30M
    assert.equal(r, 30_000_000);
  });

  it("KR-14 to Mission Control (30M): limited by MC omni (30M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-14"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 30_000_000);
    assert.equal(r, 30_000_000);
  });

  // Tech Level 3 (75M omni) - KSP Tracking Station Level 3 or forced
  it("DP-10 to Mission Control (75M): limited by DP-10 (500k)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 75_000_000);
    assert.equal(r, 500_000);
  });

  it("KR-7 to Mission Control (75M): limited by KR-7 dish (90M) vs MC (75M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 75_000_000);
    // Dish->Omni: maxDist=min(90M, 75M)=75M, clamp1=90G, clamp2=7.5G -> 75M
    assert.equal(r, 75_000_000);
  });

  it("KR-14 to Mission Control (75M): limited by MC omni (75M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-14"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 75_000_000);
    assert.equal(r, 75_000_000);
  });

  it("GX-128 to Mission Control (75M): limited by MC omni (75M)", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron GX-128"], 1.0);
    const r = rt.rangeToMissionControl(a, settings, 75_000_000);
    assert.equal(r, 75_000_000);
  });

  it("MissionControlRangeMultiplier applies to ground station", () => {
    const settings2 = { ...settings, MissionControlRangeMultiplier: 2.0 };
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const r1 = rt.rangeToMissionControl(a, settings2, 75_000_000 * 2.0);
    const r2 = rt.rangeToMissionControl(a, settings, 75_000_000);
    // With 2x MC range, DP-10 (500k) still limited by its own range
    assert.equal(r1, 500_000);
    assert.equal(r2, 500_000);
  });
});

describe("remote-tech-antenna Root range model", () => {
  const rootSettings = { ...DEFAULT_SETTINGS, RangeModelType: "Root" };

  it("Root model: identical dishes get boosted range", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const r = rt.computeRange(a, a, rootSettings);
    // Root: min(90M, 90M) + sqrt(90M*90M) = 90M + 90M = 180M
    assert.equal(r, 180_000_000);
  });

  it("Root model: DP-10 to KR-7 gets boosted", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Reflectron DP-10"], 1.0);
    const b = rt.applyRangeMultiplier(ANTENNAS["Reflectron KR-7"], 1.0);
    const r = rt.computeRange(a, b, rootSettings);
    // Omni->Dish: maxDist = min(500k, 90M) + sqrt(500k*90M) = 500k + 6,708,203 = 7,208,203
    // Clamps: 500k*100=50M, 90M*1000=90G -> min(7.2M, 50M, 90G) = 7.2M
    closeTo(r, 7_208_203, 1);
  });

  it("Root model: identical omnis get boosted", () => {
    const a = rt.applyRangeMultiplier(ANTENNAS["Communotron 32"], 1.0);
    const r = rt.computeRange(a, a, rootSettings);
    // Root: min(5M, 5M) + sqrt(5M*5M) = 5M + 5M = 10M
    // Clamped to omniClamp=100 -> 500M, so 10M wins
    assert.equal(r, 10_000_000);
  });
});

describe("remote-tech-antenna clamp factors", () => {
  const settings = { ...DEFAULT_SETTINGS };

  it("Omni clamp 100x limits very large omni connections", () => {
    // Two omnis with 10M range each, Standard model
    const a = { omniRange: 10_000_000, dishRange: 0 };
    const r = rt.computeRange(a, a, settings);
    // MaxDistance=10M, clamp1=1B, clamp2=1B -> 10M
    assert.equal(r, 10_000_000);
  });

  it("Dish clamp 1000x limits very large dish connections", () => {
    // Two dishes with 500G range each
    const a = { omniRange: 0, dishRange: 500_000_000_000 };
    const r = rt.computeRange(a, a, settings);
    // MaxDistance=500G, clamp=500T -> 500G
    assert.equal(r, 500_000_000_000);
  });

  it("Clamp limits when MaxDistance exceeds clamp (Root model, large omnis)", () => {
    const rootSettings = { ...settings, RangeModelType: "Root" };
    // Two 10G omnis with Root model: 10G + 10G = 20G, clamp=100 -> 1000G=1T
    // But MaxDistance (20G) < clamp (1T), so 20G wins
    const a = { omniRange: 10_000_000_000, dishRange: 0 };
    const r = rt.computeRange(a, a, rootSettings);
    assert.equal(r, 20_000_000_000);
  });

  it("Clamp limits Root model when MaxDistance > clamp", () => {
    const rootSettings = { ...settings, RangeModelType: "Root" };
    // Unequal ranges: r1=1T, r2=10,000T (10 quadrillion = 10^16)
    // MaxDistance = min(1T, 10,000T) + sqrt(1T * 10,000T) = 1T + 100T = 101T
    // Clamp1 = 1T * 100 = 100T, Clamp2 = 10,000T * 100 = 1,000,000T
    // Result = min(101T, 100T, 1,000,000T) = 100T (clamp1 wins)
    const a = { omniRange: 1_000_000_000_000, dishRange: 0 };
    const b = { omniRange: 10_000_000_000_000_000, dishRange: 0 };
    const r = rt.computeRange(a, b, rootSettings);
    assert.equal(r, 100_000_000_000_000);
  });
});