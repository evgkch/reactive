# @evgkch/reactive

[![npm](https://img.shields.io/npm/v/@evgkch/reactive)](https://www.npmjs.com/package/@evgkch/reactive)

Minimal reactive primitives for JavaScript and TypeScript.

## Philosophy

Reactivity is explicit. You decide what is reactive. You decide what to track. No magic, no surprises.

This library does the opposite of most reactive systems — it does not auto-wrap nested objects, does not guess what you want to track, and does not hide complexity behind abstractions.

Three primitives for state:

- **`Value`** — a single reactive value
- **`Struct`** — a reactive object, tracked per property
- **`List`** — a reactive array

Two ways to react:

- **`Batch`** — reruns when state changes (batched, async)
- **`Watch`** — fires when an operation happens (sync, with patch)

Two base classes for building your own:

- **`Reactive`** — base for custom reactive primitives
- **`Subscriber`** — base for custom subscribers

Everything in the library is built on these five primitives and two base classes. They are all public — you can extend any of them to build your own reactive primitives that work seamlessly with `Batch` and `Watch`.

## Architecture

```
Context  (@evgkch/context)
│
├── Reactive<D>            deps · observe · emit · detach
│   ├── ReactiveValue<T>   — internal, bound to Value()
│   ├── ReactiveStruct<T>  — internal, bound to proxy via WeakMap
│   └── ReactiveList<T>    — internal, bound to proxy via WeakMap
│
└── Subscriber             sources · receive · close
    ├── Batcher
    └── Watcher<D>
```

`Context` carries the execution stack and ownership tree — close the parent, close everything below it.

`Reactive` adds a dependency map — primitives know who reads them and notify on change.

`Subscriber` adds a source set — effects know what they read and detach on close.

`Batcher` sets itself as current context when it runs. Any `Reactive` read during execution registers it as a subscriber and reruns it on change.

`Struct` and `List` return plain proxies (`T` and `T[]`). Their internal `Reactive` is bound via `WeakMap` — `Watch` finds it automatically.

## Install

```sh
npm install @evgkch/reactive
```

## Quick start

```ts
import { Value, Struct, List, Batch, Watch } from "@evgkch/reactive";

const count = Value(0);

Batch(() => {
    console.log("count:", count.get());
});

count.set(1);             // → count: 1 (next microtask)
count.update(n => n + 1); // → count: 2 (next microtask)
```

## Primitives

### Value

```ts
const score = Value(0);

score.set(10);
score.update(n => n * 2);  // → 20

Batch(() => console.log("score:", score.get()));
```

### Struct

Returns a plain proxy — use it like a normal object. TypeScript sees the original type.

```ts
const user = Struct({ name: "alice", age: 25 });

Batch(() => console.log("name:", user.name));

user.name = "bob";  // → Batch runs (next microtask)
user.age = 30;      // → Batch does NOT run (nobody reads age)
```

### List

Returns a plain array proxy — use it like a normal array. TypeScript sees `T[]`.

```ts
const tasks = List(["buy milk", "write code"]);

Batch(() => console.log(tasks.map(t => t.toUpperCase())));

tasks.push("ship it");  // → Batch runs (next microtask)
tasks.sort();           // → Batch runs (next microtask)
```

## Batch

Runs a function immediately, then reruns it when any reactive value it read has changed. Updates are batched in a microtask — multiple changes in one tick produce one rerun. Returns a stop function.

```ts
const a = Value(1);
const b = Value(2);

const stop = Batch(() => {
    console.log("sum:", a.get() + b.get());
});
// → sum: 3

a.set(10);
b.set(20);
// one microtask later → sum: 30 (not twice)

stop();
a.set(99);  // → silence
```

## Watch

Fires synchronously when an operation happens. Receives patch data describing exactly what changed.

```ts
const list = List([1, 2, 3]);

const stop = Watch(list, patch => {
    console.log("added:", patch.added, "removed:", patch.removed);
});

list.push(4);       // → added: [4] removed: []
list.splice(0, 1);  // → added: [] removed: [1]

stop();
```

Works on `Value` and `Struct` too:

```ts
Watch(user, patch => {
    console.log(`${String(patch.key)}: ${patch.prev} → ${patch.next}`);
});

user.name = "carol";  // → name: bob → carol
```

`Watch` accepts any reactive primitive — `Value`, `Struct`, or `List`. For `Struct` and `List` it finds the internal reactive via `WeakMap` automatically.

Passing a non-reactive object throws:

```ts
Watch({ name: "alice" }, fn)
// → Error: Watch: source is not a reactive primitive
```

Method form is available on `List`:

```ts
tasks.watch(({ start, removed, added, reorder }) => { ... })
```

## Batch vs Watch

|          | `Batch`           | `Watch`                 |
| -------- | ----------------- | ----------------------- |
| Timing   | async (microtask) | sync                    |
| Batching | yes               | no                      |
| Receives | —                 | patch                   |
| Use for  | state → view      | operation → side effect |

## Composition

```ts
const state = Struct({
    filter: Value("all"),
    items: List([
        Struct({ text: "Learn reactive", done: false }),
        Struct({ text: "Build app", done: true }),
    ]),
});

Batch(() => {
    const f = state.filter.get();
    const filtered = state.items.filter(item => {
        if (f === "active") return !item.done;
        if (f === "completed") return item.done;
        return true;
    });
    render(filtered);
});

state.filter.set("active");   // → rerenders next microtask
state.items[0].done = true;   // → rerenders next microtask
```

## Lifecycle

`Batch` and `Watch` created inside another `Batch` are automatically stopped when the outer `Batch` stops. `Batch` created inside a component is automatically stopped when the component is destroyed.

```ts
const stop = Batch(() => {
    Watch(list, patch => { ... })  // stops with outer Batch
    Batch(() => { ... })           // stops with outer Batch
})

stop()  // → everything cleaned up
```

## Debug logging

The library does not implement a logger. You pass your own — it is called with a message and optional metadata.

```ts
import { Batch, Watch, type ReactiveLogger } from "@evgkch/reactive";

const logger: ReactiveLogger = {
    log(message, meta) {
        console.log(message, meta ?? "");
    },
};

Batch.logger = logger;
Watch.logger = logger;
```

Detach by setting to `null`:

```ts
Batch.logger = null
Watch.logger = null
```

## Custom primitives

`Reactive` and `Subscriber` are the base classes that power `Value`, `Struct`, and `List`. You can extend them to build your own reactive primitives that work seamlessly with `Batch` and `Watch`.

```ts
import { Reactive, Watcher } from "@evgkch/reactive";

class Clock extends Reactive<{ prev: number; next: number }> {
    static #KEY = Symbol("tick");
    #value = 0;

    get(): number {
        this.observe(Clock.#KEY);
        return this.#value;
    }

    tick(): void {
        const prev = this.#value;
        this.#value++;
        this.emit(Clock.#KEY, { prev, next: this.#value });
    }

    watch(fn: (data: { prev: number; next: number }) => void): () => void {
        const w = new Watcher(fn);
        this.observe(Clock.#KEY, w);
        return () => w.close();
    }
}

const clock = new Clock();

Batch(() => console.log("tick:", clock.get()));
Watch(clock, ({ prev, next }) => console.log(`${prev} → ${next}`));

clock.tick();  // → 0 → 1 (sync), tick: 1 (microtask)
clock.tick();  // → 1 → 2 (sync), tick: 2 (microtask)
```

## API

| | |
| --- | --- |
| `Value(initial)` | Reactive cell. `.get()`, `.set(v)`, `.update(fn)` |
| `Struct(data)` | Reactive object proxy. Read/write properties as usual |
| `List(initial?)` | Reactive array proxy. Full array API. `.watch(fn)` |
| `Batch(fn)` | Runs `fn` reactively. Returns `() => void` to stop |
| `Watch(source, fn)` | Attach a watcher to any primitive. Returns `() => void` to stop |
| `Reactive<D>` | Base class for custom reactive primitives |
| `Subscriber` | Base class for custom subscribers |
| `Watcher<D>` | Ready-to-use subscriber for `Watch`-style callbacks |
| `ReactiveLogger` | `{ log(message: string, meta?: unknown): void }` |

## License

ISC
