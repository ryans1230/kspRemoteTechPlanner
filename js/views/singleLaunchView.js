/**
 * The single launch view: the cost of putting one satellite into an orbit
 * that already has a chain on it, and how far the transfer has to be slid
 * round to arrive where the next satellite is.
 *
 * The transfer is a drawing rather than a measurement: the geometry is fixed
 * and only the four figures move, because what matters here is the relation
 * between them, not where they sit on the page.
 *
 * @module
 */

import { computed } from "../reactive.js";
import { html } from "../html.js";
import * as orbital from "../calculator/orbital.js";
import * as satellite from "../calculator/satellite.js";
import { number, speed, time } from "../format.js";
import { SMALL_FRAME } from "./plot.js";

/** @typedef {import("../store.js").Store} Store */

/**
 * @param {Store} store
 * @returns {import("../html.js").Fragment}
 */
export function singleLaunchView(store) {
  const body = store.body;
  const radius = computed(() => body.value?.radius ?? 0);
  const gravity = computed(() => body.value?.stdGravity ?? 0);
  const parking = computed(() => radius.value + store.chain.value.parkingAlt);
  const target = computed(() => radius.value + store.chain.value.altitude);
  const count = computed(() => Math.max(1, store.chain.value.count));
  const color = computed(() => body.value?.color ?? "rgb(128,128,128)");

  // The calculator works in km/s, the figures in m/s.
  const start = computed(
    () => orbital.hohmannStartDV(parking.value, target.value, gravity.value) * 1000,
  );
  const finish = computed(
    () => orbital.hohmannFinishDV(parking.value, target.value, gravity.value) * 1000,
  );
  const total = computed(() => Math.abs(start.value) + Math.abs(finish.value));

  const slideAngle = computed(() =>
    satellite.slidePhaseAngle(gravity.value, count.value, target.value, parking.value),
  );
  const slideTime = computed(
    () => (slideAngle.value / 360) * orbital.period(parking.value, gravity.value),
  );

  return html`
    <svg
      class="plot launch"
      viewBox=${`-${SMALL_FRAME / 2} -${SMALL_FRAME / 2} ${SMALL_FRAME} ${SMALL_FRAME}`}
      role="img"
      aria-label="The transfer from the parking orbit to the chain's orbit, and what it costs"
    >
      <defs>
        <marker id="launch-ship" markerWidth="10" markerHeight="10" viewBox="-5 -5 10 10">
          <polygon class="ship" points="-5,0 5,-5 5,5"></polygon>
        </marker>
        <circle id="launch-spot" cx="-150" cy="0" r="4"></circle>
      </defs>

      <!-- The transfer, with a ship at the middle of each leg. -->
      <path
        class="transfer"
        marker-mid="url(#launch-ship)"
        d="M 50,0 A 100,100 90 0 0 -50,-100 A 100,100 90 0 0 -150,0"
      ></path>

      <!--
        Where the new satellite is going: the empty spot, ringed, between the
        two satellites already either side of it. Each is turned about the
        body's centre, which is why they sit at an angle rather than on top of
        one another.
      -->
      <use href="#launch-spot" class="spot-early"></use>
      <use href="#launch-spot" class="spot-target"></use>
      <use href="#launch-spot" class="spot-late"></use>

      <circle class="night-orbit" cx="0" cy="0" r="150"></circle>
      <circle class="night-orbit" cx="0" cy="0" r="50"></circle>
      <circle class="launch-body" cx="0" cy="0" r="20" fill=${color}></circle>

      <text class="plot-label" x="100" y="0">
        <tspan x="100" dy="-0.4em">Start dV:</tspan>
        <tspan x="100" dy="1.2em">${computed(() => speed(start.value))}</tspan>
      </text>
      <text class="plot-label" x="-100" y="0">
        <tspan x="-100" dy="-0.4em">Finish dV:</tspan>
        <tspan x="-100" dy="1.2em">${computed(() => speed(finish.value))}</tspan>
      </text>
      <text class="plot-label" x="0" y="50" dy="1.2em">
        Total dV: ${computed(() => speed(total.value))}
      </text>

      <text class="plot-label" x="0" y="-150" dy="-0.4em">
        Slide angle: ${computed(() => `${number(slideAngle.value)} deg.`)}
      </text>
      <text class="plot-label" x="0" y="150" dy="1.2em">
        Slide time: ${computed(() => time(slideTime.value))}
      </text>
    </svg>
  `;
}
