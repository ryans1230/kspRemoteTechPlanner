/**
 * Orbital mechanics, for circular orbits and Hohmann transfers between
 * them. Every distance is a semimajor axis in km and every time a duration
 * in seconds.
 *
 * @module
 */

/**
 * @param {number} sma semimajor axis, km
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @returns {number} the time for one full orbit, s
 */
export function period(sma, stdGravParam) {
  return 2 * Math.PI * Math.sqrt(sma ** 3 / stdGravParam);
}

/**
 * The semimajor axis of an orbit that takes `period` to complete.
 *
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @param {number} period s
 * @returns {number} km
 */
export function sma(stdGravParam, period) {
  return ((period ** 2 * stdGravParam) / (4 * Math.PI ** 2)) ** (1 / 3);
}

/**
 * How long a satellite spends in the body's shadow.
 *
 * @param {number} radius body radius, km
 * @param {number} sma semimajor axis, km
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @returns {number} s
 */
export function nightTime(radius, sma, stdGravParam) {
  return (period(sma, stdGravParam) * Math.asin(radius / sma)) / Math.PI;
}

/**
 * The burn that raises an orbit, in the first of the two halves of a
 * Hohmann transfer.
 *
 * @param {number} sma1 semimajor axis before the burn, km
 * @param {number} sma2 semimajor axis after it, km
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @returns {number} km/s, positive for a raise and negative for a lower
 */
export function hohmannStartDV(sma1, sma2, stdGravParam) {
  return Math.sqrt(stdGravParam / sma1) * (Math.sqrt((2 * sma2) / (sma1 + sma2)) - 1);
}

/**
 * The circularising burn at the far end of a Hohmann transfer.
 *
 * A raise costs two positive burns, because a transfer whose apoapsis is
 * the mean of the two orbits ends up below the target one; a lowering costs
 * two negative ones.
 *
 * @param {number} sma1 semimajor axis before the transfer, km
 * @param {number} sma2 semimajor axis after it, km
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @returns {number} km/s
 */
export function hohmannFinishDV(sma1, sma2, stdGravParam) {
  return Math.sqrt(stdGravParam / sma2) * (1 - Math.sqrt((2 * sma1) / (sma1 + sma2)));
}

/**
 * How far a transfer node has to be slid along the orbit so that a
 * satellite arriving later lands on the spot a following satellite has
 * already reached.
 *
 * @param {number} slideDeg the whole constellation's worth of phase, degrees
 * @param {number} periodLow period of the lower orbit, s
 * @param {number} periodHigh period of the higher orbit, s
 * @returns {number} degrees to slide the node by
 */
export function slidePhaseAngle(slideDeg, periodLow, periodHigh) {
  return slideDeg / (1 - periodLow / periodHigh);
}
