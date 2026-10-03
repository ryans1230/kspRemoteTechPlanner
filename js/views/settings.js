/**
 * The settings tab: which dataset the stock lists come from, how far every
 * antenna reaches, how much the omnidirectional antennas are worth counted
 * together, and a way to clear everything.
 *
 * @module
 */

import { computed } from "../reactive.js";
import { each, element, html } from "../html.js";
import { length, number } from "../format.js";
import { numberField, selectField } from "./field.js";
import { KEYS } from "../store.js";

/** @typedef {import("../store.js").Store} Store */

/**
 * The confirmation behind "Clear all data".
 *
 * The markup is built once and its dialog element is moved in and out of the
 * document as it is opened and closed, so opening it twice does not leave two
 * dialogs behind.
 *
 * @param {Store} store
 * @returns {{open: () => void, markup: import("../html.js").Fragment}}
 */
function clearEverything(store) {
  const lost = computed(() => [
    "The chain on the planner, with its antennas",
    `The ${number(Object.keys(store.userBodies.value).length)} bodies you have added`,
    `The ${number(Object.keys(store.userAntennas.value).length)} antennas you have added`,
    `The ${number(Object.keys(store.userCrafts.value).length)} crafts you have saved`,
    "These settings",
  ]);

  const markup = html`
    <dialog>
      <h3>Clear everything?</h3>
      <p>This will clear:</p>
      <ul>
        ${each(
          lost,
          (item) => item,
          (item) => html`<li>${computed(() => item)}</li>`,
        )}
      </ul>
      <p class="hint">There is no undo, and nothing is kept anywhere else.</p>
      <div class="actions">
        <button type="button" class="danger" @click=${clear}>Clear it</button>
        <button type="button" @click=${dismiss}>Keep my data</button>
      </div>
    </dialog>
  `;

  const node = /** @type {HTMLDialogElement} */ (element(markup));

  function dismiss() {
    if (node.open) node.close();
    node.remove();
  }

  function clear() {
    store.reset();
    dismiss();
  }

  return {
    open() {
      document.body.append(node);
      node.showModal();
    },
    markup,
  };
}

/**
 * Export all planner data to a JSON file.
 *
 * @param {Store} store
 * @returns {void}
 */
