import { describe, it } from "node:test";
import assert from "node:assert";
import { Struct, Batch, Watch } from "../src/index.js";

const tick = () => Promise.resolve();

describe("Struct", () => {
  it("reads properties like a plain object", () => {
    const user = Struct({ name: "alice", age: 25 });
    assert.strictEqual(user.name, "alice");
    assert.strictEqual(user.age, 25);
  });

  it("Batch restarts when a read property changes", async () => {
    const user = Struct({ name: "alice", age: 25 });
    let name = "";
    Batch(() => {
      name = user.name;
    });
    await tick();
    user.name = "bob";
    await tick();
    assert.strictEqual(name, "bob");
  });

  it("Batch does not restart when an unread property changes", async () => {
    const user = Struct({ name: "alice", age: 25 });
    let runs = 0;
    Batch(() => {
      // only name is read here
      user.name;
      runs++;
    });
    await tick();
    user.age = 30;
    await tick();
    assert.strictEqual(runs, 1);
  });

  it("set with same value does not trigger", () => {
    const user = Struct({ name: "alice" });
    let called = 0;
    const stop = Watch(user, () => {
      called++;
    });
    user.name = "alice";
    assert.strictEqual(called, 0);
    stop();
  });

  it("watch is called synchronously with { key, prev, next }", () => {
    const user = Struct({ name: "alice", age: 25 });
    let patch = null;
    const stop = Watch(user, (p) => {
      if (p.key === "name") patch = p;
    });
    user.name = "bob";
    assert.ok(patch);
    assert.strictEqual(patch.key, "name");
    assert.strictEqual(patch.prev, "alice");
    assert.strictEqual(patch.next, "bob");
    stop();
  });

  it("watch is not called when value is the same", () => {
    const user = Struct({ name: "alice" });
    let calls = 0;
    const stop = Watch(user, () => {
      calls++;
    });
    user.name = "alice";
    assert.strictEqual(calls, 0);
    stop();
  });

  it("close via stop from watch/batch stops all subscriptions", async () => {
    const user = Struct({ name: "alice" });
    let watchCalls = 0;
    const stopWatch = Watch(user, () => {
      watchCalls++;
    });
    let runs = 0;
    const stopBatch = Batch(() => {
      user.name;
      runs++;
    });

    await tick();
    user.name = "bob";
    await tick();
    assert.strictEqual(watchCalls, 1);
    assert.ok(runs >= 2);

    stopWatch();
    stopBatch();
    user.name = "carol";
    await tick();
    assert.strictEqual(watchCalls, 1);
  });

  it("SKIP_KEYS are not tracked or triggered", () => {
    const obj = Struct({ value: 1 });
    // access to __proto__ must not be tracked or trigger reactivity
    const proto = obj.__proto__; // eslint-disable-line no-proto
    assert.ok(proto);
    let calls = 0;
    const stop = Watch(obj, () => {
      calls++;
    });
    // changing prototype / constructor must not trigger reactivity
    obj.constructor = function () {}; // eslint-disable-line no-new-func
    assert.strictEqual(calls, 0);
    stop();
  });
});
