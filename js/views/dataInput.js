/**
 * The data input: the constellation being planned, in a column beside the
 * plots. Everything the four views read is entered here, and nothing is
 * stored twice — the period follows from the altitude, the reach that matters
 * follows from the antenna marked *Show*, and the plots read the same state.
 *
 * @module
 */

import { computed, signal } from "../reactive.js";
import { each, element, html } from "../html.js";
import { STOCK_BODIES } from "../data/bodies.js";
import { ANTENNA_TYPE_LABELS } from "../data/antenna-types.js";
import { length, number } from "../format.js";
import { numberField, selectField } from "./field.js";

/** @typedef {import("../store.js").Store} Store */

/** How far up the altitude field goes, km: high enough for an orbit of Jool. */
const ALTITUDE_LIMIT = 4_000_000;

/** The most satellites a chain holds, which is as many as the plots can draw. */
const COUNT_LIMIT = 30;

/**
 * Bodies for the selector, with each planet's moons gathered under it. A root
 * body has no parent to sit under, so it gathers nothing and stands alone.
 *
 * The stock lists are large and their numbers disagree, so only the chosen
 * list is offered; the other one is a setting's worth away.
 *
 * @param {Store} store
 * @returns {import("./field.js").Option[]}
 */
function bodyOptions(store) {
  /** @type {Map<string, import("./field.js").Option[]>} */
  const groups = new Map();

  /**
   * @param {string} name
   * @param {string} group
   * @returns {void}
   */
  const add = (name, group) => {
    if (!groups.has(group)) groups.set(group, []);
    /** @type {import("./field.js").Option[]} */ (groups.get(group)).push({
      value: name,
      label: name,
      group,
    });
  };

  // In the order the stock tables have them, so the selector reads the way the
  // game's own lists do.
  for (const body of STOCK_BODIES) {
    if (body.game === store.settings.value.stockData) add(body.name, body.parent ?? body.name);
  }
  for (const name of Object.keys(store.userBodies.value).sort()) add(name, "Your bodies");

  // Switching the stock list must not strand the body already in the chain: a
  // select with a value it has no option for shows nothing at all, and the
  // plots would keep drawing a body the selector had forgotten.
  const current = store.chain.value.body;
  if (![...groups.values()].some((group) => group.some((option) => option.value === current))) {
    add(current, "From the other list");
  }

  return [...groups.values()].flat();
}

/**
 * A folding table of figures for one thing: a body, or an antenna.
 *
 * @param {import("../html.js").Fragment} summary
 * @param {import("../html.js").Fragment} rows
 * @returns {import("../html.js").Fragment}
 */
function folding(summary, rows) {
  return html`
    <details class="fold">
      <summary>${summary}</summary>
      <table class="data detail">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </details>
  `;
}

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function dataInputView(store) {
  const body = store.body;
  const chain = store.chain;
  const radius = computed(() => body.value?.radius ?? 0);
  const gravity = computed(() => body.value?.stdGravity ?? 0);
  const count = computed(() => Math.max(1, Math.min(COUNT_LIMIT, chain.value.count)));

  return html`
    <div class="stack">
      <h2>Data input</h2>

      <fieldset class="input">
        <legend>Body</legend>
        ${selectField({
          label: "Body",
          options: computed(() => bodyOptions(store)),
          follow: () => chain.value.body,
          onInput: (name) => store.updateChain({ body: name }),
        })}
        ${folding(
          "Body details",
          html`
            ${detail(
              "Name",
              computed(() => body.value?.name ?? "none"),
            )}
            ${detail(
              "Radius",
              computed(() => length(radius.value)),
            )}
            ${detail(
              "Standard gravitational parameter",
              computed(() => `${number(gravity.value)} km³/s²`),
            )}
            ${detail(
              "Sphere of Influence",
              computed(() => length(body.value?.soi ?? 0)),
            )}
          `,
        )}
      </fieldset>

      <fieldset class="input">
        <legend>Chain</legend>
        ${numberField({
          label: "Count",
          min: 1,
          max: COUNT_LIMIT,
          step: 1,
          follow: () => count.value,
          readout: () => number(count.value),
          onInput: (value) => store.updateChain({ count: value }),
        })}
        ${numberField({
          label: "Altitude",
          min: 0,
          max: ALTITUDE_LIMIT,
          step: 10,
          follow: () => chain.value.altitude,
          readout: () => length(chain.value.altitude),
          onInput: (altitude) => store.updateChain({ altitude }),
        })}
        ${numberField({
          label: "Probe electricity consumption, without antennas, per sec.",
          min: 0,
          max: 100,
          step: 0.001,
          follow: () => chain.value.elcNeeded,
          onInput: (elcNeeded) => store.updateChain({ elcNeeded }),
        })}
        ${numberField({
          label: "Parking altitude on launch",
          min: 0,
          max: ALTITUDE_LIMIT,
          step: 10,
          follow: () => chain.value.parkingAlt,
          readout: () => length(chain.value.parkingAlt),
          onInput: (parkingAlt) => store.updateChain({ parkingAlt }),
        })}
      </fieldset>

      ${antennaInput(store)}
    </div>
  `;
}

/**
 * One row of a details table.
 *
 * @param {string} label
 * @param {import("../html.js").Fragment} value
 * @returns {import("../html.js").Fragment}
 */
function detail(label, value) {
  return html`
    <tr>
      <td>${label}</td>
      <td class="numeric">${value}</td>
    </tr>
  `;
}

