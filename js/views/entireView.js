/**
 * The entire view: the body with every satellite's reach around it, the
 * satellites on their orbit, and the hops between neighbours coloured by
 * whether those neighbours can actually talk.
 *
 * It is the one plot that is scaled to what it has to show, since the orbit
 * and the reach can be anywhere from a few hundred kilometres to millions: the
 * frame is twice the orbit plus its reach, and everything on the page is
 * measured against that.
 *
 * @module
 */

import { computed } from "../reactive.js";
import { html } from "../html.js";
import * as satellite from "../calculator/satellite.js";
import { length } from "../format.js";
import { ENTIRE_FRAME, plotScale, bodyDisc } from "./plot.js";

/** @typedef {import("../store.js").Store} Store */

/** The margin kept around the orbit and its reach, as a fraction. */
const MARGIN = 1.05;

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function entireView(store) {
  const body = store.body;
  const radius = computed(() => body.value?.radius ?? 0);
  const soi = computed(() => body.value?.soi ?? 0);
  const soiFinite = computed(() => (Number.isFinite(soi.value) && soi.value > 0 ? soi.value : 0));
  const altitude = computed(() => store.chain.value.altitude);
  const sma = computed(() => radius.value + altitude.value);
  const count = computed(() => Math.max(1, store.chain.value.count));
  const range = computed(() => store.selectedAntenna.value?.range ?? 0);
  const scale = plotScale(ENTIRE_FRAME, () => (sma.value + range.value) * 2 * MARGIN);

  const points = computed(() => satellite.position(count.value, sma.value));
  const distances = computed(() => satellite.distance(count.value, sma.value));
  const links = computed(() =>
    satellite.connectability(radius.value, count.value, sma.value, range.value),
  );

  // The stable circle is only worth drawing when the ring in use is covered;
  // it sits at the orbit where the first satellite is exactly on the edge of
  // the second's reach.
  const stable = computed(() =>
    satellite.hasStableArea(radius.value, count.value, sma.value, range.value)
      ? satellite.stableLimitSma(count.value, sma.value, range.value)
      : 0,
  );

  // A hop to the second neighbour as well once there are more than four
  // satellites, which is where a ring stops being a chain.
  const hops = computed(() => (count.value <= 4 ? [0] : [0, 1]));

  return html`
    <svg
      class="plot entire"
      viewBox=${`-${ENTIRE_FRAME / 2} -${ENTIRE_FRAME / 2} ${ENTIRE_FRAME} ${ENTIRE_FRAME}`}
      role="img"
      aria-label="The orbit from above, every satellite's reach, and whether neighbouring satellites can talk"
    >
      <defs>
        <marker
          id="entire-arrow"
          markerWidth="16"
          markerHeight="16"
          viewBox="0 -8 16 16"
          orient="auto"
        >
          <polygon points="0,0 16,-8 16,8" fill="none"></polygon>
        </marker>
        <marker
          id="entire-arrow-end"
          markerWidth="16"
          markerHeight="16"
          viewBox="-16 -8 16 16"
          orient="auto"
        >
          <polygon points="0,0 -16,-8 -16,8" fill="none"></polygon>
        </marker>
      </defs>

      ${bodyDisc(store, scale)}

      <!-- Legend in top-left -->
      ${computed(() => {
        const frag = document.createDocumentFragment();
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute(
          "transform",
          `translate(${-ENTIRE_FRAME / 2 + 15} ${-ENTIRE_FRAME / 2 + 15})`,
        );

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "0");
        rect.setAttribute("y", "0");
        rect.setAttribute("width", "180");
        rect.setAttribute("height", "55");
        rect.setAttribute("fill", "var(--surface)");
        rect.setAttribute("stroke", "var(--line)");
        rect.setAttribute("rx", "4");
        g.appendChild(rect);

        const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
        title.setAttribute("x", "6");
        title.setAttribute("y", "18");
        title.setAttribute("class", "plot-label");
        title.setAttribute("font-size", "12");
        title.setAttribute("font-weight", "600");
        title.setAttribute("text-anchor", "start");
        title.textContent = "Orbit";
        g.appendChild(title);

        const altText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        altText.setAttribute("x", "6");
        altText.setAttribute("y", "34");
        altText.setAttribute("class", "plot-label");
        altText.setAttribute("font-size", "11");
        altText.setAttribute("text-anchor", "start");
        altText.textContent = `Altitude: ${length(altitude.value)}`;
        g.appendChild(altText);

        if (soiFinite.value > 0) {
          const soiText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          soiText.setAttribute("x", "6");
          soiText.setAttribute("y", "50");
          soiText.setAttribute("class", "plot-label");
          soiText.setAttribute("font-size", "11");
          soiText.setAttribute("fill", "var(--plot-soi)");
          soiText.setAttribute("text-anchor", "start");
          soiText.textContent = `SOI: ${length(soiFinite.value - radius.value)}`;
          g.appendChild(soiText);
        }

        frag.appendChild(g);
        return frag;
      })}

      <!-- What each satellite can reach. -->
      ${computed(() => {
        const pts = points.value;
        const sc = scale.value;
        const r = range.value * sc;
        const frag = document.createDocumentFragment();
        for (const pt of pts) {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("class", "reach");
          circle.setAttribute("cx", pt.x * sc);
          circle.setAttribute("cy", pt.y * sc);
          circle.setAttribute("r", r);
          frag.appendChild(circle);
        }
        return frag;
      })}

      <!-- The stable circle, when there is one. -->
      ${computed(() => {
        if (stable.value <= 0) return document.createDocumentFragment();
        const frag = document.createDocumentFragment();
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "stable");
        circle.setAttribute("cx", "0");
        circle.setAttribute("cy", "0");
        circle.setAttribute("r", stable.value * scale.value);
        frag.appendChild(circle);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "plot-label stable-label");
        text.setAttribute("x", "0");
        text.setAttribute("y", -stable.value * scale.value);
        text.setAttribute("dy", "-0.4em");
        text.setAttribute("text-anchor", "middle");
        text.textContent = `Stable: ${length(stable.value - radius.value)}`;
        frag.appendChild(text);
        return frag;
      })}

      <!-- The orbit. -->
      <circle class="orbit" cx="0" cy="0" r=${computed(() => sma.value * scale.value)} />

      <!-- One dot for each satellite. -->
      ${computed(() => {
        const pts = points.value;
        const sc = scale.value;
        const frag = document.createDocumentFragment();
        for (const pt of pts) {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("class", "satellite");
          circle.setAttribute("cx", pt.x * sc);
          circle.setAttribute("cy", pt.y * sc);
          circle.setAttribute("r", "5");
          frag.appendChild(circle);
        }
        return frag;
      })}

      <!-- A hop to the next satellite, blue if it is clear and red if not. -->
      ${computed(() => {
        const h = hops.value;
        const l = links.value;
        const pts = points.value;
        const sc = scale.value;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < h.length; i++) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("class", l[i + 1] ? "line-clear" : "line-blocked");
          line.setAttribute("x1", pts[0].x * sc);
          line.setAttribute("y1", pts[0].y * sc);
          line.setAttribute("x2", pts[i + 1].x * sc);
          line.setAttribute("y2", pts[i + 1].y * sc);
          line.setAttribute("marker-start", "url(#entire-arrow)");
          line.setAttribute("marker-end", "url(#entire-arrow-end)");
          frag.appendChild(line);
        }
        return frag;
      })}
      ${computed(() => {
        if (soiFinite.value <= 0) return document.createDocumentFragment();
        const frag = document.createDocumentFragment();
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "soi");
        circle.setAttribute("cx", "0");
        circle.setAttribute("cy", "0");
        circle.setAttribute("r", soiFinite.value * scale.value);
        frag.appendChild(circle);
        return frag;
      })}

      <!-- How far apart each pair of neighbours is. -->
      ${computed(() => {
        const h = hops.value;
        const pts = points.value;
        const dists = distances.value;
        const sc = scale.value;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < h.length; i++) {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("class", "plot-label distance");
          text.setAttribute("x", (pts[0].x * 0.3 + pts[i + 1].x * 0.7) * sc);
          text.setAttribute("y", (pts[0].y * 0.3 + pts[i + 1].y * 0.7) * sc);
          text.setAttribute("dy", "0.4em");
          text.setAttribute("font-size", "14");
          text.setAttribute("font-weight", "500");
          text.setAttribute("text-anchor", "middle");
          text.textContent = length(dists[i + 1] ?? 0);
          frag.appendChild(text);
        }
        return frag;
      })}
    </svg>
  `;
}
