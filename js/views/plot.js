/**
 * What the plots share: a scale from kilometres to user units, and the body
 * itself.
 *
 * Every plot states how wide its frame is in user units and how far it has to
 * reach in kilometres; everything inside is drawn at those two. The reach
 * cannot be worked out once for all of them: the body changes size by six
 * orders of magnitude between Kerbin and Kerbol, Kerbol's sphere of influence
 * is infinite, and an infinite reach would put the geometry at zero.
 *
 * @module
 */

import { computed } from "../reactive.js";

/** @typedef {import("../reactive.js").Signal} Signal */
/** @typedef {import("../html.js").Fragment} Fragment */

/** The entire view's frame, in user units. */
export const ENTIRE_FRAME = 800;

/** The frame of the three small views, in user units. */
export const SMALL_FRAME = 400;

/**
 * User units per kilometre, for a plot of `frame` user units that has to
 * reach `extent` km.
 *
 * @param {number} frame width of the plot's frame, user units
 * @param {() => number} extentKm
 * @returns {Signal<number>}
 */
export function plotScale(frame, extentKm) {
  return computed(() => {
    const extent = extentKm();
    // Nothing may be drawn at an infinite or negative distance, and a body of
    // no size still deserves a frame rather than a division by zero.
    return frame / (Number.isFinite(extent) && extent > 0 ? extent : 1);
  });
}

/**
 * The body's disc in the middle of a plot, filled in with the body's own
 * colour from the celestial list.
 *
 * @param {import("../store.js").Store} store
 * @param {Signal<number>} scale user units per km
 * @returns {DocumentFragment}
 */
export function bodyDisc(store, scale) {
  const radius = computed(() => store.body.value?.radius ?? 0);

  return computed(() => {
    const r = radius.value * scale.value;
    const color = store.body.value?.color ?? "rgb(128,128,128)";
    const name = store.body.value?.name ?? "no body";
    const frag = document.createDocumentFragment();

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "body");
    circle.setAttribute("cx", "0");
    circle.setAttribute("cy", "0");
    circle.setAttribute("r", r);
    circle.setAttribute("fill", color);
    frag.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "body-label");
    text.setAttribute("x", "0");
    text.setAttribute("y", "0");
    text.setAttribute("dy", "0.35em");
    text.setAttribute("font-size", "16");
    text.setAttribute("font-weight", "600");
    text.setAttribute("text-anchor", "middle");
    text.textContent = name;
    frag.appendChild(text);

    return frag;
  });
}

/** Stand-in for an item a list no longer has. */
const ORIGIN = Object.freeze({ x: 0, y: 0 });

/**
 * One item of a list a row was rendered from, by its position.
 *
 * A row's bindings outlive the row: a list that shrinks tells them to redraw
 * before it has taken its own rows away, so for a moment the index a row was
 * rendered at can be past the end. Reading it as the centre of the plot is
 * harmless, where reading nothing at all would throw in the middle of whatever
 * change caused it.
 *
 * @template T
 * @param {Signal<readonly T[]>} list
 * @param {number} index
 * @returns {T}
 */
export function at(list, index) {
  return list.value[index] ?? /** @type {T} */ (ORIGIN);
}
