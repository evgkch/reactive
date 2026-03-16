import { describe, it } from "node:test";
import assert from "node:assert";
import { Value, Batch, Untrack } from "../src/index.js";

const tick = () => Promise.resolve();

describe("Untrack", () => {
  it("reads value without tracking inside Batch", async () => {
    const v = Value(0);
    let tracked = 0;
    let untracked = 0;

    const stop = Batch(() => {
      tracked = v.get();
      untracked = Untrack(() => v.get());
    });

    await tick();
    assert.strictEqual(tracked, 0);
    assert.strictEqual(untracked, 0);

    v.set(1);
    await tick();

    // Batch reruns because of tracked get
    assert.strictEqual(tracked, 1);
    // untracked read sees latest value as well
    assert.strictEqual(untracked, 1);

    stop();
  });

  it("does not affect surrounding subscriber context", async () => {
    const v = Value(0);
    const other = Value(0);
    let runs = 0;

    const stop = Batch(() => {
      // tracked dependency
      v.get();
      runs++;

      // untracked read of another value should not register deps
      Untrack(() => {
        other.get();
      });
    });

    await tick();
    assert.strictEqual(runs, 1);

    // change only other: should NOT rerun Batch
    other.set(1);
    await tick();
    assert.strictEqual(runs, 1);

    // change tracked v: should rerun Batch
    v.set(1);
    await tick();
    assert.strictEqual(runs, 2);

    stop();
  });
});

