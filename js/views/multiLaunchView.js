/**
 * The multiple launch view: what it costs to lift a whole ring one step up or
 * down rather than launching fresh satellites into a new one.
 *
 * As with the single launch view this is a drawing, not a measurement: the
 * two candidate orbits are fixed circles and the six figures are what move.
 *
 * @module
 */

import { computed } from "../reactive.js";
import { html } from "../html.js";
import * as orbital from "../calculator/orbital.js";
import { length, speed, time } from "../format.js";
import { SMALL_FRAME } from "./plot.js";

/** @typedef {import("../store.js").Store} Store */

/** The view is one unit taller at the top, for the first pair of figures. */
const TOP = 220;

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function multiLaunchView(store) {
  const body = store.body;
  const radius = computed(() => body.value?.radius ?? 0);
  const gravity = computed(() => body.value?.stdGravity ?? 0);
  const altitude = computed(() => store.chain.value.altitude);
  const sma = computed(() => radius.value + altitude.value);
  const count = computed(() => Math.max(1, store.chain.value.count));
  const color = computed(() => body.value?.color ?? "rgb(128,128,128)");

  const period = computed(() => (sma.value > 0 ? orbital.period(sma.value, gravity.value) : 0));

  /**
   * The altitude the chain's orbit would have to take for one more or one
   * fewer satellite to fit in the same period.
   *
   * @param {number} sign +1 for one more satellite, -1 for one fewer
   * @returns {number} altitude, km
   */
  const step = (sign) =>
    orbital.sma(gravity.value, period.value * ((count.value + sign) / count.value)) * 2 -
    (altitude.value + radius.value * 2);

  const higher = computed(() => (count.value < 2 || sma.value <= 0 ? 0 : step(1)));
  const lower = computed(() => (count.value < 2 || sma.value <= 0 ? 0 : step(-1)));

  const higherPeriod = computed(() => period.value * ((count.value + 1) / count.value));
  const lowerPeriod = computed(() => period.value * ((count.value - 1) / count.value));

  // The calculator works in km/s, the figures in m/s.
  const higherCost = computed(
    () => orbital.hohmannStartDV(sma.value, radius.value + higher.value, gravity.value) * 1000,
  );
  const lowerCost = computed(
    () => orbital.hohmannStartDV(sma.value, radius.value + lower.value, gravity.value) * 1000,
  );

  return html`
    <svg
      class="plot launch"
      viewBox=${`-${SMALL_FRAME / 2} -${TOP} ${SMALL_FRAME} ${SMALL_FRAME}`}
      role="img"
      aria-label="Raising or lowering the whole ring, and what each step costs"
    >
      <circle class="launch-body" cx="0" cy="0" r="20" fill=${color}></circle>
      <circle class="night-orbit" cx="0" cy="0" r="50"></circle>
      <circle class="night-orbit dashed" cx="0" cy="0" r="150"></circle>

      <!-- The ring above and the ring below. -->
      <circle class="orbit-higher" cx="0" cy="20" r="130"></circle>
      <circle class="orbit-lower" cx="0" cy="-20" r="170"></circle>

      <text class="plot-label" x="0" y="-190" dy="-0.4em">
        Higher period: ${computed(() => time(higherPeriod.value))}
      </text>
      <text class="plot-label" x="0" y="-185" dy="1.2em">
        Ap: ${computed(() => length(higher.value))}
      </text>

      <text class="plot-label" x="0" y="-110" dy="-0.4em">
        Lower period: ${computed(() => time(lowerPeriod.value))}
      </text>
      <text class="plot-label" x="0" y="-105" dy="1.2em">
        Pe: ${computed(() => length(lower.value))}
      </text>

      <text class="plot-label" x="0" y="130" dy="-0.4em">
        ΔV to lower: ${computed(() => speed(lowerCost.value))}
      </text>
      <text class="plot-label" x="0" y="150" dy="1.2em">
        ΔV to higher: ${computed(() => speed(higherCost.value))}
      </text>
    </svg>
  `;
}
