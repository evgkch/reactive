import { describe, it } from "node:test";
import assert from "node:assert";
import { Value, Watch, Watcher, Batch, List } from "../src/index.js";

describe("Watcher / Watch", () => {
  it("does not run on creation", () => {
    const v = Value(0);
    let calls = 0;
    Watch(v, () => {
      calls++;
    });
    assert.strictEqual(calls, 0);
  });

  it("is called synchronously on change with correct patch", () => {
    const v = Value(0);
    let patch = null;
    Watch(v, (p) => {
      patch = p;
    });
    v.set(1);
    assert.ok(patch);
    assert.strictEqual(patch.prev, 0);
    assert.strictEqual(patch.next, 1);
  });

  it("close stops further calls", () => {
    const v = Value(0);
    let calls = 0;
    const stop = Watch(v, () => {
      calls++;
    });
    v.set(1);
    stop();
    v.set(2);
    assert.strictEqual(calls, 1);
  });

  it("double close does not throw", () => {
    const v = Value(0);
    const stop = Watch(v, () => {});
    stop();
    assert.doesNotThrow(() => stop());
  });

  it("Watcher inside Batch is closed with Batch", () => {
    const v = Value(0);
    const list = List([1, 2, 3]);
    let calls = 0;

    const stop = Batch(() => {
      v.get();
      Watch(list, () => {
        calls++;
      });
    });

    list.push(4);
    assert.strictEqual(calls, 1);
    stop();
    list.push(5);
    assert.strictEqual(calls, 1);
  });

  it("logs to Watch.logger on init/call/close", () => {
    const v = Value(0);
    /** @type {{ message: string; meta?: object }[]} */
    const logs = [];

    const prevLogger = Watch.logger;
    Watch.logger = {
      log(message, meta) {
        logs.push({ message, meta });
      },
    };

    const stop = Watch(v, () => {});

    // init once
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[watch:init]")).length,
      1,
    );

    v.set(1);

    // call once
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[watch:call]")).length,
      1,
    );

    stop();

    // close once
    assert.strictEqual(
      logs.filter((l) => l.message.includes("[watch:close]")).length,
      1,
    );

    Watch.logger = prevLogger;
  });

  it("throws on non-reactive source", () => {
    const plain = {};
    assert.throws(
      () =>
        // runtime guard for non-reactive sources
        Watch(plain, () => {}),
      /Watch: source is not a reactive primitive/,
    );
  });
});
