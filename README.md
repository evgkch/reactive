# @evgkch/reactive

[![npm](https://img.shields.io/npm/v/@evgkch/reactive)](https://www.npmjs.com/package/@evgkch/reactive)

Minimal reactive primitives for JavaScript and TypeScript.

## Philosophy

Most reactive libraries do too much — they auto-wrap nested objects, guess what you want to track, and hide complexity behind abstractions.

This library does the opposite: **reactivity is explicit**. You decide what is reactive. You decide what to track. No magic, no surprises.

Three primitives cover everything:

- **`Value`** — a single reactive value
- **`Struct`** — a reactive object, tracked per property
- **`List`** — a reactive array, tracked per index and operation

Two ways to react:

- **`Batch`** — reruns when state changes (batched, async)
- **`Watch`** — fires when an operation happens (sync, with patch)

That's the whole API.

---

## Install

```sh
npm install @evgkch/reactive
```

More examples: see the `examples/` folder in the repo.

---

## Quick start

```ts
import { Value, Struct, List, Batch, Watch } from "@evgkch/reactive";

const count = Value(0);

Batch(() => {
    console.log("count:", count.get());
});

count.set(1); // → count: 1
count.update((n) => n + 1); // → count: 2
```

---

## Primitives

### Value

A single reactive cell. Read with `.get()`, write with `.set()` or `.update()`.

```ts
const score = Value(0);

score.set(10);
score.update((n) => n * 2); // → 20

Batch(() => console.log("score:", score.get()));
```

### Struct

A reactive plain object. Properties are tracked individually — changing `user.name` only wakes Batch callbacks that read `user.name`.

```ts
const user = Struct({ name: "alice", age: 25 });

Batch(() => console.log("name:", user.name));

user.name = "bob"; // → Batch runs
user.age = 30; // → Batch does NOT run (nobody reads age)
```

### List

A reactive array. Tracks individual indices, length, and order separately — so a Batch reading `list[0]` won't rerun on `push` to the end.

```ts
const tasks = List(["buy milk", "write code"]);

Batch(() => console.log(tasks.map((t) => t.toUpperCase())));

tasks.push("ship it"); // → Batch runs
tasks.sort(); // → Batch runs
```

Supported methods: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin` — plus all read methods: `map`, `filter`, `forEach`, `find`, `findIndex`, `some`, `every`, `reduce`, `includes`, `indexOf`.

---

## Batch

Runs a function immediately, then reruns it when any reactive value it read has changed. Updates are **batched in a microtask** — multiple changes in one tick produce one rerun.

Optional second argument: `Batch(fn, immediate?)`. When `immediate === true`, the callback runs synchronously (no microtask). Default comes from `configure({ batch })`.

Returns a stop function to unsubscribe.

```ts
const a = Value(1);
const b = Value(2);

const stop = Batch(() => {
    console.log("sum:", a.get() + b.get());
});
// → sum: 3

a.set(10);
b.set(20);
// one microtask later → sum: 30  (batched, not twice)

stop();
a.set(99);
// → silence
```

---

## Watch

Fires **synchronously** when an operation happens on a primitive. Receives a patch describing exactly what changed.

Optional second argument: `Watch(source, fn, immediate?)` / `source.watch(fn, immediate?)`. When `immediate === false`, the callback is deferred (e.g. batched). Default comes from `configure({ watch })`.

Returns a stop function to unsubscribe.

```ts
const list = List([1, 2, 3]);

const stop = Watch(list, (patch) => {
    const { start, removed, added } = patch;
    if (added.length) console.log("added at", start, ":", added);
    if (removed.length) console.log("removed at", start, ":", removed);
});

list.push(4); // → added: [4]
list.splice(0, 1); // → removed at: 0
list.sort(); // → sorted

stop();
```

`Watch(source, fn)` is sugar for `source.watch(fn)` — each primitive implements `.watch()`, `Watch` just delegates. Callback receives the patch data. Exported patch types: `ValuePatch<T>`, `StructPatch`, `ListPatch<T>`.

```ts
list.watch((patch) => { ... });   // patch is ListPatch<T>
user.watch((patch) => { ... });   // patch is StructPatch
count.watch((patch) => { ... });  // patch is ValuePatch<T>
```

Works on `Value` and `Struct` too:

```ts
Watch(user, (patch) => {
    const { key, prev, next } = patch;
    console.log(`${String(key)}: ${prev} → ${next}`);
});

user.name = "carol"; // → name: bob → carol
```

---

## Composition

Primitives nest naturally. Reactivity is explicit — wrap only what you need to track.

```ts
const state = Struct({
    filter: Value("all"),
    items: List([
        Struct({ text: "Learn reactive", done: false }),
        Struct({ text: "Build app", done: true }),
        Struct({ text: "Ship it", done: false }),
    ]),
});

Batch(() => {
    const f = state.filter.get();
    const filtered = state.items.filter((item) => {
        if (f === "active") return !item.done;
        if (f === "completed") return item.done;
        return true;
    });
    render(filtered);
});

state.filter.set("active"); // → rerenders filtered list
state.items[0].done = true; // → nested Struct triggers Batch
```

Plain objects and arrays inside a `Struct` are **not** reactive — wrap them explicitly if you need tracking.

---

## Custom primitives

You can create your own reactive primitives by extending `Reactive<P>` and using `core`:

1. Define a patch type `P` for your primitive.
2. Implement `protected subscribe(w)`: call `core.track(target, key, w)` for each dependency key.
3. When state changes, call `core.trigger(target, key, patchData)`.

Then `.watch()` and `Watch()` work out of the box; `Batch` will track when you call `core.track` during a read.

```ts
import { Reactive, core, Batch, Watch, type WatcherLike } from "@evgkch/reactive";

const MY_KEY = Symbol("my");

type MyPatch<T> = { prev: T; next: T };

class MyPrimitive<T> extends Reactive<MyPatch<T>> {
    #value: T;
    constructor(initial: T) {
        super();
        this.#value = initial;
    }
    get(): T {
        core.track(this, MY_KEY);
        return this.#value;
    }
    set(v: T): void {
        if (Object.is(this.#value, v)) return;
        const prev = this.#value;
        this.#value = v;
        core.trigger(this, MY_KEY, { prev, next: v });
    }
    protected subscribe(w: WatcherLike): void {
        core.track(this, MY_KEY, w);
    }
}

const x = new MyPrimitive(0);
Batch(() => console.log("x:", x.get()));
Watch(x, (p) => console.log("patch:", p.prev, "→", p.next));
x.set(1); // → patch, then x: 1
```

---

## Batch vs Watch

|          | `Batch`           | `Watch`              |
| -------- | ----------------- | -------------------- |
| Timing   | async (microtask) | sync (immediate)     |
| Batching | yes               | no                   |
| Receives | —                 | patch                |
| Use for  | state → view      | operation → mutation |

The rule of thumb: use `Batch` to derive state or render everything. Use `Watch` when you need to react to a specific operation — like appending a single DOM node on `push` instead of rerendering the whole list.

---

## Configure

```ts
import { configure } from "@evgkch/reactive";

configure({ batch: true }); // Batch runs synchronously (useful in tests)
configure({ watch: false }); // Watch batches like Batch
```

---

## API reference

|                      | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `Value(initial)`     | Reactive cell. `.get()`, `.set(v)`, `.update(fn)`             |
| `Struct(data)`       | Reactive object. Read/write properties as usual               |
| `List(initial?)`     | Reactive array. Full Array API                                |
| `Batch(fn, immediate?)`   | Runs `fn` reactively. Optional `immediate` overrides default. Returns `() => void` to stop |
| `Watch(source, fn, immediate?)` | Sugar for `source.watch(fn, immediate?)`. Returns `() => void` to stop   |
| `source.watch(fn, immediate?)`  | Each primitive has `.watch()`. Returns `() => void` to stop   |
| `configure(options)`      | Set global defaults: `{ batch?, watch? }` for Batch/Watch timing        |
| `ValuePatch<T>`, `StructPatch`, `ListPatch<T>` | Patch types for Watch callbacks (exported)        |
| `core`                    | Low-level: `track`, `trigger`, `setActive`, `configure`, etc.          |
| `Reactive<P>`             | Base class for custom primitives. Implement `subscribe(w)`.             |
