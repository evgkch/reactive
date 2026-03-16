import { Reactive } from "../core/reactive.js";
import { Watcher } from "../effects/watch.js";

const VALUE_KEY = Symbol("value");

export class ValuePatch<T> {
  constructor(
    readonly prev: T,
    readonly next: T,
  ) {}
}

class ReactiveValue<T> extends Reactive<ValuePatch<T>> {
  watch(fn: (data: ValuePatch<T>) => void): () => void {
    const w = new Watcher<ValuePatch<T>>(fn);
    this.observe(VALUE_KEY, w);
    return () => w.close();
  }
}

export function Value<T>(initial: T) {
  const reactive = new ReactiveValue<T>();
  let raw = initial;

  const cell = {
    get(): T {
      reactive.observe(VALUE_KEY);
      return raw;
    },

    set(v: T): void {
      if (Object.is(raw, v)) return;
      const prev = raw;
      raw = v;
      reactive.emit(VALUE_KEY, new ValuePatch(prev, v));
    },

    update(fn: (current: T) => T): void {
      const next = fn(raw);
      if (Object.is(raw, next)) return;
      const prev = raw;
      raw = next;
      reactive.emit(VALUE_KEY, new ValuePatch(prev, next));
    },
  };

  Reactive.bind(cell, reactive);
  return cell;
}
