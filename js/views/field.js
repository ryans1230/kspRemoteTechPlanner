/**
 * The form controls the views are built from.
 *
 * Every field takes the same pair of functions: `follow` reads the value the
 * field should be showing, and `onInput` is called with what the user has
 * entered. A field only writes to the store when what was typed is actually
 * different from what is already there, so the template never rewrites the
 * characters someone is in the middle of typing, while a change made
 * anywhere else — a reset, a body switched in the data view, a chain loaded
 * from storage — still shows up in the field.
 *
 * @module
 */

import { computed, effect, isSignal, signal } from "../reactive.js";
import { each, html } from "../html.js";

/**
 * One entry of a select.
 *
 * @typedef {{value: string, label: string, group?: string}} Option
 */

/**
 * @typedef {object} NumberFieldOptions
 * @property {string} label
 * @property {() => number} follow
 * @property {(value: number) => void} onInput
 * @property {number} [min]
 * @property {number} [max]
 * @property {string|number} [step]
 * @property {(value: number) => string} [readout] shown beside the field
 */

/**
 * @typedef {object} TextFieldOptions
 * @property {string} label
 * @property {() => string} follow
 * @property {(value: string) => void} onInput
 * @property {"text"|"color"} [type]
 */

/**
 * @typedef {object} SelectFieldOptions
 * @property {string} label
 * @property {() => string} follow
 * @property {(value: string) => void} onInput
 * @property {readonly Option[]|import("../reactive.js").Signal<readonly Option[]>} options
 * @property {(option: Option) => string} [renderLabel] defaults to the label
 */

/**
 * A number in a box.
 *
 * @param {NumberFieldOptions} options
 * @returns {import("../html.js").Fragment}
 */
export function numberField({
  label,
  follow,
  onInput,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = "any",
  readout,
}) {
  const shown = computed(() => String(follow()));
  const output = readout ? computed(() => readout(follow())) : null;

  return html`
    <div class="field">
      <label>${label}</label>
      <div class="field-row">
        <input
          type="number"
          .value=${shown}
          min=${String(min)}
          max=${String(max)}
          step=${String(step)}
          @input=${(/** @type {Event} */ event) => {
            const field = /** @type {HTMLInputElement} */ (event.target);
            const value = Number(field.value);
            // An empty or half-typed box is not a number, and reading one as a
            // number would throw away what the user is in the middle of typing.
            if (field.value !== "" && Number.isFinite(value) && value !== follow()) {
              onInput(value);
            }
          }}
        />
        ${output ? html`<output>${output}</output>` : ""}
      </div>
    </div>
  `;
}

/**
 * A number on a slider, with the figure it stands for beside it.
 *
 * @param {NumberFieldOptions} options
 * @returns {import("../html.js").Fragment}
 */
export function sliderField({ label, follow, onInput, min = 0, max, step = 1, readout }) {
  const shown = computed(() => String(follow()));
  const output = readout ? computed(() => readout(follow())) : null;

  return html`
    <div class="field">
      <label>${label}</label>
      <div class="field-row">
        <input
          type="range"
          .value=${shown}
          min=${String(min)}
          max=${String(max)}
          step=${String(step)}
          @input=${(/** @type {Event} */ event) =>
            onInput(Number(/** @type {HTMLInputElement} */ (event.target).value))}
        />
        ${output ? html`<output>${output}</output>` : ""}
      </div>
    </div>
  `;
}

/**
 * @param {TextFieldOptions} options
 * @returns {import("../html.js").Fragment}
 */
export function textField({ label, follow, onInput, type = "text" }) {
  const shown = computed(() => follow());

  return html`
    <div class="field">
      <label>${label}</label>
      <input
        type=${type}
        .value=${shown}
        @input=${(/** @type {Event} */ event) => {
          const field = /** @type {HTMLInputElement} */ (event.target);
          if (field.value !== follow()) onInput(field.value);
        }}
      />
    </div>
  `;
}

/**
 * A drop-down. Options that name a group are gathered under an `optgroup`,
 * and the groups come out in the order they first appear.
 *
 * @param {SelectFieldOptions} options
 * @returns {import("../html.js").Fragment}
 */
export function selectField({ label, follow, onInput, options, renderLabel }) {
  const list = isSignal(options) ? options : signal(options);
  const show = renderLabel ?? ((option) => option.label);

  // The select element, captured so we can sync its value after options render
  const selectEl = signal(null);

  // Selected value as a signal
  const selected = computed(follow);

  // After the list effect runs and populates the <select> with options,
  // apply the selected value. Use setTimeout to run after the each() effect
  // completes its DOM updates (which runs in a microtask).
  effect(() => {
    void list.value; // depend on list so we re-run when it changes
    setTimeout(() => {
      const el = selectEl.value;
      if (el) el.value = selected.value;
    }, 0);
  });

  return html`
    <div class="field">
      <label>${label}</label>
      <select
        ref=${selectEl}
        .value=${selected}
        @change=${(/** @type {Event} */ event) =>
          onInput(/** @type {HTMLSelectElement} */ (event.target).value)}
      >
        ${each(
          list,
          (option) => option.value,
          (option) =>
            option.group
              ? html`<optgroup label=${option.group}>
                  ${each(
                    signal([option]),
                    (o) => o.value,
                    (o) => html`<option value=${o.value}>${show(o)}</option>`,
                  )}
                </optgroup>`
              : html`<option value=${option.value}>${show(option)}</option>`,
        )}
      </select>
    </div>
  `;
}
