import { Struct, List, Value, Batch } from "../../src/index.js";

const state = Struct({
  filter: Value("all"),
  items: List([
    Struct({ text: "Learn reactive", done: false }),
    Struct({ text: "Build app", done: true }),
    Struct({ text: "Ship it", done: false }),
  ]),
});

// Batch reads nested reactive values
Batch(() => {
  const f = state.filter.get();
  const filtered = state.items.filter((item) => {
    if (f === "active") return !item.done;
    if (f === "completed") return item.done;
    return true;
  });
  filtered.map((i) => i.text);
});

state.filter.set("active"); // → rerenders
state.items[0].done = true; // → rerenders
