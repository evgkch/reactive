import { Value, Batch } from "../../src/index.js";

const a = Value(1);
const b = Value(2);

const stop = Batch(() => {
  // runs immediately, then on every change
  a.get();
  b.get();
});
// → sum: 3

// Multiple changes — one rerun
a.set(10);
b.set(20);
// one microtask later → sum: 30

stop();
a.set(99); // → silence

// Nested Batch — runs once, then stops
Batch(() => {
  a.get();
  Batch(() => {
    // one-shot: runs once when outer runs, then closes
    b.get();
  });
});