function exportData(store) {
  const data = {
    [KEYS.settings]: store.settings.value,
    [KEYS.settingsVersion]: localStorage.getItem(KEYS.settingsVersion),
    [KEYS.chain]: store.chain.value,
    [KEYS.chainVersion]: localStorage.getItem(KEYS.chainVersion),
    [KEYS.userBodies]: store.userBodies.value,
    [KEYS.userBodiesVersion]: localStorage.getItem(KEYS.userBodiesVersion),
    [KEYS.userAntennas]: store.userAntennas.value,
    [KEYS.userAntennasVersion]: localStorage.getItem(KEYS.userAntennasVersion),
    [KEYS.userCrafts]: store.userCrafts.value,
    [KEYS.userCraftsVersion]: localStorage.getItem(KEYS.userCraftsVersion),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kspRemoteTechPlanner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import planner data from a JSON file.
 *
 * @param {Store} store
 * @param {File} file
 * @returns {Promise<void>}
 */
async function importData(store, file) {
  const text = await file.text();
  const data = JSON.parse(text);
  for (const [key, value] of Object.entries(data)) {
    if (value !== null) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.removeItem(key);
    }
  }
  location.reload();
}

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function settingsView(store) {
  const settings = store.settings;
  const clearing = clearEverything(store);

  return html`
    <div class="stack">
      <h2>Settings</h2>

      <section class="card">
        <h3>Part Groups</h3>
        <p class="hint">Enable or disable antenna part groups. Stock is always enabled.</p>
        <div class="stack">
          <label class="checkbox-row">
            <input type="checkbox" checked disabled />
            <span>Stock Kerbal Space Program</span>
          </label>
          <label class="checkbox-row">
            <input
              type="checkbox"
              .checked=${settings.value.rtEnabled}
              @change=${(e) => store.updateSettings({ rtEnabled: e.target.checked })}
            />
            <span>RemoteTech</span>
          </label>
          <label class="checkbox-row">
            <input
              type="checkbox"
              .checked=${settings.value.raEnabled}
              @change=${(e) => store.updateSettings({ raEnabled: e.target.checked })}
            />
            <span>RealAntennas</span>
          </label>
          <label class="checkbox-row">
            <input
              type="checkbox"
              .checked=${settings.value.nfeEnabled}
              @change=${(e) => store.updateSettings({ nfeEnabled: e.target.checked })}
            />
            <span>NearFutureExploration</span>
          </label>
        </div>
      </section>

      <section class="card">
        <h3>Communication System</h3>
        ${selectField({
          label: "Which comms system to simulate",
          options: [
            { value: "stock", label: "Stock CommNet" },
            { value: "remoteTech", label: "RemoteTech" },
            { value: "realAntennas", label: "RealAntennas" },
          ],
          follow: () => settings.value.commSystem,
          onInput: (value) => store.updateSettings({ commSystem: value }),
        })}
        <p class="hint">
          Stock CommNet uses the game's built-in relay network with geometric mean range. RemoteTech
          uses its own antenna modules with min-range clamping and optional Root model. RealAntennas
          uses a detailed link budget with dish diameter, frequency, tech level, and encoder.
        </p>
      </section>

      <section class="card">
        <h3>Stock Data</h3>
        ${selectField({
          label: "Which list the selectors show",
          options: [
            { value: "stock", label: "Stock Kerbal Space Program" },
            { value: "rss", label: "Real Solar System" },
          ],
          follow: () => settings.value.stockData,
          onInput: (value) =>
            store.updateSettings({ stockData: value === "rss" ? "rss" : "stock" }),
        })}
        <p class="hint">
          Real Solar System scales the same names to a whole solar system, so the lists differ in
          their numbers rather than in their bodies.
        </p>
      </section>

      <!-- Stock CommNet Settings -->
      ${computed(() =>
        settings.value.commSystem === "stock"
          ? html`
              <section class="card">
                <h3>Stock CommNet Range</h3>

                ${numberField({
                  label: "Range multiplier",
                  min: 0,
                  max: 1000,
                  step: 0.1,
                  follow: () => settings.value.rangeMultiplier,
                  readout: () => `${number(settings.value.rangeMultiplier)}x`,
                  onInput: (rangeMultiplier) => store.updateSettings({ rangeMultiplier }),
                })}
                <p class="hint">
                  Every stock range times this. RemoteTech applies a multiplier of its own, so set
                  this to the same value to have the plots agree with it.
                </p>

                ${selectField({
                  label: "Target for range display",
                  options: [
                    { value: "level1", label: "DSN Level 1 (2 Gm)" },
                    { value: "level2", label: "DSN Level 2 (50 Gm)" },
                    { value: "level3", label: "DSN Level 3 (250 Gm)" },
                  ],
                  follow: () => settings.value.targetDSN,
                  onInput: (value) => store.updateSettings({ targetDSN: value }),
                })}
                <p class="hint">
                  Which ground station the antenna range is shown against. DSN Level 3 is the fully
                  upgraded Kerbal Space Center tracking station.
                </p>

                ${selectField({
                  label: "Range display mode",
                  options: [
                    { value: "dsn", label: "To DSN (ground station)" },
                    { value: "antenna", label: "Antenna-to-antenna (relay)" },
                  ],
                  follow: () => settings.value.rangeDisplayMode,
                  onInput: (value) => store.updateSettings({ rangeDisplayMode: value }),
                })}
                <p class="hint">
                  DSN: range from antenna to ground station. Antenna-to-antenna: range between two
                  identical antennas (relay-to-relay hop).
                </p>

                ${numberField({
                  label: "Range modifier (difficulty)",
                  min: 0.1,
                  max: 10,
                  step: 0.05,
                  follow: () => settings.value.rangeModifier,
                  readout: () => number(settings.value.rangeModifier),
                  onInput: (value) => store.updateSettings({ rangeModifier: value }),
                })}
                <p class="hint">
                  Multiplies all vessel antenna power. Matches game difficulty: Easy=1.5,
                  Normal=1.0, Hard=0.65.
                </p>

                ${numberField({
                  label: "DSN modifier",
                  min: 0.1,
                  max: 10,
                  step: 0.05,
                  follow: () => settings.value.DSNModifier,
                  readout: () => number(settings.value.DSNModifier),
                  onInput: (value) => store.updateSettings({ DSNModifier: value }),
                })}
                <p class="hint">
                  Multiplies DSN ground station power. Independent of vessel range modifier.
                </p>

                ${numberField({
                  label: "Multiple antenna multiplier",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  follow: () => settings.value.multipleAntennaMultiplier,
                  readout: () => number(settings.value.multipleAntennaMultiplier),
                  onInput: (value) => store.updateSettings({ multipleAntennaMultiplier: value }),
                })}
                <table class="data">
                  <tbody>
                    <tr>
                      <td>Longest omnidirectional antenna alone</td>
                      <td class="numeric">${computed(() => length(longestOmni(store)))}</td>
                    </tr>
                    <tr>
                      <td>Counted together</td>
                      <td class="numeric">${computed(() => length(store.mam.value.range))}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="hint">
                  At zero the omnidirectional antennas count as one antenna of the longest one's
                  range, at one as one antenna of all of them, and in between as much of the
                  difference as you set. Pick the combined figure in
                  <a href="#planner">the planner</a> to plan with it.
                </p>
              </section>
            `
          : "",
      )}

      <!-- NearFutureExploration Settings (when Stock CommNet is selected and NFE enabled) -->
      ${computed(() =>
        settings.value.commSystem === "stock" && settings.value.nfeEnabled
          ? html`
              <section class="card">
                <h3>NearFutureExploration</h3>
                <p class="hint">
                  Uses Stock CommNet formula; shares target DSN, display mode, range/DSN modifiers.
                </p>

                ${numberField({
                  label: "Range multiplier",
                  min: 0,
                  max: 1000,
                  step: 0.1,
                  follow: () => settings.value.nfeRangeMultiplier,
                  readout: () => `${number(settings.value.nfeRangeMultiplier)}x`,
                  onInput: (value) => store.updateSettings({ nfeRangeMultiplier: value }),
                })}
                <p class="hint">Multiplies NFE antenna ranges independently from Stock.</p>

                ${numberField({
                  label: "Consumption multiplier",
                  min: 0.1,
                  max: 10,
                  step: 0.05,
                  follow: () => settings.value.nfeConsumptionMultiplier,
                  readout: () => number(settings.value.nfeConsumptionMultiplier),
                  onInput: (value) => store.updateSettings({ nfeConsumptionMultiplier: value }),
                })}
                <p class="hint">
                  Multiplies NFE antenna EC/s consumption independently from Stock.
                </p>

                ${numberField({
                  label: "Multiple antenna multiplier",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  follow: () => settings.value.nfeMultipleAntennaMultiplier,
                  readout: () => number(settings.value.nfeMultipleAntennaMultiplier),
                  onInput: (value) => store.updateSettings({ nfeMultipleAntennaMultiplier: value }),
                })}
                <table class="data">
                  <tbody>
                    <tr>
                      <td>Longest omnidirectional antenna alone</td>
                      <td class="numeric">${computed(() => length(longestOmni(store)))}</td>
                    </tr>
                    <tr>
                      <td>Counted together</td>
                      <td class="numeric">${computed(() => length(store.mam.value.range))}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="hint">
                  At zero the omnidirectional antennas count as one antenna of the longest one's
                  range, at one as one antenna of all of them, and in between as much of the
                  difference as you set. Pick the combined figure in
                  <a href="#planner">the planner</a> to plan with it.
                </p>
              </section>
            `
          : "",
      )}

      <!-- RemoteTech Settings -->
      ${computed(() =>
        settings.value.commSystem === "remoteTech"
          ? html`
              <section class="card">
                <h3>RemoteTech Range</h3>

                ${numberField({
                  label: "Range multiplier",
                  min: 0,
                  max: 1000,
                  step: 0.1,
                  follow: () => settings.value.rtRangeMultiplier,
                  readout: () => `${number(settings.value.rtRangeMultiplier)}x`,
                  onInput: (value) => store.updateSettings({ rtRangeMultiplier: value }),
                })}
                <p class="hint">
                  Multiplies all antenna ranges (omni and dish). Equivalent to Stock's range
                  multiplier.
                </p>

                ${numberField({
                  label: "Consumption multiplier",
                  min: 0.1,
                  max: 10,
                  step: 0.05,
                  follow: () => settings.value.rtConsumptionMultiplier,
                  readout: () => number(settings.value.rtConsumptionMultiplier),
                  onInput: (value) => store.updateSettings({ rtConsumptionMultiplier: value }),
                })}
                <p class="hint">Multiplies all antenna EC/s consumption.</p>

                ${numberField({
                  label: "Mission Control range multiplier",
                  min: 0.1,
                  max: 10,
                  step: 0.05,
                  follow: () => settings.value.rtMissionControlRangeMultiplier,
                  readout: () => number(settings.value.rtMissionControlRangeMultiplier),
                  onInput: (value) =>
                    store.updateSettings({ rtMissionControlRangeMultiplier: value }),
                })}
                <p class="hint">
                  Multiplies the KSC ground station range (default 75 Mm omni). Independent of
                  vessel range multiplier.
                </p>

                ${selectField({
                  label: "Mission Control tech level",
                  options: [
                    { value: 1, label: "Tier 1: 4 Mm omni" },
                    { value: 2, label: "Tier 2: 30 Mm omni" },
                    { value: 3, label: "Tier 3: 75 Mm omni (default)" },
                  ],
                  follow: () => settings.value.rtTargetTechLevel,
                  onInput: (value) => store.updateSettings({ rtTargetTechLevel: Number(value) }),
                })}
                <p class="hint">
                  RemoteTech Mission Control has 3 upgrade tiers (4 Mm, 30 Mm, 75 Mm).
                  In career mode with "Upgradeable Mission Control Antennas" enabled,
                  this follows the Tracking Station level. In sandbox or with upgrades
                  disabled, it stays at Tier 3 (75 Mm).
                </p>

                ${numberField({
                  label: "Omni clamp factor",
                  min: 1,
                  max: 10000,
                  step: 1,
                  follow: () => settings.value.rtOmniRangeClampFactor,
                  readout: () => `${number(settings.value.rtOmniRangeClampFactor)}x`,
                  onInput: (value) => store.updateSettings({ rtOmniRangeClampFactor: value }),
                })}
                <p class="hint">
                  Maximum factor by which an omni antenna's range can be boosted when connecting to
                  another antenna. Default 100x. Higher = less clamping.
                </p>

                ${numberField({
                  label: "Dish clamp factor",
                  min: 1,
                  max: 10000,
                  step: 1,
                  follow: () => settings.value.rtDishRangeClampFactor,
                  readout: () => `${number(settings.value.rtDishRangeClampFactor)}x`,
                  onInput: (value) => store.updateSettings({ rtDishRangeClampFactor: value }),
                })}
                <p class="hint">
                  Maximum factor by which a dish antenna's range can be boosted. Default 1000x.
                </p>

                ${selectField({
                  label: "Range model",
                  options: [
                    { value: "Standard", label: "Standard (min of both ranges)" },
                    { value: "Root", label: "Root (min + sqrt(product))" },
                  ],
                  follow: () => settings.value.rtRangeModelType,
                  onInput: (value) => store.updateSettings({ rtRangeModelType: value }),
                })}
                <p class="hint">
                  Standard: range = min(r1, r2). Root: range = min(r1, r2) + sqrt(r1*r2). Root model
                  gives significantly longer range for identical antennas.
                </p>

                ${selectField({
                  label: "Range display mode",
                  options: [
                    { value: "dsn", label: "To Mission Control (ground station)" },
                    { value: "antenna", label: "Antenna-to-antenna (relay)" },
                  ],
                  follow: () => settings.value.rangeDisplayMode,
                  onInput: (value) => store.updateSettings({ rangeDisplayMode: value }),
                })}
                <p class="hint">
                  Mission Control: range from antenna to ground station. Antenna-to-antenna: range
                  between two identical antennas (relay-to-relay hop).
                </p>
                </p>

                ${numberField({
                  label: "Multiple antenna multiplier",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  follow: () => settings.value.rtMultipleAntennaMultiplier,
                  readout: () => number(settings.value.rtMultipleAntennaMultiplier),
                  onInput: (value) => store.updateSettings({ rtMultipleAntennaMultiplier: value }),
                })}
                <table class="data">
                  <tbody>
                    <tr>
                      <td>Longest omnidirectional antenna alone</td>
                      <td class="numeric">${computed(() => length(longestOmni(store)))}</td>
                    </tr>
                    <tr>
                      <td>With multiple antenna bonus</td>
                      <td class="numeric">${computed(() => length(store.mam.value.range))}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="hint">
                  Bonus = (sum of omni ranges - longest omni) × multiplier. Added to each omni's
                  effective range. At zero only the longest counts; at one they fully stack.
                </p>
              </section>
            `
          : "",
      )}

      <!-- RealAntennas Settings -->
      ${computed(() =>
        settings.value.commSystem === "realAntennas"
          ? html`
              <section class="card">
                <h3>RealAntennas Range</h3>

                ${numberField({
                  label: "Range multiplier",
                  min: 0,
                  max: 1000,
                  step: 0.1,
                  follow: () => settings.value.raRangeMultiplier,
                  readout: () => `${number(settings.value.raRangeMultiplier)}x`,
                  onInput: (value) => store.updateSettings({ raRangeMultiplier: value }),
                })}
                <p class="hint">
                  Multiplies all antenna ranges. Equivalent to Stock's range multiplier.
                </p>

                ${numberField({
                  label: "Consumption multiplier",
                  min: 0.1,
                  max: 10,
                  step: 0.05,
                  follow: () => settings.value.raConsumptionMultiplier,
                  readout: () => number(settings.value.raConsumptionMultiplier),
                  onInput: (value) => store.updateSettings({ raConsumptionMultiplier: value }),
                })}
                <p class="hint">Multiplies all antenna EC/s consumption.</p>

                ${numberField({
                  label: "Multiple antenna multiplier",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  follow: () => settings.value.raMultipleAntennaMultiplier,
                  readout: () => number(settings.value.raMultipleAntennaMultiplier),
                  onInput: (value) => store.updateSettings({ raMultipleAntennaMultiplier: value }),
                })}
                <table class="data">
                  <tbody>
                    <tr>
                      <td>Longest omnidirectional antenna alone</td>
                      <td class="numeric">${computed(() => length(longestOmni(store)))}</td>
                    </tr>
                    <tr>
                      <td>With multiple antenna bonus</td>
                      <td class="numeric">${computed(() => length(store.mam.value.range))}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="hint">
                  Bonus = (sum of omni ranges - longest omni) × multiplier. Added to each omni's
                  effective range. At zero only the longest counts; at one they fully stack.
                </p>

                ${selectField({
                  label: "Range display mode",
                  options: [
                    { value: "dsn", label: "To ground station (DSN)" },
                    { value: "antenna", label: "Antenna-to-antenna (relay)" },
                  ],
                  follow: () => settings.value.rangeDisplayMode,
                  onInput: (value) => store.updateSettings({ rangeDisplayMode: value }),
                })}
                <p class="hint">
                  Ground station: range from antenna to DSN. Antenna-to-antenna: range between two
                  identical antennas (relay-to-relay hop).
                </p>

                ${selectField({
                  label: "Ground station tech level",
                  options: [
                    { value: 0, label: "TL0: WW2-era (L-band omni)" },
                    { value: 1, label: "TL1: Lunar Range (L-band)" },
                    { value: 2, label: "TL2: Digital Comms (L/S-band)" },
                    { value: 3, label: "TL3: Interplanetary (S-band 26m)" },
                    { value: 4, label: "TL4: Improved (S-band 64m)" },
                    { value: 5, label: "TL5: Advanced (S-band + coding)" },
                    { value: 6, label: "TL6: Deep Space (X-band prep)" },
                    { value: 7, label: "TL7: High Data Rate (X-band 64m)" },
                    { value: 8, label: "TL8: Massive Scale (X-band 70m)" },
                    { value: 9, label: "TL9: Efficient (X/K-band 34m/70m)" },
                  ],
                  follow: () => settings.value.raTargetTechLevel,
                  onInput: (value) => store.updateSettings({ raTargetTechLevel: Number(value) }),
                })}
                <p class="hint">
                  RealAntennas ground stations upgrade with Tracking Station level (career) or can
                  be set manually (sandbox). Higher tech levels unlock better dishes and encoders:
                  L-band (TL0), S-band (TL3–5), X-band (TL7–9), K-band (TL9).
                </p>
              </section>
            `
          : "",
      )}

      <section class="card">
        <h3>Data backup</h3>
        <div class="actions">
          <button type="button" @click=${() => exportData(store)}>Export data</button>
          <label class="file-input" data-label="Import data">
            <input
              type="file"
              accept=".json"
              @change=${(e) => e.target.files[0] && importData(store, e.target.files[0])}
            />
          </label>
        </div>
        <p class="hint">
          Export saves all settings, chain, custom bodies, antennas and crafts to a JSON file.
          Import restores them, replacing everything currently in the browser.
        </p>
      </section>

      <section class="card">
        <h3>Start again</h3>
        <div class="actions">
          <button type="button" class="danger" @click=${clearing.open}>Clear all data</button>
        </div>
        <p class="hint">
          Everything is kept in this browser and nowhere else, so this is the only way to be rid of
          it.
        </p>
      </section>

      ${clearing.markup}
    </div>
  `;
}

/**
 * The range of the longest omnidirectional antenna on the chain, which is where
 * the combined range starts from.
 *
 * @param {Store} store
 * @returns {number}
 */
function longestOmni(store) {
  return Math.max(
    0,
    ...store.antennas.value
      .filter((slot) => slot.antenna?.type === "omni")
      .map((slot) => slot.antenna.range),
  );
}
