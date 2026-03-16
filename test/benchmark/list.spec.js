import { describe, it } from "node:test";
import assert from "node:assert";
import { List, Watch, Batch } from "../../src/index.js";

function bench(label, fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  assert.ok(end - start >= 0);
}

const tick = () => Promise.resolve();

describe("bench/list", () => {
  it("create List of 1000 items", () => {
    bench("create List(1000)", () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);
      List(arr);
    });
  });

  it("push without subscribers", () => {
    const list = List([]);
    bench("push no subs", () => {
      for (let i = 0; i < 10000; i++) list.push(i);
    });
  });

  it("push with one Watch", () => {
    const list = List([]);
    Watch(list, () => {});
    bench("push + Watch", () => {
      for (let i = 0; i < 5000; i++) list.push(i);
    });
  });

  it("push with one Batch", async () => {
    const list = List([]);
    Batch(() => {
      list.length;
    });
    bench("push + Batch", () => {
      for (let i = 0; i < 5000; i++) list.push(i);
    });
    await tick();
  });

  it("map without subscribers", () => {
    const list = List(Array.from({ length: 1000 }, (_, i) => i));
    bench("map no subs", () => {
      list.map((x) => x * 2);
    });
  });

  it("map inside Batch", async () => {
    const list = List(Array.from({ length: 1000 }, (_, i) => i));
    Batch(() => {
      list.map((x) => x * 2);
    });
    bench("map in Batch", () => {
      list.push(1);
    });
    await tick();
  });

  it("splice with Watch", () => {
    const list = List(Array.from({ length: 1000 }, (_, i) => i));
    Watch(list, () => {});
    bench("splice + Watch", () => {
      list.splice(100, 10, ...Array.from({ length: 10 }, () => 0));
    });
  });

  it("sort with Watch", () => {
    const list = List(Array.from({ length: 1000 }, () => Math.random()));
    Watch(list, () => {});
    bench("sort + Watch", () => {
      list.sort((a, b) => a - b);
    });
  });
});
