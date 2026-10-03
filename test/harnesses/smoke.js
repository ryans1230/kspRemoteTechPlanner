/**
 * Throwaway harness: mounts every view against jsdom with a stub localStorage
 * and reports anything that throws or leaves the document broken.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!DOCTYPE html><html lang="en"><head></head><body>
     <nav id="tabs"></nav><main id="panels"></main>
   </body></html>`,
  { url: "https://example.test/#planner" },
);

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.location = dom.window.location;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const store = await import(resolve(ROOT, "js/store.js"));
const views = {
  ...(await import(resolve(ROOT, "js/views/planner.js"))),
  ...(await import(resolve(ROOT, "js/views/entireView.js"))),
  ...(await import(resolve(ROOT, "js/views/nightView.js"))),
  ...(await import(resolve(ROOT, "js/views/singleLaunchView.js"))),
  ...(await import(resolve(ROOT, "js/views/multiLaunchView.js"))),
  ...(await import(resolve(ROOT, "js/views/dataInput.js"))),
  ...(await import(resolve(ROOT, "js/views/settings.js"))),
  ...(await import(resolve(ROOT, "js/views/description.js"))),
  ...(await import(resolve(ROOT, "js/views/craft.js"))),
};

const app = store.createStore(dom.window.localStorage);
const panels = dom.window.document.getElementById("panels");

let failures = 0;

for (const [name, render] of Object.entries(views)) {
  const panel = dom.window.document.createElement("section");
  panels.append(panel);
  try {
    const { html, mount } = await import(resolve(ROOT, "js/html.js"));
    mount(panel, render(app));
  } catch (error) {
    console.log(`FAIL ${name}: ${error.message}`);
    console.log(error.stack.split("\n").slice(1, 4).join("\n"));
    failures++;
    continue;
  }
  console.log(`ok   ${name} (${panel.querySelectorAll("*").length} nodes)`);
}

// Now drive the store and see every panel follow.
const before = panels.textContent.length;
app.updateChain({ count: 7, altitude: 1200, body: "Mun", parkingAlt: 80 });
app.updateSettings({ rangeMultiplier: 2, stockData: "rss" });
app.addAntenna("Communotron 16");
app.setQuantity(0, 3);
app.updateChain({ antennaIndex: -1 });
await new Promise((resolve) => setTimeout(resolve, 50));
const after = panels.textContent.length;
console.log(`after changes: ${before} -> ${after} chars of text`);
if (after === before) console.log("WARN nothing in the DOM changed");

// Every panel must still contain a real subtree, and no stray MARK slots.
for (const panel of panels.querySelectorAll("section")) {
  if (panel.querySelectorAll("*").length === 0) {
    console.log(`FAIL panel ${panel.id} is empty`);
    failures++;
  }
}
const html = dom.window.document.documentElement.outerHTML;
if (html.includes("ksp")) {
  const stray = html.match(/ksp[a-z0-9]{6,}\d+ksp/g);
  if (stray) {
    console.log(`FAIL unrendered interpolation slots left in the document: ${stray.length}`);
    // Print first 200 chars around each stray
    for (const s of stray) {
      const idx = html.indexOf(s);
      console.log(`  ...${html.substring(Math.max(0, idx-50), idx+50)}...`);
    }
    failures++;
  }
}

console.log(failures === 0 ? "no failures" : `${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);