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

  it("inner Batch in Batch is one-off and closes after first run", async () => {
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

    // Change outer: rerun outer Batch, inner Batch should be recreated and closed again
    outer.set(1);
    await tick();
    assert.strictEqual(innerRuns, 2);

    // inner Batch should not keep running on innerSource changes
    innerSource.set(1);
    await tick();
    assert.strictEqual(innerRuns, 2);

    stopOuter();
  });

  it("inner Batch in Batch does not accumulate on outer reruns", async () => {
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

    trigger.set(1);
    await tick();
    assert.strictEqual(runs, 2); // one inner Batch per each outer run

    source.set(1);
    await tick();
    // all inner Batches are already closed, no new ones are created
    assert.strictEqual(runs, 2);

    stop();
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
