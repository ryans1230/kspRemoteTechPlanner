import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RSS_DSN_POWER,
  RSS_ANTENNA_POWER_MULTIPLIER,
  applyRangeModifier,
  applyDSNModifier,
  computeRangeKm,
  computeCombinedPower,
  rangeToDSN,
  rangeToIdentical,
  rangeBetween,
  computeECPerSecond,
} from "../js/calculator/rss-antenna.js";

/**
 * @param {number} actual
 * @param {number} expected
 * @param {number} [tolerance]
 * @returns {void}
 */
function closeTo(actual, expected, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

describe("rss-antenna calculator", () => {
  // Test antenna: Communotron 16 (omni, 500,000 m power, combinable, exponent 1.0)
  const communotron16 = {
    antennaPower: 500_000,
    antennaCombinable: true,
    antennaCombinableExponent: 1.0,
  };

  // Test antenna: non-combinable omni (Communotron 16-S)
  const communotron16S = {
    antennaPower: 500_000,
    antennaCombinable: false,
    antennaCombinableExponent: 0.75,
  };

  // Test dish antenna
  const hg5 = {
    antennaPower: 5_000_000,
    antennaCombinable: true,
    antennaCombinableExponent: 0.75,
  };

  describe("constants", () => {
    it("has 20x antenna power multiplier", () => {
      assert.equal(RSS_ANTENNA_POWER_MULTIPLIER, 20);
    });

    it("has RSS DSN power levels (20x stock)", () => {
      assert.equal(RSS_DSN_POWER.level1, 5_000_000_000);      // 5 Gm (stock: 2 Gm)
      assert.equal(RSS_DSN_POWER.level2, 500_000_000_000);    // 500 Gm (stock: 50 Gm)
      assert.equal(RSS_DSN_POWER.level3, 50_000_000_000_000); // 50 Tm (stock: 250 Gm)
    });
  });

  describe("applyRangeModifier", () => {
    it("applies rangeModifier and RSS 20x multiplier", () => {
      // 500,000 * 1.0 * 20 = 10,000,000
      assert.equal(applyRangeModifier(500_000, 1.0), 10_000_000);
      // With rangeModifier 2.0: 500,000 * 2.0 * 20 = 20,000,000
      assert.equal(applyRangeModifier(500_000, 2.0), 20_000_000);
    });
  });

  describe("applyDSNModifier", () => {
    it("applies DSNModifier to DSN power", () => {
      assert.equal(applyDSNModifier(5_000_000_000, 1.0), 5_000_000_000);
      assert.equal(applyDSNModifier(5_000_000_000, 2.0), 10_000_000_000);
    });
  });

  describe("computeRangeKm", () => {
    it("computes geometric mean in km", () => {
      // sqrt(10M * 10M) / 1000 = 10M / 1000 = 10,000 km
      assert.equal(computeRangeKm(10_000_000, 10_000_000), 10_000);
      // sqrt(10M * 5G) / 1000 = sqrt(5e16) / 1000 = 223,606,797 / 1000 = 223,606 km
      closeTo(computeRangeKm(10_000_000, 5_000_000_000), 223606, 1);
    });
  });

  describe("computeCombinedPower", () => {
    it("returns single power for count 1", () => {
      assert.equal(computeCombinedPower(10_000_000, 1, 1.0), 10_000_000);
    });

    it("combines with exponent 1.0 (linear sum)", () => {
      // max * (sum/max)^1 = max * (count) = 10M * 3 = 30M
      assert.equal(computeCombinedPower(10_000_000, 3, 1.0), 30_000_000);
    });

    it("combines with default exponent 0.75", () => {
      // max * (sum/max)^0.75 = 10M * (3)^0.75
      closeTo(computeCombinedPower(10_000_000, 3, 0.75), 10_000_000 * Math.pow(3, 0.75), 0.01);
    });
  });

  describe("rangeToIdentical (relay-to-relay)", () => {
    it("Communotron 16 with 1 antenna: 500km * 20 = 10,000 km", () => {
      // 500,000 * 20 = 10,000,000 m = 10,000 km
      // sqrt(10M * 10M) / 1000 = 10,000 km
      const range = rangeToIdentical(communotron16, 1, 1.0);
      assert.equal(range, 10_000);
    });

    it("Communotron 16 with 2 antennas (combinable, exponent 1.0): 20,000 km", () => {
      // combinedPower = 500,000 * 2 * 20 = 20,000,000
      // sqrt(20M * 20M) / 1000 = 20,000 km
      const range = rangeToIdentical(communotron16, 2, 1.0);
      assert.equal(range, 20_000);
    });

    it("Communotron 16-S (non-combinable): always 10,000 km", () => {
      const range1 = rangeToIdentical(communotron16S, 1, 1.0);
      const range2 = rangeToIdentical(communotron16S, 4, 1.0);
      assert.equal(range1, 10_000);
      assert.equal(range2, 10_000);
    });

    it("HG-5 dish: 5M * 20 = 100,000 km", () => {
      const range = rangeToIdentical(hg5, 1, 1.0);
      assert.equal(range, 100_000);
    });
  });

  describe("rangeToDSN (antenna-to-DSN)", () => {
    it("Communotron 16 to DSN level 1 (5 Gm)", () => {
      // antenna: 500,000 * 20 = 10M
      // DSN: 5G
      // sqrt(10M * 5G) / 1000 = sqrt(5e16) / 1000 = 223,606,797 / 1000 = 223,606 km
      const range = rangeToDSN(communotron16, "level1", 1, { rangeModifier: 1.0, DSNModifier: 1.0 });
      closeTo(range, 223606, 1);
    });

    it("Communotron 16 to DSN level 2 (500 Gm)", () => {
      // antenna: 500,000 * 20 = 10M
      // DSN: 500G = 500,000,000,000
      // sqrt(10M * 500G) / 1000 = sqrt(5e18) / 1000 = 2,236,067,977 / 1000 = 2,236,067 km
      const range = rangeToDSN(communotron16, "level2", 1, { rangeModifier: 1.0, DSNModifier: 1.0 });
      closeTo(range, 2236067, 10);
    });

    it("Communotron 16 to DSN level 3 (50 Tm)", () => {
      // antenna: 500,000 * 20 = 10M
      // DSN: 50T = 50,000,000,000,000
      // sqrt(10M * 50T) / 1000 = sqrt(5e20) / 1000 = 22,360,679,774 / 1000 = 22,360,679 km
      const range = rangeToDSN(communotron16, "level3", 1, { rangeModifier: 1.0, DSNModifier: 1.0 });
      closeTo(range, 22360679, 100);
    });

    it("HG-5 to DSN level 3", () => {
      // HG-5: 5,000,000 * 20 = 100M
      // DSN: 50T
      // sqrt(100M * 50T) / 1000 = sqrt(5e21) / 1000 = 70,710,678,118 / 1000 = 70,710,678 km
      const range = rangeToDSN(hg5, "level3", 1, { rangeModifier: 1.0, DSNModifier: 1.0 });
      closeTo(range, 70710678, 1000);
    });
  });

  describe("rangeBetween (two different antennas)", () => {
    it("Communotron 16 to HG-5", () => {
      // comm16: 500k * 20 = 10M
      // hg5: 5M * 20 = 100M
      // sqrt(10M * 100M) / 1000 = sqrt(1e15) / 1000 = 31,622,776 / 1000 = 31,622 km
      const range = rangeBetween(communotron16, hg5, 1, 1, 1.0);
      closeTo(range, 31_622, 1);
    });
  });

  describe("computeECPerSecond", () => {
    it("computes EC/s from packet cost/interval", () => {
      // 12 EC/packet / 0.6 s = 20 EC/s
      assert.equal(computeECPerSecond({ packetResourceCost: 12.0, packetInterval: 0.6 }), 20);
    });

    it("uses energyCost for RemoteTech antennas", () => {
      assert.equal(computeECPerSecond({ energyCost: 0.82 }), 0.82);
    });
  });

  describe("RSS vs Stock comparison", () => {
    it("RSS ranges are 20x stock for relay-to-relay", () => {
      // Stock: sqrt(500k * 500k) / 1000 = 500 km
      // RSS: sqrt(10M * 10M) / 1000 = 10,000 km = 20x
      const stockRange = Math.sqrt(500_000 * 500_000) / 1000;
      const rssRange = rangeToIdentical(communotron16, 1, 1.0);
      assert.equal(rssRange / stockRange, 20);
    });

    it("RSS ranges are sqrt(20)*DSN_boost stock for antenna-to-DSN", () => {
      // Stock DSN level 3: 250 Gm
      // RSS DSN level 3: 50 Tm = 200x stock DSN
      // Antenna power: 20x
      // Combined: sqrt(20 * 200) = sqrt(4000) ≈ 63.25x stock
      const stockRange = Math.sqrt(500_000 * 250_000_000_000) / 1000;
      const rssRange = rangeToDSN(communotron16, "level3", 1, { rangeModifier: 1.0, DSNModifier: 1.0 });
      const ratio = rssRange / stockRange;
      // sqrt(20 * 200) = sqrt(4000) = 63.245...
      closeTo(ratio, 63.245, 0.01);
    });
  });
});