import { describe, it } from "node:test";
import assert from "node:assert";
import { Value, Batch } from "../../src/index.js";

function bench(label, fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  // simple sanity check that the code actually ran
  assert.ok(end - start >= 0);
}

describe("bench/value", () => {
  it("create Value", () => {
    bench("create Value", () => {
      for (let i = 0; i < 10000; i++) {
        Value(i);
      }
    });
  });

  it("get without subscribers", () => {
    const v = Value(0);
    bench("get", () => {
      for (let i = 0; i < 100000; i++) v.get();
    });
  });

  it("get inside Batch with tracking", () => {
    const v = Value(0);
    Batch(() => {
      v.get();
    });
    bench("get tracked", () => {
      for (let i = 0; i < 100000; i++) v.get();
    });
  });

  it("set without subscribers", () => {
    const v = Value(0);
    bench("set", () => {
      for (let i = 0; i < 10000; i++) v.set(i);
    });
  });

  it("set with 1 Batch", () => {
    const v = Value(0);
    Batch(() => {
      v.get();
    });
    bench("set + 1 Batch", () => {
      for (let i = 0; i < 10000; i++) v.set(i);
    });
  });

  it("set with 10 Batches", () => {
    const v = Value(0);
    for (let i = 0; i < 10; i++) {
      Batch(() => {
        v.get();
      });
    }
    bench("set + 10 Batches", () => {
      for (let i = 0; i < 5000; i++) v.set(i);
    });
  });

  it("set with 100 Batches", () => {
    const v = Value(0);
    for (let i = 0; i < 100; i++) {
      Batch(() => {
        v.get();
      });
    }
    bench("set + 100 Batches", () => {
      for (let i = 0; i < 1000; i++) v.set(i);
    });
  });

  it("update", () => {
    const v = Value(0);
    bench("update", () => {
      for (let i = 0; i < 10000; i++) v.update((x) => x + 1);
    });
  });
});
