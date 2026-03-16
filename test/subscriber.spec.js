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
    // internal sources is implementation detail; behaviourally, nothing is tracked yet
    assert.deepStrictEqual(sub.received, []);
  });

  it("close unsubscribes from all sources", () => {
    const sub = new TestSubscriber();
    const r1 = new TestReactive();
    const r2 = new TestReactive();
    r1.track(sub);
    r2.track(sub);

    sub.close();

    // subsequent triggers should not reach subscriber
    r1.trigger(1);
    r2.trigger(2);
    assert.deepStrictEqual(sub.received, []);
  });

  it("close clears sources", () => {
    const sub = new TestSubscriber();
    const r = new TestReactive();
    r.track(sub);
    r.trigger(1);
    assert.deepStrictEqual(sub.received, [1]);

    sub.close();

    r.trigger(2);
    assert.deepStrictEqual(sub.received, [1]);
  });

  it("double close does not throw", () => {
    const sub = new TestSubscriber();
    const r = new TestReactive();
    r.track(sub);

    sub.close();
    assert.doesNotThrow(() => sub.close());
  });
});
