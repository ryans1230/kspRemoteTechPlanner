/**
 * What a constellation of equally spaced satellites can do: where they sit,
 * whether they can talk to each other, and what it costs to fly them there.
 *
 * @module
 */

import * as euclidean from "./euclidean.js";
import * as orbital from "./orbital.js";

/** @typedef {import("./point.js").Point} Point */

/**
 * One antenna and how many of them a satellite carries.
 *
 * @typedef {{elcNeeded: number, quantity: number}} AntennaLoad
 */

/**
 * The satellites, evenly spaced on a circular orbit.
 *
 * @param {number} count
 * @param {number} sma semimajor axis, km
 * @returns {Point[]}
 */
export function position(count, sma) {
  return Array.from({ length: count }, (_, offset) => {
    const angle = (2 * Math.PI * offset) / count;
    return { x: sma * Math.cos(angle), y: sma * Math.sin(angle) };
  });
}

/**
 * How far each satellite is from the first one.
 *
 * @param {number} count
 * @param {number} sma semimajor axis, km
 * @returns {number[]} km, starting at 0 for the first satellite itself
 */
export function distance(count, sma) {
  const positions = position(count, sma);
  return positions.map((other) => euclidean.length(positions[0], other));
}

/**
 * Whether each satellite can reach the first one.
 *
 * @param {number} radius body radius, km
 * @param {number} count
 * @param {number} sma semimajor axis, km
 * @param {number} range antenna range, km
 * @returns {boolean[]}
 */
export function connectability(radius, count, sma, range) {
  const positions = position(count, sma);
  return positions.map((other, _index) => {
    const inRange = euclidean.length(positions[0], other) <= range;
    const clearOfBody = euclidean.distPointLine({ x: 0, y: 0 }, positions[0], other) > radius;
    return inRange && clearOfBody;
  });
}

/**
 * Whether the satellites form a ring that never has a satellite out of
 * contact, which needs at least three of them and one unobstructed hop.
 *
 * @param {number} radius body radius, km
 * @param {number} count
 * @param {number} sma semimajor axis, km
 * @param {number} range antenna range, km
 * @returns {boolean}
 */
export function hasStableArea(radius, count, sma, range) {
  if (count < 3) return false;
  return connectability(radius, count, sma, range)[1];
}

/**
 * The orbit the stable coverage is drawn at.
 *
 * It is where satellite one sits exactly on the edge of satellite zero's
 * reach, found by {@link euclidean.circleCross} and taken as the crossing
 * further out. {@link hasStableArea} decides whether the orbit actually in
 * use is covered, which is what shows the ring at all.
 *
 * @param {number} count satellites in the chain
 * @param {number} sma semimajor axis, km
 * @param {number} range antenna range, km
 * @returns {number} semimajor axis, km, or 0 when there is no ring to measure
 */
export function stableLimitSma(count, sma, range) {
  if (count < 3 || range <= 0 || sma <= 0) return 0;
  const positions = position(count, sma);
  return euclidean.circleCross(
    { x: 0, y: 0 },
    positions[0],
    positions[1],
    range,
    euclidean.CircleCrossMode.high,
  );
}

/**
 * What the satellite's own electronics and all of its antennas draw
 * together.
 *
 * @param {number} satElc probe consumption excluding antennas, EC/s
 * @param {readonly AntennaLoad[]} antennas
 * @returns {number} EC/s
 */
function totalElcNeeded(satElc, antennas) {
  return antennas.reduce((total, entry) => total + entry.elcNeeded * entry.quantity, satElc);
}

/**
 * How much a battery has to hold to survive one night.
 *
 * @param {number} satElc probe consumption excluding antennas, EC/s
 * @param {readonly AntennaLoad[]} antennas
 * @param {number} radius body radius, km
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @param {number} sma semimajor axis, km
 * @returns {number} EC
 */
export function requiredBattery(satElc, antennas, radius, stdGravParam, sma) {
  const night = orbital.nightTime(radius, sma, stdGravParam);
  return totalElcNeeded(satElc, antennas) * night;
}

/**
 * What a generator has to produce to keep the battery at a constant charge
 * while the satellite spends part of every orbit in shadow.
 *
 * @param {number} satElc probe consumption excluding antennas, EC/s
 * @param {readonly AntennaLoad[]} antennas
 * @param {number} radius body radius, km
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @param {number} sma semimajor axis, km
 * @returns {number} EC/s
 */
export function requiredGenerator(satElc, antennas, radius, stdGravParam, sma) {
  const orbit = orbital.period(sma, stdGravParam);
  const night = orbital.nightTime(radius, sma, stdGravParam);
  return (totalElcNeeded(satElc, antennas) * orbit) / (orbit - night);
}

/**
 * How far along the parking orbit a transfer node has to start so that the
 * new satellite arrives where the following one already is.
 *
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @param {number} count satellites in the chain
 * @param {number} targetSma semimajor axis of the target orbit, km
 * @param {number} parkingSma semimajor axis of the parking orbit, km
 * @returns {number} degrees
 */
export function slidePhaseAngle(stdGravParam, count, targetSma, parkingSma) {
  const parkingPeriod = orbital.period(parkingSma, stdGravParam);
  const targetPeriod = orbital.period(targetSma, stdGravParam);
  return orbital.slidePhaseAngle(360 / count, parkingPeriod, targetPeriod);
}

/**
 * The same slide as a duration along the parking orbit.
 *
 * @param {number} stdGravParam standard gravitational parameter, km^3/s^2
 * @param {number} count satellites in the chain
 * @param {number} targetSma semimajor axis of the target orbit, km
 * @param {number} parkingSma semimajor axis of the parking orbit, km
 * @returns {number} s
 */
export function slidePhaseTime(stdGravParam, count, targetSma, parkingSma) {
  const angle = slidePhaseAngle(stdGravParam, count, targetSma, parkingSma);
  return (angle / 360) * orbital.period(parkingSma, stdGravParam);
}
