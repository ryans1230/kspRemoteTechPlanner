/**
 * The night view: how much of the orbit the satellite spends out of the sun,
 * and what that costs in generators and batteries.
 *
 * The shadow is drawn as a bar across the orbit, and the figures sit at the
 * corners of it, so the four numbers are read against the picture rather than
 * listed beside it.
 *
 * @module
 */

import { computed } from "../reactive.js";
import { html } from "../html.js";
import * as orbital from "../calculator/orbital.js";
import * as satellite from "../calculator/satellite.js";
import { energy, power, time } from "../format.js";
import { SMALL_FRAME } from "./plot.js";

/** @typedef {import("../store.js").Store} Store */

/** How far out the drawn orbit is, as a share of the frame. */
const ORBIT = 150;

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function nightView(store) {
  const body = store.body;
  const radius = computed(() => body.value?.radius ?? 0);
  const gravity = computed(() => body.value?.stdGravity ?? 0);
  const sma = computed(() => radius.value + store.chain.value.altitude);
  const color = computed(() => body.value?.color ?? "rgb(128,128,128)");

  const period = computed(() => (sma.value > 0 ? orbital.period(sma.value, gravity.value) : 0));
  const night = computed(() =>
    sma.value > 0 ? orbital.nightTime(radius.value, sma.value, gravity.value) : 0,
  );

  /** Everything the satellite draws, as the calculator wants it. */
  const load = computed(() =>
    store.antennas.value.map((slot) => ({
      elcNeeded: slot.antenna?.elcNeeded ?? 0,
      quantity: slot.quantity,
    })),
  );
  const probe = computed(() => store.chain.value.elcNeeded);
  const generator = computed(() =>
    satellite.requiredGenerator(probe.value, load.value, radius.value, gravity.value, sma.value),
  );
  const battery = computed(() =>
    satellite.requiredBattery(probe.value, load.value, radius.value, gravity.value, sma.value),
  );

  return html`
    <svg
      class="plot night"
      viewBox=${`-${SMALL_FRAME / 2} -${SMALL_FRAME / 2} ${SMALL_FRAME} ${SMALL_FRAME}`}
      role="img"
      aria-label="The orbit's shadow, and the generator and battery the satellite needs to fly it"
    >
      <rect class="night-shadow" x="0" y="-50" width="200" height="100"></rect>
      <circle class="night-orbit" cx="0" cy="0" r=${ORBIT}></circle>
      <circle class="night-body" cx="0" cy="0" r="50" fill=${color}></circle>

      <text class="plot-label" x="0" y=${-ORBIT} dy="-0.4em">
        Orbital period: ${computed(() => time(period.value))}
      </text>
      <text class="plot-label" x="190" y="-50" dy="-0.4em" text-anchor="end">
        Night time: ${computed(() => time(night.value))}
      </text>
      <text class="plot-label" x="0" y=${ORBIT} dy="1.2em">
        Required generator: ${computed(() => power(generator.value))} per sec.
      </text>
      <text class="plot-label" x="190" y="50" dy="1.2em" text-anchor="end">
        Required Battery: ${computed(() => energy(battery.value))}
      </text>
    </svg>
  `;
}
