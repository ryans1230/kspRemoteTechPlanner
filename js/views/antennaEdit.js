/**
 * Editing an antenna the user has added: whether it is omnidirectional or a
 * dish, how far it reaches, and how much electric charge it takes per second to
 * run.
 *
 * Like the body editor, the form is built once per editing session and bound to
 * its draft, so typing in it does not rebuild it. An antenna already on the
 * chain cannot be removed, because a slot pointing at nothing would leave a hole
 * in the plots.
 *
 * @module
 */

import { computed, signal } from "../reactive.js";
import { each, html } from "../html.js";
import { ANTENNA_TYPE_LABELS } from "../data/antenna-types.js";
import { length, number } from "../format.js";
import { numberField, selectField, textField } from "./field.js";

/** @typedef {import("../store.js").Store} Store */
/** @typedef {import("../data/antennas.js").Antenna} Antenna */

/**
 * What a new antenna starts as: a weak omnidirectional one on Kerbin's terms.
 *
 * @returns {Antenna}
 */
function blank() {
  return { name: "", type: "omni", range: 1, elcNeeded: 0.03 };
}

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function antennaEdit(store) {
  const draft = signal(null);
  const open = computed(() => draft.value !== null);

  const names = computed(() => Object.keys(store.userAntennas.value).sort());

  /**
   * @param {string|null} name the antenna to edit, or null to start a new one
   * @returns {void}
   */
  function edit(name) {
    draft.set(name ? { ...store.userAntennas.value[name] } : blank());
  }

  function close() {
    draft.set(null);
  }

  function save() {
    const current = draft.peek();
    // An antenna with no name could never be picked again, so it is not saved.
    if (current && current.name.trim() !== "") store.saveAntenna(current.name.trim(), current);
    close();
  }

  const form = computed(() => (open.value ? fields(draft, save, close) : ""));

  return html`
    <details>
      <summary>Antennas you have added</summary>
      <div class="details-body">
        ${computed(() =>
          names.value.length === 0
            ? html`<p class="empty">
                None yet. Add one if the stock list is missing an antenna you use.
              </p>`
            : "",
        )}
        ${table(store, names, edit)}
        <div class="actions">
          <button type="button" @click=${() => edit(null)}>Add an antenna</button>
        </div>
        ${form}
      </div>
    </details>
  `;
}

/**
 * The antennas the user has added, with those the chain is using marked.
 *
 * @param {Store} store
 * @param {import("../reactive.js").Signal<string[]>} names
 * @param {(name: string|null) => void} edit
 * @returns {import("../html.js").Fragment}
 */
function table(store, names, edit) {
  const onChain = computed(() => store.chain.value.antennas.map((slot) => slot.antenna));

  return html`
    <table class="data">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th class="numeric">Range</th>
          <th class="numeric">Electricity per second</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${each(
          names,
          (name) => name,
          (name) => {
            // A blank stand-in for the moment between an antenna being
            // removed from the store and its row going with it.
            const antenna = computed(() => store.userAntennas.value[name] ?? blank());
            const used = computed(() => onChain.value.includes(name));
            return html`
              <tr class=${computed(() => (used.value ? "selected" : ""))}>
                <td>${computed(() => name)}</td>
                <td>${computed(() => ANTENNA_TYPE_LABELS[antenna.value.type] ?? "Omni")}</td>
                <td class="numeric">${computed(() => length(antenna.value.range))}</td>
                <td class="numeric">${computed(() => number(antenna.value.elcNeeded))}</td>
                <td>
                  <button type="button" @click=${() => edit(name)}>Edit</button>
                  ${computed(() =>
                    used.value
                      ? html`<span class="hint">On the chain</span>`
                      : html`<button
                          type="button"
                          class="danger"
                          @click=${() => store.removeAntennaDefinition(name)}
                        >
                          Remove
                        </button>`,
                  )}
                </td>
              </tr>
            `;
          },
        )}
      </tbody>
    </table>
  `;
}

/**
 * The fields of the editing form, bound to the draft.
 *
 * @param {import("../reactive.js").Signal<Antenna|null>} draft
 * @param {() => void} save
 * @param {() => void} close
 * @returns {import("../html.js").Fragment}
 */
function fields(draft, save, close) {
  const antenna = computed(() => draft.value);
  const named = computed(() => (antenna.value?.name ?? "").trim() !== "");

  /**
   * @param {keyof Antenna} field
   * @returns {(value: never) => void}
   */
  const set = (field) => (value) => {
    const current = draft.peek();
    if (current) draft.set({ ...current, [field]: value });
  };

  const buttons = computed(() =>
    named.value
      ? html`<button type="button" class="primary" @click=${save}>Save</button>`
      : html`<button type="button" class="primary" disabled>Save</button>`,
  );

  return html`
    <div class="card">
      <h3>${computed(() => antenna.value?.name || "A new antenna")}</h3>
      ${textField({ label: "Name", follow: () => antenna.value?.name ?? "", onInput: set("name") })}
      ${selectField({
        label: "Type",
        options: [
          { value: "omni", label: ANTENNA_TYPE_LABELS.omni },
          { value: "dish", label: ANTENNA_TYPE_LABELS.dish },
        ],
        follow: () => antenna.value?.type ?? "omni",
        onInput: set("type"),
      })}
      ${numberField({
        label: "Range",
        min: 0,
        step: 1,
        follow: () => antenna.value?.range ?? 0,
        readout: () => length(antenna.value?.range ?? 0),
        onInput: set("range"),
      })}
      ${numberField({
        label: "Electricity per second",
        min: 0,
        step: 0.001,
        follow: () => antenna.value?.elcNeeded ?? 0,
        readout: () => number(antenna.value?.elcNeeded ?? 0),
        onInput: set("elcNeeded"),
      })}
      <div class="actions">
        ${buttons}
        <button type="button" @click=${close}>Cancel</button>
      </div>
      ${computed(() =>
        named.value
          ? ""
          : html`<p class="hint">An antenna needs a name before it can be saved.</p>`,
      )}
    </div>
  `;
}
