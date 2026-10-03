/**
 * Editing a body the user has added: its colour, its radius, its standard
 * gravitational parameter and the radius of its sphere of influence.
 *
 * The form is built once per editing session and the fields inside it are bound
 * to the draft, so typing updates the draft and the figures beside the fields
 * without the form being rebuilt under the user. Nothing reaches the store
 * until it is saved, so a half-typed radius never reaches a plot.
 *
 * @module
 */

import { computed, signal } from "../reactive.js";
import { each, html } from "../html.js";
import { length, number } from "../format.js";
import { numberField, textField } from "./field.js";

/** @typedef {import("../store.js").Store} Store */
/** @typedef {import("../data/bodies.js").Body} Body */

/**
 * What a new body starts as: a grey marble the size of the Earth.
 *
 * @returns {Body}
 */
function blank() {
  return {
    name: "",
    color: "rgb(128,128,128)",
    radius: 6371,
    stdGravity: 398600,
    soi: 924000,
  };
}

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function bodyEdit(store) {
  /** The body being edited, or null while the form is closed. */
  const draft = signal(null);
  /** Only the open and closed of the form, so typing cannot rebuild it. */
  const open = computed(() => draft.value !== null);

  const names = computed(() => Object.keys(store.userBodies.value).sort());
  const inUse = computed(() => store.chain.value.body);

  /**
   * @param {string|null} name the body to edit, or null to start a new one
   * @returns {void}
   */
  function edit(name) {
    draft.set(name ? { ...store.userBodies.value[name] } : blank());
  }

  function close() {
    draft.set(null);
  }

  function save() {
    const current = draft.peek();
    // A body with no name could never be selected again, so it is not saved.
    if (current && current.name.trim() !== "") store.saveBody(current.name.trim(), current);
    close();
  }

  // The form is built when it opens and thrown away when it closes, and never
  // rebuilt in between, which is what lets a name be typed in one character
  // at a time.
  const form = computed(() => (open.value ? fields(draft, save, close) : ""));

  return html`
    <details>
      <summary>Bodies you have added</summary>
      <div class="details-body">
        ${computed(() =>
          names.value.length === 0
            ? html`<p class="empty">None yet. Add one for a body the stock lists do not have.</p>`
            : "",
        )}
        ${table(store, names, inUse, edit)}
        <div class="actions">
          <button type="button" @click=${() => edit(null)}>Add a body</button>
        </div>
        ${form}
      </div>
    </details>
  `;
}

/**
 * The bodies the user has added, with the one in use marked.
 *
 * @param {Store} store
 * @param {import("../reactive.js").Signal<string[]>} names
 * @param {import("../reactive.js").Signal<string>} inUse
 * @param {(name: string|null) => void} edit
 * @returns {import("../html.js").Fragment}
 */
function table(store, names, inUse, edit) {
  return html`
    <table class="data">
      <thead>
        <tr>
          <th>Name</th>
          <th class="numeric">Radius</th>
          <th class="numeric">Standard gravity</th>
          <th class="numeric">Sphere of influence</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${each(
          names,
          (name) => name,
          (name) => {
            // A blank stand-in for the moment between a body being
            // removed from the store and its row going with it.
            const body = computed(() => store.userBodies.value[name] ?? blank());
            return html`
              <tr class=${computed(() => (inUse.value === name ? "selected" : ""))}>
                <td>${computed(() => name)}</td>
                <td class="numeric">${computed(() => length(body.value.radius))}</td>
                <td class="numeric">${computed(() => number(body.value.stdGravity))}</td>
                <td class="numeric">${computed(() => length(body.value.soi))}</td>
                <td>
                  <button type="button" @click=${() => edit(name)}>Edit</button>
                  ${computed(() =>
                    inUse.value === name
                      ? html`<span class="hint">In use</span>`
                      : html`<button
                          type="button"
                          class="danger"
                          @click=${() => store.removeBody(name)}
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
 * The fields of the editing form, bound to the draft rather than to whatever the
 * form was rendered from.
 *
 * @param {import("../reactive.js").Signal<Body|null>} draft
 * @param {() => void} save
 * @param {() => void} close
 * @returns {import("../html.js").Fragment}
 */
function fields(draft, save, close) {
  const body = computed(() => draft.value);
  const named = computed(() => (body.value?.name ?? "").trim() !== "");

  /**
   * @param {keyof Body} field
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
      <h3>${computed(() => body.value?.name || "A new body")}</h3>
      ${textField({ label: "Name", follow: () => body.value?.name ?? "", onInput: set("name") })}
      ${textField({
        label: "Colour",
        type: "color",
        follow: () => body.value?.color ?? "#808080",
        onInput: set("color"),
      })}
      ${numberField({
        label: "Radius",
        min: 0,
        step: 1,
        follow: () => body.value?.radius ?? 0,
        readout: () => length(body.value?.radius ?? 0),
        onInput: set("radius"),
      })}
      ${numberField({
        label: "Standard gravitational parameter",
        min: 0,
        step: 0.1,
        follow: () => body.value?.stdGravity ?? 0,
        readout: () => number(body.value?.stdGravity ?? 0),
        onInput: set("stdGravity"),
      })}
      ${numberField({
        label: "Sphere of influence",
        min: 0,
        step: 1,
        follow: () => body.value?.soi ?? 0,
        readout: () => length(body.value?.soi ?? 0),
        onInput: set("soi"),
      })}
      <div class="actions">
        ${buttons}
        <button type="button" @click=${close}>Cancel</button>
      </div>
      ${computed(() =>
        named.value ? "" : html`<p class="hint">A body needs a name before it can be saved.</p>`,
      )}
    </div>
  `;
}
