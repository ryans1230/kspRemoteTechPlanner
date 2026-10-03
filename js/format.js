/**
 * How numbers are shown, so that every view writes the same figures the same
 * way. The rules are the ones the 1.6.x templates used.
 *
 * @module
 */

const LENGTH_UNITS = ["km", "Mm", "Gm", "Tm"];
const LENGTH_STEP = 1000;
const LENGTH_LIMIT = 10000;

/**
 * A distance, growing the unit once the number stops fitting in it.
 *
 * @param {number} km
 * @returns {string} e.g. "1,500 km" or "8,000 Gm"
 */
export function length(km) {
  let value = km;
  let unit = 0;
  while (Math.abs(value) >= LENGTH_LIMIT && unit < LENGTH_UNITS.length - 1) {
    value /= LENGTH_STEP;
    unit++;
  }
  return `${round(value)} ${LENGTH_UNITS[unit]}`;
}

/**
 * A duration, in whole seconds.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function time(seconds) {
  return `${round(Number(seconds.toFixed(1)))} sec.`;
}

/**
 * A velocity.
 *
 * @param {number} mps
 * @returns {string}
 */
export function speed(mps) {
  return `${round(Number(mps.toFixed(1)))} m/s`;
}

/**
 * Electricity, in the unit the game's own antenna list uses.
 *
 * @param {number} ec
 * @returns {string}
 */
export function power(ec) {
  return `${round(Number(ec.toFixed(3)))} EC/s`;
}

/**
 * A stored amount of electricity.
 *
 * @param {number} ec
 * @returns {string}
 */
export function energy(ec) {
  return `${round(Number(ec.toFixed(1)))} EC`;
}

/**
 * A plain number with the locale's thousands separators.
 *
 * @param {number} value
 * @returns {string}
 */
export function number(value) {
  return round(value);
}

/**
 * The fraction a number sits at between two bounds, for a slider or a meter.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number} 0 to 1, and 0 when the bounds leave no room
 */
export function fraction(value, min, max) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * `toLocaleString` without the decimals it adds on its own, so that the
 * figures line up in a column.
 *
 * @param {number} value
 * @returns {string}
 */
function round(value) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
