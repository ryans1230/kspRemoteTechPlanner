/**
 * Wires the tabs together and hands each one the app's state.
 *
 * A view is mounted the first time its tab is opened and left in place after
 * that, so coming back to a tab is instant while a tab nobody has opened yet
 * costs nothing.
 *
 * @module
 */

import { html, mount } from "./html.js";
import { signal } from "./reactive.js";
import { createStore } from "./store.js";
import { plannerView } from "./views/planner.js";
import { bodyEdit } from "./views/bodyEdit.js";
import { antennaEdit } from "./views/antennaEdit.js";
import { craftView } from "./views/craft.js";
import { descriptionView } from "./views/description.js";
import { settingsView } from "./views/settings.js";

/** @typedef {import("./store.js").Store} Store */

/**
 * The tabs, in the order they appear. The id is also the fragment in the
 * address, so `#body` opens the body editor and can be linked to.
 *
 * @type {readonly {id: string, label: string, render: (store: Store) => unknown}[]}
 */
const TABS = [
  { id: "planner", label: "Planner", render: plannerView },
  { id: "body", label: "Body Edit", render: bodyEdit },
  { id: "antenna", label: "Antenna Edit", render: antennaEdit },
  { id: "craft", label: "Crafts", render: craftView },
  { id: "desc", label: "Description", render: descriptionView },
  { id: "settings", label: "Settings", render: settingsView },
];

/** @type {Record<string, (store: Store) => unknown>} */
const RENDERERS = Object.fromEntries(TABS.map((tab) => [tab.id, tab.render]));

/**
 * Which tab the address names, or the first one when it names nothing we know.
 *
 * @returns {string}
 */
function tabFromAddress() {
  const wanted = location.hash.replace(/^#/, "");
  return RENDERERS[wanted] ? wanted : TABS[0].id;
}

const store = createStore();
const active = signal(tabFromAddress());

const tabBar = document.getElementById("tabs");
const panelHost = document.getElementById("panels");

/** @type {Map<string, HTMLElement>} */
const panels = new Map();

/** @type {Map<string, boolean>} */
const mounted = new Map();

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function panelFor(id) {
  const existing = panels.get(id);
  if (existing) return existing;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = `panel-${id}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `tab-${id}`);
  panel.hidden = true;
  panelHost.append(panel);
  panels.set(id, panel);
  return panel;
}

/**
 * @param {string} id
 * @returns {void}
 */
function show(id) {
  const tab = /** @type {HTMLButtonElement} */ (tabBar.querySelector(`#tab-${id}`));
  if (!tab) return;

  // The panel is made and filled in before anything is shown or hidden: a
  // panel created here would otherwise start hidden and never be told
  // otherwise, and the tab would open onto nothing.
  const panel = panelFor(id);
  if (!mounted.get(id)) {
    mount(panel, RENDERERS[id](store));
    mounted.set(id, true);
  }

  for (const button of tabBar.querySelectorAll("button")) {
    const selected = button === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  for (const [other, otherPanel] of panels) otherPanel.hidden = other !== id;
}

mount(
  tabBar,
  html`
    ${TABS.map(
      (tab) => html`<button
        type="button"
        role="tab"
        id="tab-${tab.id}"
        aria-controls="panel-${tab.id}"
        aria-selected="false"
        @click=${() => open(tab.id)}
      >
        ${tab.label}
      </button>`,
    )}
  `,
);

function open(id) {
  active.set(id);
  if (location.hash !== `#${id}`) location.hash = id;
  show(id);
}

window.addEventListener("hashchange", () => {
  active.set(tabFromAddress());
  show(active.value);
});

show(active.value);
