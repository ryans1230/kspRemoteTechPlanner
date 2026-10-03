import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STOCK_ANTENNAS_RAW } from "../js/data/antennas-stock-raw.js";
import { STOCK_BODIES } from "../js/data/bodies.js";
import { createStore, migrateChain, migrateSettings, migrateUserAntennas, migrateUserCrafts, KEYS } from "../js/store.js";
import { rangeToDSN, computeECPerSecond } from "../js/calculator/stock-antenna.js";

/**
 * Enough of the Storage interface for the store, plus a look inside at what
 * was written.
 *
 * @param {Record<string, string>} [entries]
 * @returns {object}
 */
function fakeStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {
    items: data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

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

/** The four keys the app keeps its data under, and the versions beside them. */
const DATA_KEYS = [
  "kspRemoteTechPlanner.settings",
  "kspRemoteTechPlanner.inputData",
  "kspRemoteTechPlanner.userBody",
  "kspRemoteTechPlanner.userAntenna",
  "kspRemoteTechPlanner.userCraft",
];
const VERSION_KEYS = [
  "kspRemoteTechPlanner.settingsVersion",
  "kspRemoteTechPlanner.inputDataVersion",
  "kspRemoteTechPlanner.userBodyVersion",
  "kspRemoteTechPlanner.userAntennaVersion",
  "kspRemoteTechPlanner.userCraftVersion",
];

const USER_BODY = { color: "rgb(1,2,3)", radius: 200, stdGravity: 65, soi: 2429 };
const USER_ANTENNA = { type: "omni", range: 1234, elcNeeded: 0.42 };

describe("defaults", () => {
  it("starts a fresh storage on the stock chain and settings", () => {
    const storage = fakeStorage();
    const store = createStore(storage);

    assert.deepEqual(store.chain.value, {
      body: "Kerbin",
      count: 4,
      altitude: 1000,
      elcNeeded: 0.029,
      antennas: [{ antenna: "Communotron 16", quantity: 1 }],
      antennaIndex: 0,
      parkingAlt: 70,
    });
    assert.deepEqual(store.settings.value, {
      stockData: "stock",
      commSystem: "stock",
      rangeMultiplier: 1,
      multipleAntennaMultiplier: 0,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: false,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: false,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: false,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    });
    assert.deepEqual(store.userBodies.value, {});
    assert.deepEqual(store.userAntennas.value, {});
    assert.equal(store.body.value.name, "Kerbin");
  });

  it("reads back what an earlier visit wrote", () => {
    const storage = fakeStorage();
    const first = createStore(storage);
    const settings = {
      stockData: "rss",
      commSystem: "stock",
      rangeMultiplier: 3,
      multipleAntennaMultiplier: 0.5,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: true,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: true,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: false,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    };
    const chain = {
      body: "Mun",
      count: 6,
      altitude: 250,
      elcNeeded: 0.1,
      antennas: [{ antenna: "Communotron 16", quantity: 3 }],
      antennaIndex: -1,
      parkingAlt: 120,
    };

    first.updateSettings(settings);
    first.updateChain(chain);

    const second = createStore(storage);

    assert.deepEqual(second.settings.value, settings);
    assert.deepEqual(second.chain.value, chain);
    // -1 is the slot that asks for the omnidirectional antennas as one.
    assert.equal(second.selectedAntenna.value.name, "Multiple Antenna Multiplier");
  });
});

describe("the keys it writes", () => {
  it("uses the angular-local-storage prefix and nothing else", () => {
    const storage = fakeStorage();
    const store = createStore(storage);

    // Empty dictionaries are removed rather than written, so a body, an
    // antenna, and a craft are what put the last three keys there.
    store.saveBody("Home", USER_BODY);
    store.saveAntenna("Mine", USER_ANTENNA);
    store.saveCraft("Test", [{ antenna: "Communotron 16", quantity: 1 }]);
    store.updateSettings({ rangeMultiplier: 2 });
    store.updateChain({ count: 3 });

    assert.deepEqual([...storage.items.keys()].sort(), [...DATA_KEYS, ...VERSION_KEYS].sort());
    assert.equal(storage.getItem("kspRemoteTechPlanner.settingsVersion"), "4");
    assert.equal(storage.getItem("kspRemoteTechPlanner.inputDataVersion"), "2");
    assert.equal(storage.getItem("kspRemoteTechPlanner.userBodyVersion"), "2");
    assert.equal(storage.getItem("kspRemoteTechPlanner.userAntennaVersion"), "2");
    assert.equal(storage.getItem("kspRemoteTechPlanner.userCraftVersion"), "1");
  });

  it("removes the user keys rather than writing empty dictionaries", () => {
    // An empty dictionary is in storage on arrival, so the store has to take
    // it out again: leaving it would leave "{}" behind.
    const storage = fakeStorage({
      "kspRemoteTechPlanner.userBody": "{}",
      "kspRemoteTechPlanner.userAntenna": "{}",
    });

    createStore(storage);

    assert.equal(storage.getItem("kspRemoteTechPlanner.userBody"), null);
    assert.equal(storage.getItem("kspRemoteTechPlanner.userAntenna"), null);
    assert.equal(storage.items.has("kspRemoteTechPlanner.userBody"), false);
    assert.equal(storage.items.has("kspRemoteTechPlanner.userAntenna"), false);
  });

  it("writes the user body key again once there is a body to write", () => {
    const storage = fakeStorage({
      "kspRemoteTechPlanner.userBody": "{}",
      "kspRemoteTechPlanner.userAntenna": "{}",
    });
    const store = createStore(storage);

    store.saveBody("Home", USER_BODY);

    assert.deepEqual(JSON.parse(storage.getItem("kspRemoteTechPlanner.userBody")), {
      Home: { ...USER_BODY, name: "Home" },
    });
  });
});

describe("migrateChain", () => {
  it("turns the pre-1.5 single antenna into a list of one", () => {
    assert.deepEqual(
      migrateChain({
        body: "Mun",
        count: 3,
        altitude: 500,
        elcNeeded: 0.02,
        antenna: "Communotron 16-S",
        antennaIndex: 0,
        parkingAlt: 90,
      }),
      {
        body: "Mun",
        count: 3,
        altitude: 500,
        elcNeeded: 0.02,
        antennas: [{ antenna: "Communotron 16-S", quantity: 1 }],
        antennaIndex: 0,
        parkingAlt: 90,
      },
    );
  });

  it("takes the names out of the records 1.5 held whole", () => {
    assert.deepEqual(
      migrateChain({
        body: { name: "Mun", color: "rgb(128,128,128)", radius: 200, stdGravity: 62.5, soi: 2459 },
        count: 3,
        altitude: 500,
        elcNeeded: 0.02,
        antennas: [
          {
            antenna: { name: "Communotron 16-S", type: "omni", range: 1500, elcNeeded: 0.02 },
            quantity: 2,
          },
        ],
        antennaIndex: 0,
        parkingAlt: 90,
      }),
      {
        body: "Mun",
        count: 3,
        altitude: 500,
        elcNeeded: 0.02,
        antennas: [{ antenna: "Communotron 16-S", quantity: 2 }],
        antennaIndex: 0,
        parkingAlt: 90,
      },
    );
  });

  it("falls back to the defaults for an empty object", () => {
    assert.deepEqual(migrateChain({}), {
      body: "Kerbin",
      count: 4,
      altitude: 1000,
      elcNeeded: 0.029,
      antennas: [{ antenna: "Communotron 16", quantity: 1 }],
      antennaIndex: 0,
      parkingAlt: 70,
    });
  });

  it("falls back to the defaults for null fields rather than throwing", () => {
    assert.deepEqual(migrateChain({ body: null, count: "four", antennas: [] }), {
      body: "Kerbin",
      count: 4,
      altitude: 1000,
      elcNeeded: 0.029,
      antennas: [{ antenna: "Communotron 16", quantity: 1 }],
      antennaIndex: 0,
      parkingAlt: 70,
    });
  });

  it("pulls counts and quantities up to one", () => {
    const chain = migrateChain({
      count: 0,
      antennas: [
        { antenna: "RA-100", quantity: 0 },
        { antenna: "Communotron 16", quantity: -3 },
      ],
    });

    assert.equal(chain.count, 1);
    assert.deepEqual(chain.antennas, [
      { antenna: "RA-100", quantity: 1 },
      { antenna: "Communotron 16", quantity: 1 },
    ]);
  });
});

describe("migrateUserAntennas", () => {
  it("turns the pre-1.5 numeric types into words", () => {
    const antennas = {
      "Old Dish": { type: 1, range: 2000, elcNeeded: 0.1 },
      "Old Dish As Text": { type: "1", range: 2000, elcNeeded: 0.1 },
      "Old Omni": { type: 0, range: 1000, elcNeeded: 0.02 },
      "Old Omni As Text": { type: "0", range: 1000, elcNeeded: 0.02 },
    };

    assert.deepEqual(migrateUserAntennas(antennas), {
      "Old Dish": { name: "Old Dish", type: "dish", range: 2000, elcNeeded: 0.1 },
      "Old Dish As Text": { name: "Old Dish As Text", type: "dish", range: 2000, elcNeeded: 0.1 },
      "Old Omni": { name: "Old Omni", type: "omni", range: 1000, elcNeeded: 0.02 },
      "Old Omni As Text": { name: "Old Omni As Text", type: "omni", range: 1000, elcNeeded: 0.02 },
    });
  });
});

describe("migrateSettings", () => {
  it("drops the rangeModelType 1.6.x wrote and nothing else", () => {
    const settings = migrateSettings({
      stockData: "rss",
      rangeMultiplier: 2,
      multipleAntennaMultiplier: 0.5,
      rangeModelType: 3,
    });

    assert.deepEqual(settings, {
      stockData: "rss",
      commSystem: "stock",
      rangeMultiplier: 2,
      multipleAntennaMultiplier: 0.5,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: true,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: true,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: true,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    });
    // Check all expected keys are present
    assert.ok("stockData" in settings);
    assert.ok("commSystem" in settings);
    assert.ok("rangeMultiplier" in settings);
    assert.ok("multipleAntennaMultiplier" in settings);
    assert.ok("rangeModifier" in settings);
    assert.ok("DSNModifier" in settings);
    assert.ok("targetDSN" in settings);
    assert.ok("rangeDisplayMode" in settings);
    assert.ok("rtEnabled" in settings);
    assert.ok("rtRangeMultiplier" in settings);
    assert.ok("rtConsumptionMultiplier" in settings);
    assert.ok("rtMissionControlRangeMultiplier" in settings);
    assert.ok("rtOmniRangeClampFactor" in settings);
    assert.ok("rtDishRangeClampFactor" in settings);
    assert.ok("rtMultipleAntennaMultiplier" in settings);
    assert.ok("raEnabled" in settings);
    assert.ok("raRangeMultiplier" in settings);
    assert.ok("raConsumptionMultiplier" in settings);
    assert.ok("raPlannerActiveTxTime" in settings);
    assert.ok("raMultipleAntennaMultiplier" in settings);
    assert.ok("raTargetTechLevel" in settings);
    assert.ok("rtTargetTechLevel" in settings);
    assert.ok("nfeEnabled" in settings);
    assert.ok("nfeRangeMultiplier" in settings);
    assert.ok("nfeConsumptionMultiplier" in settings);
    assert.ok("nfeMultipleAntennaMultiplier" in settings);
    assert.equal(Object.keys(settings).length, 27);
  });
});

describe("derived state", () => {
  it("resolves the chain's body name to the stock body", () => {
    const store = createStore(fakeStorage());
    const mun = STOCK_BODIES.find((body) => body.name === "Mun");

    store.updateChain({ body: "Mun" });

    assert.equal(store.body.value, mun);
    assert.equal(store.body.value.radius, 200);
  });

  it("falls back to Kerbin for a body name nothing knows", () => {
    const store = createStore(fakeStorage());
    const kerbin = STOCK_BODIES.find((body) => body.name === "Kerbin");

    store.updateChain({ body: "Nowhere in particular" });

    assert.equal(store.body.value, kerbin);
    assert.equal(store.body.value.name, "Kerbin");
  });

  it("selects the chain's antenna, or the multiple antenna multiplier for -1", () => {
    const store = createStore(fakeStorage());
    store.updateSettings({ rangeDisplayMode: "dsn" });

    // Communotron 16 range to DSN L3: sqrt(500k * 250G) / 1000 = 353,553 km
    assert.equal(store.selectedAntenna.value.name, "Communotron 16");
    closeTo(store.selectedAntenna.value.range, 353553.39, 0.01);

    store.addAntenna("Comms DTS-M1");
    store.updateChain({ antennaIndex: 1 });
    // Comms DTS-M1 to DSN L3: sqrt(2G * 250G) / 1000 = 22,360,680 km
    closeTo(store.selectedAntenna.value.range, 22360680, 1);

    store.updateChain({ antennaIndex: -1 });
    assert.equal(store.selectedAntenna.value.name, "Multiple Antenna Multiplier");
    // MAM with multiplier=0 uses longest omni (Comms DTS-M1 at 22,360,680 km)
    closeTo(store.selectedAntenna.value.range, 22360680, 1);
  });

  it("applies the range multiplier to every antenna and to the combined one", () => {
    const store = createStore(fakeStorage());
    store.updateSettings({ rangeDisplayMode: "dsn" });

    // Base range for Communotron 16 to DSN L3
    closeTo(store.mam.value.range, 353553.39, 0.01);
    closeTo(store.selectedAntenna.value.range, 353553.39, 0.01);

    store.updateSettings({ rangeMultiplier: 2 });

    // With rangeMultiplier=2, range doubles (sqrt(2) for power, but range is linear with multiplier)
    closeTo(store.selectedAntenna.value.range, 707106.78, 0.01);
    closeTo(store.mam.value.range, 707106.78, 0.01);

    for (const raw of STOCK_ANTENNAS_RAW) {
      if (raw.hidden) continue;
      if (raw.source !== "Squad") continue; // Only test Stock antennas
      const antenna = store.availableAntennas.value.get(raw.name);
      const expected = computeAntennaRange(raw, store.settings.value) * 2;
      closeTo(antenna.range, expected, 0.01);
    }
  });

  function computeAntennaRange(raw, settings) {
    const modifiers = { rangeModifier: settings.rangeModifier, DSNModifier: settings.DSNModifier };
    switch (settings.targetDSN) {
      case "level1":
        return rangeToDSN(raw, "level1", 1, modifiers);
      case "level2":
        return rangeToDSN(raw, "level2", 1, modifiers);
      default:
        return rangeToDSN(raw, "level3", 1, modifiers);
    }
  }

  it("sums the electricity over quantities, whatever the multiplier says", () => {
    const store = createStore(fakeStorage());
    store.updateChain({
      antennas: [
        { antenna: "Communotron 16", quantity: 1 },
        { antenna: "Comms DTS-M1", quantity: 3 },
        { antenna: "RA-100", quantity: 2 },
      ],
    });

    // Stock EC values: Communotron 16 = 20 EC/s, Comms DTS-M1 = 34.29 EC/s
    // RA-100 is a dish, not counted in MAM
    const expectedEC = 20 + 3 * 34.2857142857; // ~122.86
    for (const multipleAntennaMultiplier of [0, 0.5, 1]) {
      store.updateSettings({ multipleAntennaMultiplier });
      closeTo(store.mam.value.elcNeeded, expectedEC);
    }
  });

  it("MAM electricity is NOT affected by rangeMultiplier", () => {
    const store = createStore(fakeStorage());
    store.updateChain({
      antennas: [
        { antenna: "Communotron 16", quantity: 2 },
      ],
    });

    // Communotron 16 = 20 EC/s, quantity 2 = 40 EC/s
    const baseEC = 40;

    // rangeMultiplier should NOT affect EC consumption
    for (const rangeMultiplier of [0.5, 1, 2, 3]) {
      store.updateSettings({ rangeMultiplier, multipleAntennaMultiplier: 0 });
      closeTo(store.mam.value.elcNeeded, baseEC, 1e-6);
    }
  });

  it("RemoteTech MAM electricity is NOT affected by rtRangeMultiplier", () => {
    const store = createStore(fakeStorage());
    store.updateSettings({ commSystem: "remoteTech", rtEnabled: true });
    store.updateChain({
      antennas: [
        { antenna: "Reflectron DP-10 (RemoteTech)", quantity: 2 },
      ],
    });

    // Reflectron DP-10 = 0.01 EC/s, quantity 2 = 0.02 EC/s
    const baseEC = 0.02;

    for (const rtRangeMultiplier of [0.5, 1, 2]) {
      store.updateSettings({ rtRangeMultiplier, rtMultipleAntennaMultiplier: 0 });
      closeTo(store.mam.value.elcNeeded, baseEC, 1e-6);
    }
  });

  it("RealAntennas MAM electricity is NOT affected by raRangeMultiplier", () => {
    const store = createStore(fakeStorage());
    store.updateSettings({ raEnabled: true });
    store.updateChain({
      antennas: [
        { antenna: "Communotron 16-S (RealAntennas)", quantity: 2 },
      ],
    });

    // Communotron 16-S (RealAntennas): TL0 basePower=42W=0.042kW, txPower=30dBm=1W
    // idlePower = 42/1000 = 0.042 kW, activePower = 10^3 / (0.0555/1000) * 1e-6 = 18.018 kW
    // plannerActiveTxTime=0 means only idle: 0.042 kW = 0.042 EC/s per antenna
    // quantity 2 = 0.084 EC/s
    const baseEC = 0.084;

    for (const raRangeMultiplier of [0.5, 1, 2]) {
      store.updateSettings({ raRangeMultiplier, raMultipleAntennaMultiplier: 0, raPlannerActiveTxTime: 0 });
      closeTo(store.mam.value.elcNeeded, baseEC, 1e-3);
    }
  });
});

describe("actions", () => {
  it("addAntenna appends a slot and leaves the selection alone", () => {
    const store = createStore(fakeStorage());
    store.updateChain({ antennaIndex: 0 });

    store.addAntenna("RA-100");

    assert.deepEqual(store.chain.value.antennas, [
      { antenna: "Communotron 16", quantity: 1 },
      { antenna: "RA-100", quantity: 1 },
    ]);
    assert.equal(store.chain.value.antennaIndex, 0);
    assert.equal(store.selectedAntenna.value.name, "Communotron 16");
  });

  it("removeAntenna takes the slot away and pulls the selection back inside the list", () => {
    const store = createStore(fakeStorage());
    store.addAntenna("RA-100");
    store.addAntenna("Comms DTS-M1");
    store.updateChain({ antennaIndex: 2 });

    store.removeAntenna(2);

    assert.deepEqual(store.chain.value.antennas, [
      { antenna: "Communotron 16", quantity: 1 },
      { antenna: "RA-100", quantity: 1 },
    ]);
    assert.equal(store.chain.value.antennaIndex, 1);
    assert.equal(store.selectedAntenna.value.name, "RA-100");
  });

  it("setQuantity rounds and never goes below one", () => {
    const store = createStore(fakeStorage());

    store.setQuantity(0, 2.4);
    assert.equal(store.chain.value.antennas[0].quantity, 2);

    store.setQuantity(0, 0);
    assert.equal(store.chain.value.antennas[0].quantity, 1);

    store.setQuantity(0, -3);
    assert.equal(store.chain.value.antennas[0].quantity, 1);
  });

  it("removeBody moves a chain that named it to Kerbin", () => {
    const store = createStore(fakeStorage());
    store.saveBody("Home", USER_BODY);
    store.updateChain({ body: "Home" });
    assert.equal(store.body.value.name, "Home");

    store.removeBody("Home");

    assert.deepEqual(store.userBodies.value, {});
    assert.equal(store.chain.value.body, "Kerbin");
    assert.equal(store.body.value.name, "Kerbin");
  });

  it("removeAntennaDefinition drops the definition and the slot that named it", () => {
    const store = createStore(fakeStorage());
    store.saveAntenna("Mine", USER_ANTENNA);
    store.addAntenna("Mine");
    store.addAntenna("RA-100");

    store.removeAntennaDefinition("Mine");

    assert.deepEqual(store.userAntennas.value, {});
    assert.deepEqual(store.chain.value.antennas, [
      { antenna: "Communotron 16", quantity: 1 },
      { antenna: "RA-100", quantity: 1 },
    ]);
  });

  it("reset empties the storage and puts the store back to its defaults", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.saveBody("Home", USER_BODY);
    store.saveAntenna("Mine", USER_ANTENNA);
    store.updateSettings({ stockData: "rss", rangeMultiplier: 4, multipleAntennaMultiplier: 0.5 });
    store.updateChain({ body: "Mun", count: 6, altitude: 250 });

    store.reset();

    // The defaults the store has just gone back to are written out again, and
    // the version markers stay: they are what a later version of the app reads
    // to know the shape of whatever it finds.
    assert.deepEqual(
      [...storage.items.keys()].sort(),
      [...VERSION_KEYS, "kspRemoteTechPlanner.inputData", "kspRemoteTechPlanner.settings"].sort(),
      "the defaults and the four version keys should be left",
    );
    assert.deepEqual(JSON.parse(storage.items.get("kspRemoteTechPlanner.settings")), {
      stockData: "stock",
      commSystem: "stock",
      rangeMultiplier: 1,
      multipleAntennaMultiplier: 0,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: false,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: false,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: false,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    });
    assert.deepEqual(store.settings.value, {
      stockData: "stock",
      commSystem: "stock",
      rangeMultiplier: 1,
      multipleAntennaMultiplier: 0,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: false,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: false,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: false,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    });
    assert.deepEqual(store.chain.value, {
      body: "Kerbin",
      count: 4,
      altitude: 1000,
      elcNeeded: 0.029,
      antennas: [{ antenna: "Communotron 16", quantity: 1 }],
      antennaIndex: 0,
      parkingAlt: 70,
    });
    assert.deepEqual(store.userBodies.value, {});
    assert.deepEqual(store.userAntennas.value, {});
  });
});

