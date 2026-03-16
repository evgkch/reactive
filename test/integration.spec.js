import { describe, it } from "node:test";
import assert from "node:assert";
import {
  Value,
  Struct,
  List,
  Batch,
  Watch,
  Reactive,
  Watcher,
} from "../src/index.js";

const tick = () => Promise.resolve();

class MyPrimitive extends Reactive {
  static #KEY = Symbol("my");
  #value;
  constructor(initial) {
    super();
    this.#value = initial;
  }
  get() {
    this.observe(MyPrimitive.#KEY);
    return this.#value;
  }
  set(v) {
    if (Object.is(this.#value, v)) return;
    const prev = this.#value;
    this.#value = v;
    this.emit(MyPrimitive.#KEY, { prev, next: v });
  }
  watch(fn) {
    const w = new Watcher(fn);
    this.observe(MyPrimitive.#KEY, w);
    return () => w.close();
  }
}

describe("Integration", () => {
  it("Value inside Struct — granular tracking", async () => {
    const state = Struct({
      count: Value(0),
      other: 0,
    });

    let rendered = 0;
    Batch(() => {
      rendered = state.count.get();
    });
    await tick();
    assert.strictEqual(rendered, 0);

    state.count.set(1);
    await tick();
    assert.strictEqual(rendered, 1);

    // changing other Struct fields does not affect a Batch that only reads count
    state.other = 1;
    await tick();
    assert.strictEqual(rendered, 1);
  });

  it("List inside Struct — Batch reacts to list changes", async () => {
    const state = Struct({
      items: List([1, 2]),
    });

    let sum = 0;
    Batch(() => {
      sum = state.items.reduce((a, b) => a + b, 0);
    });
    await tick();
    assert.strictEqual(sum, 3);

    state.items.push(3);
    await tick();
    assert.strictEqual(sum, 6);
  });

  it("Watch + Batch on same primitive both receive notifications", async () => {
    const v = Value(0);
    let batchVal = 0;
    let watchPatch = null;

    Batch(() => {
      batchVal = v.get();
    });
    Watch(v, (p) => {
      watchPatch = p;
    });

    v.set(1);
    await tick();

    assert.strictEqual(batchVal, 1);
    assert.ok(watchPatch);
    assert.strictEqual(watchPatch.prev, 0);
    assert.strictEqual(watchPatch.next, 1);
  });

  it("nested Batch does not accumulate on outer reruns", async () => {
    const trigger = Value(0);
    const source = Value(0);
    let innerRuns = 0;

    const stop = Batch(() => {
      trigger.get();
      Batch(() => {
        source.get();
        innerRuns++;
      });
    });

    await tick();
    assert.strictEqual(innerRuns, 1);

    trigger.set(1);
    await tick();
    assert.strictEqual(innerRuns, 2);

    source.set(1);
    await tick();
    // inner Batches from previous runs are already closed
    assert.strictEqual(innerRuns, 2);

    stop();
  });

  it("closing root Batch stops whole tree", async () => {
    const v = Value(0);
    const list = List([1, 2]);
    let innerBatchRuns = 0;
    let watchCalls = 0;

    const stopRoot = Batch(() => {
      v.get();
      Batch(() => {
        list.length;
        innerBatchRuns++;
      });
      Watch(list, () => {
        watchCalls++;
      });
    });

    await tick();
    list.push(3);
    await tick();
    assert.ok(innerBatchRuns >= 1);
    assert.strictEqual(watchCalls, 1);

    stopRoot();
    list.push(4);
    await tick();
    assert.strictEqual(watchCalls, 1);
  });

  it("custom primitive via Reactive works with Batch and Watch", async () => {
    const p = new MyPrimitive(0);
    let val = 0;
    let patch = null;

    Batch(() => {
      val = p.get();
    });
    Watch(p, (data) => {
      patch = data;
    });

    await tick();
    assert.strictEqual(val, 0);

    p.set(1);
    await tick();

    assert.strictEqual(val, 1);
    assert.ok(patch);
    assert.strictEqual(patch.prev, 0);
    assert.strictEqual(patch.next, 1);
  });
});
