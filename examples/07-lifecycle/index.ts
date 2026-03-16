import { List, Value, Batch, Watch } from "../../src/index.js";

const list = List([1, 2, 3]);
const value = Value(0);

const stop = Batch(() => {
  value.get();

  // Watch created inside Batch — stops with it
  Watch(list, () => {});
});

value.set(1); // → value: 1, Watch re-created
list.push(4); // → list changed: [4]

stop(); // → everything stopped

value.set(2); // → silence
list.push(5); // → silence
