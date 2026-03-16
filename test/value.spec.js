import { describe, it } from "node:test";
import assert from "node:assert";
import { Value, Batch, Watch } from "../src/index.js";

const tick = () => Promise.resolve();

describe("Value", () => {
  it("get returns initial value", () => {
    const v = Value(42);
    assert.strictEqual(v.get(), 42);
  });

  it("set changes value", () => {
    const v = Value(0);
    v.set(1);
    assert.strictEqual(v.get(), 1);
  });

  it("set with same value does not trigger", () => {
    const v = Value(0);
    let calls = 0;
    Watch(v, () => {
      calls++;
    });
    v.set(0);
    assert.strictEqual(calls, 0);
  });

  it("update updates via function", () => {
    const v = Value(1);
    v.update((x) => x + 1);
    assert.strictEqual(v.get(), 2);
  });

  it("Batch restarts on set via microtask", async () => {
    const v = Value(0);
    let runs = 0;
    Batch(() => {
      v.get();
      runs++;
    });
    assert.strictEqual(runs, 1);
    v.set(1);
    await tick();
    assert.strictEqual(runs, 2);
  });

  it("Batch restarts on update via microtask", async () => {
    const v = Value(0);
    let runs = 0;
    Batch(() => {
      v.get();
      runs++;
    });
    v.update((x) => x + 1);
    await tick();
    assert.strictEqual(runs, 2);
  });

  it("watch is called synchronously with { prev, next }", () => {
    const v = Value(0);
    let patch = null;
    const stopWatch = Watch(v, (p) => {
      patch = p;
    });
    v.set(1);
    assert.ok(patch);
    assert.strictEqual(patch.prev, 0);
    assert.strictEqual(patch.next, 1);
    stopWatch();
  });

  it("watch is not called when value is the same", () => {
    const v = Value(0);
    let calls = 0;
    const stopWatch = Watch(v, () => {
      calls++;
    });
    v.set(0);
    assert.strictEqual(calls, 0);
    stopWatch();
  });

  it("close via stop from watch/batch stops all subscriptions", async () => {
    const v = Value(0);
    let watchCalls = 0;
    const stopWatch = Watch(v, () => {
      watchCalls++;
    });
    let runs = 0;
    const stopBatch = Batch(() => {
      v.get();
      runs++;
    });

    v.set(1);
    await tick();
    assert.strictEqual(watchCalls, 1);
    assert.strictEqual(runs, 2);

    stopWatch();
    stopBatch();
    v.set(2);
    await tick();
    assert.strictEqual(watchCalls, 1);
    assert.strictEqual(runs, 2);
  });
});
