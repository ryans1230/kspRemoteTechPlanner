/**
 * The description tab: how to read each plot, and how to carry a figure over
 * into MechJeb or a stop-and-copy procedure.
 *
 * It is deliberately prose rather than figures, because everything here is
 * static: nothing on this tab changes with the chain.
 *
 * @module
 */

import { html } from "../html.js";

/**
 * @param {import("../store.js").Store} _store
 * @returns {import("../html.js").Fragment}
 */
export function descriptionView(_store) {
  return html`
    <div class="stack prose">
      <h2>How to read the plots</h2>

      <section class="card">
        <h3>What is drawn</h3>
        <dl>
          <dt>The disc in the middle</dt>
          <dd>The body the chain is planned around, drawn in its own colour at its own radius.</dd>

          <dt>The dashed circle</dt>
          <dd>Its sphere of influence. Nothing in a stable orbit sits above this.</dd>

          <dt>Black circles and dots</dt>
          <dd>The orbit, and one satellite on it for every satellite in the chain.</dd>

          <dt>Red circles</dt>
          <dd>
            How far each satellite's antenna reaches. These are drawn all round, but a satellite
            cannot reach through the body to the far side — which is what the plots next door are
            for.
          </dd>

          <dt>The coloured line</dt>
          <dd>
            The distance from one satellite to the next. Green means the ring holds together the
            whole way round; red means there is a gap in it somewhere.
          </dd>

          <dt>The green circle marked stable</dt>
          <dd>
            Below this altitude every satellite can see both of its neighbours for the whole of its
            orbit. A ring of that many satellites is guaranteed a smooth ring.
          </dd>

          <dt>The black-edged white dot</dt>
          <dd>
            Where a new satellite lands if it makes the transfer on
            <a href="#single">single launch</a> with the node slid by the angle given there.
          </dd>
        </dl>
      </section>

      <section class="card">
        <h3>Slide angle and slide time</h3>
        <p>
          They are the same amount in different units. Sliding the transfer node by this much brings
          the new satellite's arrival point round by 360 / (number of satellites) degrees from its
          neighbour's, which is what makes it land on the next free spot rather than on top of one.
        </p>
      </section>

      <h2>How to use a figure</h2>

      <section class="card">
        <h3>In MechJeb</h3>
        <ol>
          <li>Write down the orbital period of the satellite at the first spot of the chain.</li>
          <li>
            Target it, open the maneuver planner, and create — do not execute — a Hohmann transfer.
          </li>
          <li>
            In the maneuver editor, put the slide time into the shift time box on the Delta-V view.
          </li>
          <li>Add to the shift time and check the intersection pointer moves the way you want.</li>
          <li>Execute the node and circularize at the planned altitude.</li>
          <li>Trim the new satellite's period to the one you wrote down in step 1.</li>
        </ol>
      </section>

      <section class="card">
        <h3>By hand</h3>
        <ol>
          <li>Target the satellite at the first spot of the chain.</li>
          <li>Create a maneuver node to perform a Hohmann transfer.</li>
          <li>
            Slide the node forward by the slide angle or the slide time from the Delta-V view, and
            check the intersection pointer follows it.
          </li>
          <li>Execute the node and circularize at the planned altitude.</li>
        </ol>
      </section>

      <section class="card">
        <h3>What the app assumes</h3>
        <ul>
          <li>Satellites are point-sized and share one orbit.</li>
          <li>
            The chain is evenly spaced, and the satellites were placed by transferring into one spot
            at a time.
          </li>
          <li>
            Antenna ranges are taken at face value, with the range multiplier from
            <a href="#settings">settings</a> applied and nothing else changed.
          </li>
          <li>
            Bending, terrain and the drag of the atmosphere are ignored: the figures are for
            choosing an orbit, not for flying to it.
          </li>
        </ul>
      </section>
    </div>
  `;
}
