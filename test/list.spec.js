import { describe, it } from "node:test";
import assert from "node:assert";
import { List, Batch, Watch } from "../src/index.js";

const tick = () => Promise.resolve();

describe("List", () => {
  it("reads items and length like a plain array", () => {
    const list = List([1, 2]);
    assert.strictEqual(list.length, 2);
    assert.strictEqual(list[0], 1);
    assert.strictEqual(list[1], 2);
  });

  it("Batch restarts on push", async () => {
    const list = List([1]);
    let len = 0;
    Batch(() => {
      len = list.length;
    });
    await tick();
    list.push(2);
    await tick();
    assert.strictEqual(len, 2);
  });

  it("Batch restarts on pop", async () => {
    const list = List([1, 2]);
    let len = 0;
    Batch(() => {
      len = list.length;
    });
    await tick();
    list.pop();
    await tick();
    assert.strictEqual(len, 1);
  });

  it("Batch restarts on shift", async () => {
    const list = List([1, 2]);
    let first = 0;
    Batch(() => {
      first = list[0];
    });
    await tick();
    list.shift();
    await tick();
    assert.strictEqual(first, 2);
  });

  it("Batch restarts on unshift", async () => {
    const list = List([1, 2]);
    let first = 0;
    Batch(() => {
      first = list[0];
    });
    await tick();
    list.unshift(0);
    await tick();
    assert.strictEqual(first, 0);
  });

  it("Batch restarts on splice", async () => {
    const list = List([1, 2, 3]);
    let snapshot = [];
    Batch(() => {
      snapshot = list.map((x) => x);
    });
    await tick();
    list.splice(1, 1, 10);
    await tick();
    assert.deepStrictEqual(snapshot, [1, 10, 3]);
  });

  it("Batch restarts on sort", async () => {
    const list = List([3, 1, 2]);
    let snapshot = [];
    Batch(() => {
      snapshot = list.map((x) => x);
    });
    await tick();
    list.sort((a, b) => a - b);
    await tick();
    assert.deepStrictEqual(snapshot, [1, 2, 3]);
  });

  it("Batch restarts on reverse", async () => {
    const list = List([1, 2, 3]);
    let snapshot = [];
    Batch(() => {
      snapshot = list.map((x) => x);
    });
    await tick();
    list.reverse();
    await tick();
    assert.deepStrictEqual(snapshot, [3, 2, 1]);
  });

  it("Batch restarts on fill", async () => {
    const list = List([1, 2, 3]);
    let snapshot = [];
    Batch(() => {
      snapshot = list.map((x) => x);
    });
    await tick();
    list.fill(0);
    await tick();
    assert.deepStrictEqual(snapshot, [0, 0, 0]);
  });

  it("Batch restarts on copyWithin", async () => {
    const list = List([1, 2, 3, 4]);
    let snapshot = [];
    Batch(() => {
      snapshot = list.map((x) => x);
    });
    await tick();
    list.copyWithin(1, 0, 2);
    await tick();
    assert.deepStrictEqual(snapshot, [1, 1, 2, 4]);
  });

  it("Batch restarts when iterating via map/filter etc.", async () => {
    const list = List([1, 2, 3]);
    let result = [];
    Batch(() => {
      result = list.filter((x) => x > 1).map((x) => x * 2);
    });
    await tick();
    assert.deepStrictEqual(result, [4, 6]);
    list.push(4);
    await tick();
    assert.deepStrictEqual(result, [4, 6, 8]);
  });

  it("watch receives correct ListPatch for each operation", () => {
    const list = List([1, 2, 3]);
    const patches = [];
    Watch(list, (p) => patches.push(p));

    list.push(4);
    const pushPatch = patches[patches.length - 1];
    assert.strictEqual(pushPatch.start, 3);
    assert.deepStrictEqual(pushPatch.removed, []);
    assert.deepStrictEqual(pushPatch.added, [4]);

    list.pop();
    const popPatch = patches[patches.length - 1];
    assert.strictEqual(popPatch.start, 3);
    assert.deepStrictEqual(popPatch.removed, [4]);
    assert.deepStrictEqual(popPatch.added, []);

    list.splice(1, 1, 10);
    const splicePatch = patches[patches.length - 1];
    assert.strictEqual(splicePatch.start, 1);
    assert.deepStrictEqual(splicePatch.removed, [2]);
    assert.deepStrictEqual(splicePatch.added, [10]);
  });

  it("sort/reverse produce patches with reorder === true", () => {
    const list = List([3, 1, 2]);
    const patches = [];
    list.watch((p) => patches.push(p));

    list.sort((a, b) => a - b);
    const sortPatch = patches[patches.length - 1];
    assert.strictEqual(sortPatch.reorder, true);

    list.reverse();
    const reversePatch = patches[patches.length - 1];
    assert.strictEqual(reversePatch.reorder, true);
  });

  it("close via stop from watch/batch stops subscriptions", async () => {
    const list = List([1, 2]);
    let watchCalls = 0;
    const stopWatch = list.watch(() => {
      watchCalls++;
    });
    let runs = 0;
    const stopBatch = Batch(() => {
      list.length;
      runs++;
    });

    await tick();
    list.push(3);
    await tick();
    assert.ok(runs >= 2);
    assert.strictEqual(watchCalls, 1);

    stopWatch();
    stopBatch();
    list.push(4);
    await tick();
    assert.strictEqual(watchCalls, 1);
  });
});