describe("export/import", () => {
  it("exportData produces JSON with all keys and versions", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.updateSettings({ stockData: "rss", rangeMultiplier: 2 });
    store.saveBody("Home", USER_BODY);
    store.saveAntenna("Mine", USER_ANTENNA);

    // Simulate what exportData does
    const data = {
      [KEYS.settings]: store.settings.value,
      [KEYS.settingsVersion]: storage.getItem(KEYS.settingsVersion),
      [KEYS.chain]: store.chain.value,
      [KEYS.chainVersion]: storage.getItem(KEYS.chainVersion),
      [KEYS.userBodies]: store.userBodies.value,
      [KEYS.userBodiesVersion]: storage.getItem(KEYS.userBodiesVersion),
      [KEYS.userAntennas]: store.userAntennas.value,
      [KEYS.userAntennasVersion]: storage.getItem(KEYS.userAntennasVersion),
    };

    assert.ok(data[KEYS.settings]);
    assert.ok(data[KEYS.settingsVersion]);
    assert.ok(data[KEYS.chain]);
    assert.ok(data[KEYS.chainVersion]);
    assert.ok(data[KEYS.userBodies]);
    assert.ok(data[KEYS.userBodiesVersion]);
    assert.ok(data[KEYS.userAntennas]);
    assert.ok(data[KEYS.userAntennasVersion]);
    assert.deepEqual(data[KEYS.settings], {
      stockData: "rss",
      commSystem: "stock",
      rangeMultiplier: 2,
      multipleAntennaMultiplier: 0,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: false,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: false,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: false,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    });
    assert.deepEqual(data[KEYS.userBodies], { Home: { ...USER_BODY, name: "Home" } });
    assert.deepEqual(data[KEYS.userAntennas], { Mine: { ...USER_ANTENNA, name: "Mine" } });
  });

  it("importData restores all keys and versions to localStorage", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.updateSettings({ stockData: "rss", rangeMultiplier: 2 });
    store.saveBody("Home", USER_BODY);
    store.saveAntenna("Mine", USER_ANTENNA);

    const exported = {
      [KEYS.settings]: store.settings.value,
      [KEYS.settingsVersion]: storage.getItem(KEYS.settingsVersion),
      [KEYS.chain]: store.chain.value,
      [KEYS.chainVersion]: storage.getItem(KEYS.chainVersion),
      [KEYS.userBodies]: store.userBodies.value,
      [KEYS.userBodiesVersion]: storage.getItem(KEYS.userBodiesVersion),
      [KEYS.userAntennas]: store.userAntennas.value,
      [KEYS.userAntennasVersion]: storage.getItem(KEYS.userAntennasVersion),
    };

    // Clear and re-import
    const freshStorage = fakeStorage();
    for (const [key, value] of Object.entries(exported)) {
      if (value !== null) {
        freshStorage.setItem(key, JSON.stringify(value));
      } else {
        freshStorage.removeItem(key);
      }
    }

    const restored = createStore(freshStorage);

    assert.deepEqual(restored.settings.value, {
      stockData: "rss",
      commSystem: "stock",
      rangeMultiplier: 2,
      multipleAntennaMultiplier: 0,
      rangeModifier: 1.0,
      DSNModifier: 1.0,
      targetDSN: "level3",
      rangeDisplayMode: "antenna",
      rtEnabled: false,
      rtRangeMultiplier: 1.0,
      rtConsumptionMultiplier: 1.0,
      rtMissionControlRangeMultiplier: 1.0,
      rtOmniRangeClampFactor: 100,
      rtDishRangeClampFactor: 1000,
      rtMultipleAntennaMultiplier: 0,
      rtRangeModelType: "Standard",
      rtTargetTechLevel: 3,
      raEnabled: false,
      raRangeMultiplier: 1.0,
      raConsumptionMultiplier: 1.0,
      raPlannerActiveTxTime: 0,
      raMultipleAntennaMultiplier: 0,
      raTargetTechLevel: 9,
      nfeEnabled: false,
      nfeRangeMultiplier: 1.0,
      nfeConsumptionMultiplier: 1.0,
      nfeMultipleAntennaMultiplier: 0,
    });
    assert.deepEqual(restored.userBodies.value, { Home: { ...USER_BODY, name: "Home" } });
    assert.deepEqual(restored.userAntennas.value, { Mine: { ...USER_ANTENNA, name: "Mine" } });
    assert.equal(restored.chain.value.body, "Mercury"); // RSS first body
    assert.equal(restored.settings.value.rangeMultiplier, 2);
  });

  it("importData with null values removes those keys", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.saveBody("Home", USER_BODY);

    const exported = {
      [KEYS.settings]: store.settings.value,
      [KEYS.settingsVersion]: storage.getItem(KEYS.settingsVersion),
      [KEYS.chain]: store.chain.value,
      [KEYS.chainVersion]: storage.getItem(KEYS.chainVersion),
      [KEYS.userBodies]: store.userBodies.value,
      [KEYS.userBodiesVersion]: storage.getItem(KEYS.userBodiesVersion),
      [KEYS.userAntennas]: null, // explicitly null
      [KEYS.userAntennasVersion]: null,
    };

    const freshStorage = fakeStorage();
    for (const [key, value] of Object.entries(exported)) {
      if (value !== null) {
        freshStorage.setItem(key, JSON.stringify(value));
      } else {
        freshStorage.removeItem(key);
      }
    }

    const restored = createStore(freshStorage);

    assert.deepEqual(restored.userBodies.value, { Home: { ...USER_BODY, name: "Home" } });
    assert.deepEqual(restored.userAntennas.value, {}); // empty because key was removed
  });
});

