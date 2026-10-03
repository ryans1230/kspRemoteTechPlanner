/**
 * The planner tab: the data input in a column on the right, and the four
 * figures it feeds on the left — the entire view across the top, then the
 * night, single launch and multiple launch views.
 *
 * The figures are all read at once, which is the point of putting them here
 * rather than behind their own tabs: whether a ring closes, what it costs to
 * fill it and what power it needs are one question, not four.
 *
 * @module
 */

import { html } from "../html.js";
import { entireView } from "./entireView.js";
import { nightView } from "./nightView.js";
import { singleLaunchView } from "./singleLaunchView.js";
import { multiLaunchView } from "./multiLaunchView.js";
import { dataInputView } from "./dataInput.js";

/** @typedef {import("../store.js").Store} Store */

/**
 * @param {string} heading
 * @param {boolean} wide
 * @param {import("../html.js").Fragment} figure
 * @returns {import("../html.js").Fragment}
 */
function panel(heading, wide, figure) {
  return html`
    <figure class=${wide ? "figure wide" : "figure"}>
      <figcaption>${heading}</figcaption>
      ${figure}
    </figure>
  `;
}

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function plannerView(store) {
  return html`
    <div class="planner">
      <div class="figures">
        ${panel("Entire view", true, entireView(store))}
        ${panel("Night view", false, nightView(store))}
        ${panel("Single launch view", false, singleLaunchView(store))}
        ${panel("Multiple launch view", false, multiLaunchView(store))}
      </div>
      <aside class="sidebar">${dataInputView(store)}</aside>
    </div>
  `;
}
