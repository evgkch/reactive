import { Value, Batch, Watch, configure } from "../src/index.js";

const tick = () => Promise.resolve();

// Batch runs sync (no microtask) — e.g. for tests
configure({ batch: true });
const v = Value(0);
Batch(() => v.get());
v.set(1); // Batch already ran, no tick needed
configure({ batch: false });

// Watch batches like Batch — patches in microtask
configure({ watch: false });
const v2 = Value(0);
Watch(v2, () => {});
v2.set(1);
await tick(); // now watcher runs
configure({ watch: true });
