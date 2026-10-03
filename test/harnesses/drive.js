/**
 * Throwaway harness: drives the views the way a person would, and checks that
 * nothing rebuilds itself under the user and no handler throws.
 */
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const dom = new JSDOM(
  `<!DOCTYPE html><html lang="en"><head></head><body>
     <nav id="tabs"></nav><main id="panels"></main>
   </body></html>`,
  { url: "https://example.test/#planner" },
);

globalThis.window = dom.window;
globalThis.document = dom.window.document;
for (const name of ["Node", "DocumentFragment", "HTMLElement", "Element", "SVGElement", "Event", "CustomEvent"]) {
  globalThis[name] = dom.window[name];
}
globalThis.location = dom.window.location;

// jsdom has no dialog support, which is all the more reason to check nothing
// depends on it working.
dom.window.Element.prototype.showModal = function showModal() {
  this.setAttribute("open", "");
};
dom.window.Element.prototype.close = function close() {
  this.removeAttribute("open");
}

const base = resolve(ROOT, "js");
const { createStore } = await import(`${base}/store.js`);
const { html, mount } = await import(`${base}/html.js`);
const views = {
  ...(await import(`${base}/views/planner.js`)),
  ...(await import(`${base}/views/entireView.js`)),
  ...(await import(`${base}/views/nightView.js`)),
  ...(await import(`${base}/views/singleLaunchView.js`)),
  ...(await import(`${base}/views/multiLaunchView.js`)),
  ...(await import(`${base}/views/dataInput.js`)),
  ...(await import(`${base}/views/bodyEdit.js`)),
  ...(await import(`${base}/views/antennaEdit.js`)),
  ...(await import(`${base}/views/craft.js`)),
  ...(await import(`${base}/views/settings.js`)),
  ...(await import(`${base}/views/description.js`)),
};

const app = createStore(dom.window.localStorage);
const panels = dom.window.document.getElementById("panels");

/** @type {Record<string, Element>} */
const built = {};
for (const [name, render] of Object.entries(views)) {
  const panel = dom.window.document.createElement("section");
  panel.id = name;
  panels.append(panel);
  mount(panel, render(app));
  built[name] = panel;
}

let failures = 0;
const check = (what, ok) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures++;
};

/** Types into a field the way a person does, and says whether it survived. */
function type(panel, labelText, value) {
  const field = [...panel.querySelectorAll(".field")].find(
    (node) => node.querySelector("label")?.textContent.trim() === labelText,
  );
  if (!field) throw new Error(`no field labelled ${labelText}`);
  const input = field.querySelector("input, select");
  input.value = value;
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  return panel.contains(input);
}

const button = (panel, text) =>
  [...panel.querySelectorAll("button")].find((node) => node.textContent.trim().startsWith(text));

// --- The body editor must survive being typed into. ----------------------------
const bodyPanel = built.bodyEdit;
button(bodyPanel, "Add a body").click();
const nameKept = type(bodyPanel, "Name", "Hruban");
check("the body name field is still the same element after typing", nameKept);
check("the form heading followed the draft", bodyPanel.textContent.includes("Hruban"));
const saveButton = button(bodyPanel, "Save");
check("save is enabled once the body is named", !saveButton.disabled);

const radiusKept = type(bodyPanel, "Radius", "8400");
check("the radius field is still the same element after typing", radiusKept);
saveButton.click();
check("the saved body is listed", bodyPanel.textContent.includes("Hruban"));
check("the saved radius is shown", bodyPanel.textContent.includes("8,400 km"));

// --- And the antenna editor. ----------------------------------------------------
const antennaPanel = built.antennaEdit;
button(antennaPanel, "Add an antenna").click();
check("the antenna name field survives typing", type(antennaPanel, "Name", "Home Dish"));
const antennaSave = button(antennaPanel, "Save");
check("antenna save is enabled", !antennaSave.disabled);
antennaSave.click();
check("the saved antenna is listed", antennaPanel.textContent.includes("Home Dish"));

// --- The data input survives edits. ---------------------------------------------
const data = built.dataInputView;
const altitudeKept = type(data, "Altitude", "800");
check("the altitude field survives typing", altitudeKept);
const parkingKept = type(data, "Parking altitude on launch", "200");
check("the parking altitude field survives typing", parkingKept);
const countKept = type(data, "Count", "4");
check("the count field survives typing", countKept);

// --- The single-launch transfer follows the parking altitude. -------------------
const textBefore = built.singleLaunchView.textContent;
check("the transfer is drawn", textBefore.includes("Start dV"));
type(data, "Parking altitude on launch", "220");
await new Promise((resolve) => setTimeout(resolve, 20));
check("the start dV followed the parking altitude", built.singleLaunchView.textContent !== textBefore);
const slideBefore = built.singleLaunchView.textContent;
type(data, "Count", "9");
await new Promise((resolve) => setTimeout(resolve, 20));
check("the slide angle followed the count", built.singleLaunchView.textContent !== slideBefore);

// --- The craft view: save, load, rename, delete. ----------------------------------
const craft = built.craftView;
const saveCurrentBtn = button(craft, "Save current as craft");
saveCurrentBtn.click();
await new Promise((resolve) => setTimeout(resolve, 50));
// Find the save current dialog specifically (last one added)
const saveDialog = [...document.querySelectorAll("dialog")].find(d => d.textContent.includes("Save current antenna list"));
check("save current dialog opens", saveDialog?.hasAttribute("open") ?? false);
const saveNameField = saveDialog?.querySelector('input[type="text"]');
saveNameField.value = "Test Craft";
saveNameField.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
saveDialog.querySelector('button:not(.danger)').click();
await new Promise((resolve) => setTimeout(resolve, 20));
check("craft saved and listed", craft.textContent.includes("Test Craft"));

// Load the craft
const loadBtn = button(craft, "Load");
loadBtn.click();
await new Promise((resolve) => setTimeout(resolve, 20));
check("craft loaded (toast shown)", document.querySelector(".toast")?.textContent.includes("Loaded craft") ?? false);

// Rename the craft
const renameBtn = button(craft, "Rename");
renameBtn.click();
await new Promise((resolve) => setTimeout(resolve, 50));
const renameDialog = [...document.querySelectorAll("dialog")].find(d => d.textContent.includes("Rename craft"));
const renameField = renameDialog?.querySelector('input[type="text"]');
renameField.value = "Renamed Craft";
renameField.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
renameDialog.querySelector('button:not(.danger)').click();
await new Promise((resolve) => setTimeout(resolve, 20));
check("craft renamed", craft.textContent.includes("Renamed Craft"));

// Delete the craft
const deleteBtn = button(craft, "Delete");
deleteBtn.click();
await new Promise((resolve) => setTimeout(resolve, 50));
const deleteDialog = [...document.querySelectorAll("dialog")].find(d => d.textContent.includes('Delete craft'));
deleteDialog.querySelector(".danger").click();
await new Promise((resolve) => setTimeout(resolve, 20));
check("craft deleted", !craft.textContent.includes("Renamed Craft"));

// --- Every view still has content after all of that. -----------------------------
for (const view of Object.values(built)) {
  check(`${view.id} is still drawn`, view.textContent.length > 100);
}

console.log(failures === 0 ? "\nno failures" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);