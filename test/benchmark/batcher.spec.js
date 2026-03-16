import { describe, it } from "node:test";
import assert from "node:assert";
import { Value, Batch } from "../../src/index.js";

function bench(label, fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  assert.ok(end - start >= 0);
}

const tick = () => Promise.resolve();

describe("bench/batcher", () => {
  it("create Batch", () => {
    const v = Value(0);
    bench("create Batch", () => {
      for (let i = 0; i < 1000; i++) {
        Batch(() => {
          v.get();
        });
      }
    });
  });

  it("restart single Batch", async () => {
    const v = Value(0);
    Batch(() => {
      v.get();
    });
    bench("restart one Batch", () => {
      for (let i = 0; i < 1000; i++) v.set(i);
    });
    await tick();
  });

  it("restart 100 Batches in one tick (batching)", async () => {
    const v = Value(0);
    for (let i = 0; i < 100; i++) {
      Batch(() => {
        v.get();
      });
    }
    bench("restart 100 Batches", () => {
      v.set(1);
    });
    await tick();
  });

  it("nested Batch — create and one-off run", async () => {
    const v = Value(0);
    bench("nested Batch", () => {
      Batch(() => {
        v.get();
        Batch(() => {
          v.get();
        });
      });
    });
    await tick();
  });

  it("close", () => {
    const stop = Batch(() => {});
    bench("close Batch", () => {
      stop();
    });
  });
});
