import { describe, it } from "node:test";
import assert from "node:assert";
import { Value, Batch } from "../src/index.js";

const tick = () => Promise.resolve();

describe("Batch / Batcher", () => {
  it("runs fn immediately on creation", () => {
    const v = Value(0);
    let runs = 0;
    Batch(() => {
      v.get();
      runs++;
    });
    assert.strictEqual(runs, 1);
  });

  it("restarts on dependency change via microtask", async () => {
    const v = Value(0);
    let runs = 0;
    Batch(() => {
      v.get();
      runs++;
    });
    assert.strictEqual(runs, 1);
    v.set(1);
    assert.strictEqual(runs, 1);
    await tick();
    assert.strictEqual(runs, 2);
  });

  it("multiple changes in one tick cause single rerun", async () => {
    const v = Value(0);
    let runs = 0;
    Batch(() => {
      v.get();
      runs++;
    });
    v.set(1);
    v.set(2);
    await tick();
    assert.strictEqual(runs, 2); // initial run + one rerun
  });

  it("close stops reruns", async () => {
    const v = Value(0);
    let runs = 0;
    const stop = Batch(() => {
      v.get();
      runs++;
    });
    v.set(1);
    await tick();
    assert.strictEqual(runs, 2);
    stop();
    v.set(2);
    await tick();
    assert.strictEqual(runs, 2);
  });

  it("double close does not throw", () => {
    const stop = Batch(() => {});
    stop();
    assert.doesNotThrow(() => stop());
  });

  it("inner Batch reacts to its own dependencies independently of outer Batch", async () => {
    const outer = Value(0);
    const innerSource = Value(0);
    let innerRuns = 0;

    const stopOuter = Batch(() => {
      outer.get();
      Batch(() => {
        innerSource.get();
        innerRuns++;
      });
    });

    await tick();
    assert.strictEqual(innerRuns, 1);

    // Change inner-only source: should rerun inner Batch, outer untouched
    innerSource.set(1);
    await tick();
    assert.strictEqual(innerRuns, 2);

    stopOuter();
  });

  it("inner Batches are closed when outer Batch is stopped", async () => {
    const trigger = Value(0);
    const source = Value(0);
    let runs = 0;

    const stop = Batch(() => {
      trigger.get();
      Batch(() => {
        source.get();
        runs++;
      });
    });

    await tick();
    assert.strictEqual(runs, 1);

    source.set(1);
    await tick();
    assert.strictEqual(runs, 2);

    // stop outer: inner should also stop reacting
    stop();
    source.set(2);
    await tick();
    assert.strictEqual(runs, 2);
  });

  it("Batch outside context lives until explicit stop", async () => {
    const v = Value(0);
    let runs = 0;

    const stop = Batch(() => {
      v.get();
      runs++;
    });

    v.set(1);
    await tick();
    assert.strictEqual(runs, 2);
    stop();
    v.set(2);
    await tick();
    assert.strictEqual(runs, 2);
  });

  it("logs to Batch.logger on init/run/close", async () => {
    const v = Value(0);
    /** @type {{ message: string; meta?: object }[]} */
    const logs = [];

    const prevLogger = Batch.logger;
    Batch.logger = {
      log(message, meta) {
        logs.push({ message, meta });
      },
    };

    const stop = Batch(() => {
      v.get();
    });

    // init + first run (order is implementation detail, so just check counts)
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[batch:init]")).length,
      1,
    );
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[batch:run]")).length,
      1,
    );

    v.set(1);
    await tick();

    // another run
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[batch:run]")).length,
      2,
    );

    stop();

    // close logged once
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[batch:close]")).length,
      1,
    );

    Batch.logger = prevLogger;
  });
});
