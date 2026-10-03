/**
 * Plane geometry for the views, which are drawn in a flat top-down
 * projection of one body's sphere of influence.
 *
 * @module
 */

/** @typedef {import("./point.js").Point} Point */

/**
 * Which of a circle's two crossings to return.
 *
 * @readonly
 * @enum {number}
 */
export const CircleCrossMode = {
  /** The crossing further from the origin. */
  high: 0,
  /** The crossing nearer the origin. */
  low: 1,
};

/**
 * How far from the origin a circle of the given radius reaches when it is
 * centred on `center1` and has to pass `center2`.
 *
 * The circle and the circle of radius `center1`-to-`center2` around `center2`
 * meet at two points, which sit at different distances from the origin;
 * `CircleCrossMode` picks which of them is wanted.
 *
 * @param {Point} origin
 * @param {Point} center1 centre of the circle being measured
 * @param {Point} center2 the point that circle has to reach
 * @param {number} radius of the circle, km
 * @param {0 | 1} mode
 * @returns {number} distance from the origin to the chosen crossing, km
 */
export function circleCross(origin, center1, center2, radius, mode) {
  const dist = length(center1, center2);
  const rad1 = Math.atan2(center2.y - center1.y, center2.x - center1.x);
  const rad2 = Math.acos(dist / (2 * radius));
  const cross1 = {
    x: center1.x + radius * Math.cos(rad1 + rad2),
    y: center1.y + radius * Math.sin(rad1 + rad2),
  };
  const cross2 = {
    x: center1.x + radius * Math.cos(rad1 - rad2),
    y: center1.y + radius * Math.sin(rad1 - rad2),
  };

  const length1 = length(origin, cross1);
  const length2 = length(origin, cross2);
  return mode === CircleCrossMode.high ? Math.max(length1, length2) : Math.min(length1, length2);
}

/**
 * @param {Point} from
 * @param {Point} to
 * @returns {number} the distance, in km
 */
export function length(from, to) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * How far a line between two satellites passes by the body at the origin.
 *
 * Only valid for a point equidistant from both ends, which holds for the
 * evenly spaced satellites this app deals with: the closest point of the
 * line is then its middle.
 *
 * @param {Point} point
 * @param {Point} lineEnd1
 * @param {Point} lineEnd2
 * @returns {number} the distance, in km
 */
export function distPointLine(point, lineEnd1, lineEnd2) {
  const middle = {
    x: lineEnd1.x + (lineEnd2.x - lineEnd1.x) / 2,
    y: lineEnd1.y + (lineEnd2.y - lineEnd1.y) / 2,
  };
  return length(point, middle);
}