/**
 * The antennas on the chain: what each one is, how many of them, and which one
 * the plots draw with.
 *
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
function antennaInput(store) {
  const chain = store.chain;
  const picker = antennaPicker(store);
  const mamOn = computed(() => store.settings.value.multipleAntennaMultiplier > 0);

  return html`
    <fieldset class="input">
      <legend>Antenna</legend>

      ${computed(() =>
        mamOn.value
          ? html`
              <h4>Multiple Antenna Multiplier</h4>
              ${folding(
                "Details",
                html`
                  ${detail(
                    "Type",
                    computed(() => ANTENNA_TYPE_LABELS[store.mam.value.type]),
                  )}
                  ${detail(
                    "Range",
                    computed(() => length(store.mam.value.range)),
                  )}
                  ${detail(
                    "Electricity consumption",
                    computed(() => `${number(store.mam.value.elcNeeded)} /sec.`),
                  )}
                `,
              )}
              <div class="actions">
                <button
                  type="button"
                  class=${computed(() => (chain.value.antennaIndex === -1 ? "primary" : ""))}
                  @click=${() => store.updateChain({ antennaIndex: -1 })}
                >
                  Show
                </button>
              </div>
            `
          : "",
      )}
      ${each(
        store.antennas,
        (_slot, index) => index,
        (_slot, index) => antennaRow(store, index),
      )}

      <div class="actions">
        <button type="button" @click=${picker.open}>Add after the last</button>
      </div>
      ${picker.markup}
    </fieldset>
  `;
}

/**
 * One row of the antenna list: which antenna, how many, and whether the plots
 * are using it.
 *
 * Rows are keyed and rendered by position, and a row's nodes are then reused
 * for whatever ends up in that position, so nothing in here may be read from
 * the slot the row was built from: every cell comes from a fresh computed over
 * the live list.
 *
 * @param {Store} store
 * @param {number} index
 * @returns {import("../html.js").Fragment}
 */
function antennaRow(store, index) {
  const chain = store.chain;
  const slot = computed(() => store.antennas.value[index]);
  const antenna = computed(() => slot.value?.antenna);
  const shown = computed(() => chain.value.antennaIndex === index);

  const options = computed(() =>
    Array.from(store.availableAntennas.value.values()).map((candidate) => ({
      value: candidate.name,
      label: candidate.name,
      group: ANTENNA_TYPE_LABELS[candidate.type],
    })),
  );

  return html`
    <div class="antenna-row">
      ${selectField({
        label: "",
        options,
        follow: () => antenna.value?.name ?? "",
        onInput: (name) => store.setAntenna(index, name),
      })}
      ${folding(
        "Antenna Details",
        html`
          ${detail(
            "Name",
            computed(() => antenna.value?.name ?? "none"),
          )}
          ${detail(
            "Type",
            computed(() => (antenna.value ? ANTENNA_TYPE_LABELS[antenna.value.type] : "")),
          )}
          ${detail(
            "Range",
            computed(() => length(antenna.value?.range ?? 0)),
          )}
          ${detail(
            "Electricity consumption",
            computed(() => `${number(antenna.value?.elcNeeded ?? 0)} /sec.`),
          )}
        `,
      )}
      <div class="antenna-controls">
        <button
          type="button"
          class=${shown}
          @click=${() => store.updateChain({ antennaIndex: index })}
        >
          Show
        </button>
        ${numberField({
          label: "quantity",
          min: 1,
          max: 99,
          step: 1,
          follow: () => slot.value?.quantity ?? 1,
          onInput: (quantity) => store.setQuantity(index, quantity),
        })}
        <button
          type="button"
          class="danger"
          .disabled=${computed(() => store.antennas.value.length <= 1)}
          @click=${() => store.removeAntenna(index)}
        >
          Remove
        </button>
      </div>
    </div>
  `;
}

/**
 * A dialog for putting one of the antennas the chain does not have on it.
 *
 * The markup is built once and its dialog element is moved in and out of the
 * document as it is opened and closed, rather than being built per opening:
 * a template's bindings are wired when it is built, so building a fresh one
 * each time would leave the last one's effects subscribed for good.
 *
 * @param {Store} store
 * @returns {{open: () => void, markup: import("../html.js").Fragment}}
 */
function antennaPicker(store) {
  const chosen = signal("");

  const unused = computed(() => {
    const inChain = new Set(store.chain.value.antennas.map((slot) => slot.antenna));
    return Array.from(store.availableAntennas.value.values())
      .filter((antenna) => !inChain.has(antenna.name))
      .map((antenna) => ({
        value: antenna.name,
        label: `${antenna.name} — ${ANTENNA_TYPE_LABELS[antenna.type]}, ${length(antenna.range)}`,
      }));
  });

  const markup = html`
    <dialog>
      <h3>Add an antenna</h3>
      ${selectField({
        label: "Antenna",
        options: unused,
        follow: () => chosen.value,
        onInput: (name) => chosen.set(name),
      })}
      <div class="actions">
        <button type="button" class="primary" @click=${add}>Add it</button>
        <button type="button" @click=${dismiss}>Cancel</button>
      </div>
    </dialog>
  `;

  const node = /** @type {HTMLDialogElement} */ (element(markup));

  function dismiss() {
    if (node.open) node.close();
    node.remove();
  }

  function add() {
    if (chosen.value) store.addAntenna(chosen.value);
    dismiss();
  }

  function open() {
    chosen.set(unused.value[0]?.value ?? "");
    document.body.append(node);
    node.showModal();
  }

  return { open, markup };
}
