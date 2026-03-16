import { describe, it } from "node:test";
import assert from "node:assert";
import { Subscriber, Reactive } from "../src/index.js";

class TestReactive extends Reactive {
  trigger(data) {
    this.emit("k", data);
  }
  track(sub) {
    this.observe("k", sub);
  }
}

class TestSubscriber extends Subscriber {
  constructor() {
    super();
    this.received = [];
  }
  receive(data) {
    this.received.push(data);
  }
}

describe("Subscriber", () => {
  it("sources is empty on creation", () => {
    const sub = new TestSubscriber();
    assert.strictEqual(sub.sources.size, 0);
  });

  it("close unsubscribes from all sources", () => {
    const sub = new TestSubscriber();
    const r1 = new TestReactive();
    const r2 = new TestReactive();
    r1.track(sub);
    r2.track(sub);
    assert.strictEqual(sub.sources.size, 2);

    sub.close();

    assert.strictEqual(sub.sources.size, 0);
    r1.trigger(1);
    r2.trigger(2);
    assert.deepStrictEqual(sub.received, []);
  });

  it("close clears sources", () => {
    const sub = new TestSubscriber();
    const r = new TestReactive();
    r.track(sub);
    assert.ok(sub.sources.size > 0);

    sub.close();

    assert.strictEqual(sub.sources.size, 0);
  });

  it("double close does not throw", () => {
    const sub = new TestSubscriber();
    const r = new TestReactive();
    r.track(sub);

    sub.close();
    assert.doesNotThrow(() => sub.close());
  });
});
