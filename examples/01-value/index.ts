import { Value, Batch } from "../../src/index.js";

// Reactive cell — holds a single value
const count = Value(0);

// Batch reruns when count changes
Batch(() => {
  count.get();
});

count.set(1); // → count: 1
count.set(1); // → nothing, same value
count.update((n) => n + 1); // → count: 2

// Watch fires synchronously with prev/next
// (use global Watch helper with Value)
// Watch(count, ({ prev, next }) => { ... });
