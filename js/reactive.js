/**
 * A minimal reactive core: signals, derived signals and effects.
 *
 * Everything the planner shows is derived from a handful of signals, so the
 * whole app can be written as plain functions that read `.value` and let
 * this module decide what has to run again. That replaces the digest cycle
 * of the old AngularJS build: assigning to a signal is the only way to
 * change anything, and everything downstream updates itself.
 *
 * @module
 */

/**
 * A box around a value that notifies subscribers when the value changes.
 *
 * Reading `.value` is free when no derived signal or effect is running, and
 * registers a dependency when one is. Use {@link Signal#peek} to read
 * without registering one, which is what the template layer wants.
 *
 * @template T
 */
export class Signal {
  /**
   * @param {T} value
   */
  constructor(value) {
    /** @type {T} */
    this._value = value;
    /** @type {Set<() => void>} */
    this._subscribers = new Set();
  }

  /**
   * The current value. Reads this inside a derived signal or effect to
   * depend on it.
   *
   * @returns {T}
   */
  get value() {
    track(this);
    return this._value;
  }

  /**
   * The current value, without registering a dependency.
   *
   * @returns {T}
   */
  peek() {
    const outer = tracking;
    tracking = null;
    try {
      return this._value;
    } finally {
      tracking = outer;
    }
  }

  /**
   * Replaces the value and notifies subscribers if it actually changed.
   *
   * @param {T} next
   * @returns {void}
   */
  set(next) {
    if (Object.is(next, this._value)) return;
    this._value = next;
    notify(this);
  }

  /**
   * @param {() => void} subscriber
   * @returns {() => void} a function that removes the subscriber again
   */
  subscribe(subscriber) {
    this._subscribers.add(subscriber);
    return () => this._subscribers.delete(subscriber);
  }
}

/**
 * Creates a writable signal.
 *
 * @template T
 * @param {T} value
 * @returns {Signal<T>}
 */
export function signal(value) {
  return new Signal(value);
}

/**
 * Whether a value is a signal.
 *
 * @param {unknown} value
 * @returns {value is Signal<unknown>}
 */
export function isSignal(value) {
  return value instanceof Signal;
}

/**
 * The signals read by the derived signal or effect that is running right
 * now, or `null` when nothing is tracking.
 *
 * @type {Set<Signal<unknown>>|null}
 */
let tracking = null;

/**
 * The subscribers left waiting by a {@link batch}, to be run once the
 * outermost batch ends. Collecting subscribers rather than signals is what
 * makes a batch that touches two inputs of the same effect run it once.
 *
 * @type {Set<() => void>}
 */
let queued = new Set();

/**
 * @type {number}
 */
let batchDepth = 0;

/**
 * Records a read of `signal` as a dependency of the running derived signal
 * or effect.
 *
 * @param {Signal<unknown>} signal
 * @returns {void}
 */
function track(signal) {
  tracking?.add(signal);
}

/**
 * @param {Signal<unknown>} signal
 * @returns {void}
 */
function notify(signal) {
  if (batchDepth > 0) {
    for (const subscriber of signal._subscribers) queued.add(subscriber);
    return;
  }
  for (const subscriber of [...signal._subscribers]) subscriber();
}

/**
 * Runs `fn` without recording the signals it reads, so work that happens to
 * run inside a derived signal or effect does not become a dependency of it.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T} whatever `fn` returned
 */
export function untrack(fn) {
  const outer = tracking;
  tracking = null;
  try {
    return fn();
  } finally {
    tracking = outer;
  }
}

/**
 * Holds several writes so that everything downstream runs once at the end
 * instead of once per write.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T} whatever `fn` returned
 */
export function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const pending = [...queued];
      queued = new Set();
      for (const subscriber of pending) subscriber();
    }
  }
}

/**
 * Collects the signals read by `derive` and keeps the returned signal in
 * step with them.
 *
 * Dependencies are re-read on every recomputation, so a derived signal can
 * branch: it follows whichever inputs the last run actually touched.
 *
 * @template T
 * @param {() => T} derive
 * @returns {Signal<T>}
 */
export function computed(derive) {
  const result = /** @type {Signal<T>} */ (new Signal(undefined));
  /** @type {Set<Signal<unknown>>} */
  let sources = new Set();

  const recompute = () => {
    for (const source of sources) source._subscribers.delete(recompute);
    /** @type {Set<Signal<unknown>>} */
    const collected = new Set();
    const outer = tracking;
    tracking = collected;
    try {
      result.set(derive());
    } finally {
      tracking = outer;
    }
    sources = collected;
    for (const source of collected) source._subscribers.add(recompute);
  };

  recompute();
  return result;
}

/**
 * Runs `run` now and again whenever a signal it read changes. If `run`
 * returns a function, that function runs before the next run and when the
 * effect is disposed.
 *
 * @template T
 * @param {() => T|(() => void)} run
 * @returns {() => void} a function that stops the effect and runs its cleanup
 */
export function effect(run) {
  /** @type {Set<Signal<unknown>>} */
  let sources = new Set();
  /** @type {(() => void)|void} */
  let cleanup;
  /** @type {boolean} */
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const source of sources) source._subscribers.delete(rerun);
    if (typeof cleanup === "function") cleanup();
  };

  const rerun = () => {
    if (disposed) return;
    for (const source of sources) source._subscribers.delete(rerun);
    /** @type {Set<Signal<unknown>>} */
    const collected = new Set();
    const outer = tracking;
    tracking = collected;
    try {
      if (typeof cleanup === "function") cleanup();
      cleanup = run();
    } finally {
      tracking = outer;
    }
    sources = collected;
    for (const source of collected) source._subscribers.add(rerun);
  };

  rerun();
  return dispose;
}