describe("crafts", () => {
  it("migrateUserCrafts handles empty input", () => {
    assert.deepEqual(migrateUserCrafts(null), {});
    assert.deepEqual(migrateUserCrafts({}), {});
  });

  it("migrateUserCrafts converts antennas array to slots with quantities", () => {
    const input = {
      "My Craft": {
        name: "My Craft",
        antennas: [
          { antenna: "Communotron 16", quantity: 2 },
          { antenna: "RA-100", quantity: 1 },
        ],
      },
    };
    const result = migrateUserCrafts(input);
    assert.deepEqual(result["My Craft"], {
      name: "My Craft",
      antennas: [
        { antenna: "Communotron 16", quantity: 2 },
        { antenna: "RA-100", quantity: 1 },
      ],
    });
  });

  it("migrateUserCrafts handles legacy format with antenna objects", () => {
    const input = {
      "Old Craft": {
        name: "Old Craft",
        antennas: [
          { antenna: { name: "Communotron 16" }, quantity: 1 },
          { antenna: { name: "RA-100" }, quantity: 3 },
        ],
      },
    };
    const result = migrateUserCrafts(input);
    assert.deepEqual(result["Old Craft"].antennas, [
      { antenna: "Communotron 16", quantity: 1 },
      { antenna: "RA-100", quantity: 3 },
    ]);
  });

  it("migrateUserCrafts filters out antennas with no name", () => {
    const input = {
      "Bad Craft": {
        name: "Bad Craft",
        antennas: [
          { antenna: "Communotron 16", quantity: 1 },
          { antenna: undefined, quantity: 2 },
          { antenna: null, quantity: 3 },
          { quantity: 4 },
        ],
      },
    };
    const result = migrateUserCrafts(input);
    assert.deepEqual(result["Bad Craft"].antennas, [{ antenna: "Communotron 16", quantity: 1 }]);
  });

  it("saveCraft stores the current antenna list", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.saveCraft("Test Craft", [
      { antenna: "Communotron 16", quantity: 2 },
      { antenna: "RA-100", quantity: 1 },
    ]);
    assert.deepEqual(store.userCrafts.value["Test Craft"], {
      name: "Test Craft",
      antennas: [
        { antenna: "Communotron 16", quantity: 2 },
        { antenna: "RA-100", quantity: 1 },
      ],
    });
    assert.equal(storage.getItem(KEYS.userCrafts), JSON.stringify(store.userCrafts.value));
  });

  it("removeCraft deletes a craft", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.saveCraft("To Delete", [{ antenna: "Communotron 16", quantity: 1 }]);
    store.removeCraft("To Delete");
    assert.deepEqual(store.userCrafts.value, {});
    // Empty objects are removed from storage, not written as "{}"
    assert.equal(storage.getItem(KEYS.userCrafts), null);
  });

  it("renameCraft changes the craft name", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.saveCraft("Old Name", [{ antenna: "Communotron 16", quantity: 1 }]);
    store.renameCraft("Old Name", "New Name");
    assert.ok(!("Old Name" in store.userCrafts.value));
    assert.deepEqual(store.userCrafts.value["New Name"], {
      name: "New Name",
      antennas: [{ antenna: "Communotron 16", quantity: 1 }],
    });
  });

  it("loadCraft replaces the chain antennas and resets antennaIndex", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.saveCraft("Load Me", [
      { antenna: "Communotron 16", quantity: 2 },
      { antenna: "RA-100", quantity: 1 },
    ]);
    // Modify the chain
    store.updateChain({ count: 7, altitude: 5000, antennas: [{ antenna: "Communotron 16", quantity: 1 }], antennaIndex: 0 });
    const ok = store.loadCraft("Load Me");
    assert.ok(ok);
    assert.deepEqual(store.chain.value.antennas, [
      { antenna: "Communotron 16", quantity: 2 },
      { antenna: "RA-100", quantity: 1 },
    ]);
    assert.equal(store.chain.value.antennaIndex, 0);
  });

  it("loadCraft fails and leaves chain unchanged when no antennas available", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    // Save a craft with an antenna that doesn't exist in available antennas
    store.saveCraft("Missing", [{ antenna: "Nonexistent Antenna", quantity: 1 }]);
    const originalAntennas = [...store.chain.value.antennas];
    const ok = store.loadCraft("Missing");
    assert.ok(!ok);
    assert.deepEqual(store.chain.value.antennas, originalAntennas);
  });

  it("loadCraft filters out missing antennas and loads the rest", () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    // Save a craft with one real and one fake antenna
    store.saveCraft("Mixed", [
      { antenna: "Communotron 16", quantity: 2 },
      { antenna: "Nonexistent", quantity: 1 },
    ]);
    const ok = store.loadCraft("Mixed");
    assert.ok(ok);
    assert.deepEqual(store.chain.value.antennas, [{ antenna: "Communotron 16", quantity: 2 }]);
    assert.equal(store.chain.value.antennaIndex, 0);
  });
});
