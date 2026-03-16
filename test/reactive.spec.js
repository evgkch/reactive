import { describe, it } from "node:test";
import assert from "node:assert";
import { Reactive, Subscriber } from "../src/index.js";

class TestSubscriber extends Subscriber {
  constructor() {
    super();
    this.calls = 0;
  }
  receive() {
    this.calls++;
  }
}

class TestReactive extends Reactive {
  observeKey(key, sub) {
    this.observe(key, sub);
  }
  emitKey(key, data) {
    this.emit(key, data);
  }
}

describe("Reactive", () => {
  it("observe with no active subscriber does nothing", () => {
    const r = new TestReactive();
    // no Context.current subscriber
    r.observeKey("a");
    assert.strictEqual(r instanceof Reactive, true);
  });

  it("observe with active subscriber adds to deps", () => {
    const r = new TestReactive();
    const sub = new TestSubscriber();
    sub.run(() => {
      r.observeKey("a");
    });
    // no error and subsequent emits reach the subscriber -> dep added
    r.emitKey("a", 123);
    assert.strictEqual(sub.calls, 1);
  });

  it("observe with explicit subscriber adds without Context.current", () => {
    const r = new TestReactive();
    const sub = new TestSubscriber();
    r.observeKey("a", sub);
    r.emitKey("a", 123);
    assert.strictEqual(sub.calls, 1);
  });

  it("observe twice with same subscriber does not duplicate deps", () => {
    const r = new TestReactive();
    const sub = new TestSubscriber();
    r.observeKey("a", sub);
    r.observeKey("a", sub);
    r.emitKey("a", 123);
    assert.strictEqual(sub.calls, 1);
  });

  it("emit with no subscribers does nothing", () => {
    const r = new TestReactive();
    assert.doesNotThrow(() => r.emitKey("a", 1));
  });

  it("emit calls receive on all subscribers", () => {
    const r = new TestReactive();
    const s1 = new TestSubscriber();
    const s2 = new TestSubscriber();
    r.observeKey("a", s1);
    r.observeKey("a", s2);

    r.emitKey("a", 123);

    assert.strictEqual(s1.calls, 1);
    assert.strictEqual(s2.calls, 1);
  });

  it("detach removes subscriber from all keys", () => {
    const r = new TestReactive();
    const s = new TestSubscriber();
    r.observeKey("a", s);
    r.observeKey("b", s);

    r.detach(s);
    r.emitKey("a", 1);
    r.emitKey("b", 1);

    assert.strictEqual(s.calls, 0);
  });

  it("close clears all deps", () => {
    const r = new TestReactive();
    const s = new TestSubscriber();
    r.observeKey("a", s);

    r.close();
    r.emitKey("a", 1);

    assert.strictEqual(s.calls, 0);
  });
});
