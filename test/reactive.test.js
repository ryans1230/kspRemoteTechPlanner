import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { batch, computed, effect, isSignal, signal } from "../js/reactive.js";

describe("signal", () => {
  it("holds a value", () => {
    const count = signal(3);
    assert.equal(count.value, 3);
    assert.equal(isSignal(count), true);
    assert.equal(isSignal(3), false);
  });

  it("notifies subscribers when the value changes", () => {
    const count = signal(0);
    let seen = 0;
    count.subscribe(() => seen++);

    count.set(1);
    count.set(2);

    assert.equal(seen, 2);
    assert.equal(count.value, 2);
  });

  it("stays quiet when the value does not change", () => {
    const count = signal(1);
    let calls = 0;
    count.subscribe(() => calls++);

    count.set(1);
    count.set(1);

    assert.equal(calls, 0);
  });

  it("compares objects by identity", () => {
    const chain = signal({ count: 1 });
    let calls = 0;
    chain.subscribe(() => calls++);

    chain.set({ count: 1 });

    assert.equal(calls, 1, "a new object with the same shape still counts as a change");
  });

  it("stops notifying after unsubscribe", () => {
    const count = signal(0);
    let calls = 0;
    const unsubscribe = count.subscribe(() => calls++);

    unsubscribe();
    count.set(1);

    assert.equal(calls, 0);
  });
});

describe("peek", () => {
  it("does not register a dependency", () => {
    const count = signal(1);
    let runs = 0;

    effect(() => {
      runs++;
      count.peek();
    });

    count.set(2);

    assert.equal(runs, 1);
  });
});

describe("computed", () => {
  it("derives its value from other signals", () => {
    const width = signal(2);
    const height = signal(3);
    const area = computed(() => width.value * height.value);

    assert.equal(area.value, 6);

    width.set(4);
    assert.equal(area.value, 12);
  });

  it("chains through other derived signals", () => {
    const count = signal(1);
    const doubled = computed(() => count.value * 2);
    const summary = computed(() => `count is ${doubled.value}`);

    assert.equal(summary.value, "count is 2");

    count.set(7);
    assert.equal(summary.value, "count is 14");
  });

  it("only notifies when its own result changes", () => {
    const count = signal(1);
    const isEven = computed(() => count.value % 2 === 0);
    let calls = 0;
    isEven.subscribe(() => calls++);

    count.set(3);
    assert.equal(calls, 0);

    count.set(4);
    assert.equal(calls, 1);
  });

  it("follows whichever inputs the last run touched", () => {
    const useLeft = signal(true);
    const left = signal("L");
    const right = signal("R");
    const chosen = computed(() => (useLeft.value ? left.value : right.value));

    assert.equal(chosen.value, "L");

    useLeft.set(false);
    assert.equal(chosen.value, "R");

    // left is no longer a dependency, so this must not wake the signal up
    let calls = 0;
    chosen.subscribe(() => calls++);
    left.set("L2");
    assert.equal(calls, 0);

    right.set("R2");
    assert.equal(calls, 1);
  });

  it("settles on the right value when two paths depend on one signal", () => {
    const count = signal(1);
    const doubled = computed(() => count.value * 2);
    const summary = computed(() => `${count.value}/${doubled.value}`);

    count.set(4);

    assert.equal(summary.value, "4/8");
  });
});

describe("effect", () => {
  it("runs immediately and again on every change", () => {
    const count = signal(0);
    const seen = [];
    effect(() => seen.push(count.value));

    count.set(1);
    count.set(2);

    assert.deepEqual(seen, [0, 1, 2]);
  });

  it("runs its cleanup before the next run", () => {
    const count = signal(0);
    const log = [];
    effect(() => {
      const current = count.value;
      log.push(`run ${current}`);
      return () => log.push(`clean ${current}`);
    });

    count.set(1);

    assert.deepEqual(log, ["run 0", "clean 0", "run 1"]);
  });

  it("runs its cleanup when disposed", () => {
    const count = signal(0);
    const log = [];
    const dispose = effect(() => {
      count.value;
      return () => log.push("clean");
    });

    dispose();
    dispose();

    assert.deepEqual(log, ["clean"]);
  });

  it("does not run again after dispose", () => {
    const count = signal(0);
    let runs = 0;
    const dispose = effect(() => {
      runs++;
      count.value;
    });

    dispose();
    count.set(1);

    assert.equal(runs, 1);
  });
});

describe("batch", () => {
  it("returns whatever the callback returned", () => {
    assert.equal(batch(() => "result"), "result");
  });

  it("runs downstream effects once for several writes", () => {
    const width = signal(1);
    const height = signal(2);
    const area = computed(() => width.value * height.value);
    const seen = [];
    effect(() => seen.push(area.value));

    batch(() => {
      width.set(2);
      height.set(3);
    });

    assert.deepEqual(seen, [2, 6]);
  });

  it("nests", () => {
    const a = signal(0);
    const b = signal(0);
    let calls = 0;
    effect(() => {
      a.value;
      b.value;
      calls++;
    });

    batch(() => {
      a.set(1);
      batch(() => b.set(1));
    });

    assert.equal(calls, 2);
  });
});
