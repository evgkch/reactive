import { core, type WatcherLike } from "./core.js";
import { Reactive } from "./reactive.js";

const VALUE_KEY = Symbol("value");

/** Patch data for Value changes */
export interface ValuePatch<T> {
  prev: T;
  next: T;
}

export class ValueImpl<T> extends Reactive<ValuePatch<T>> {
  #raw: T;

  constructor(initial: T) {
    super();
    this.#raw = initial;
  }

  get(): T {
    core.track(this, VALUE_KEY);
    return this.#raw;
  }

  set(v: T): void {
    if (Object.is(this.#raw, v)) return;
    const prev = this.#raw;
    this.#raw = v;
    core.trigger<ValuePatch<T>>(this, VALUE_KEY, { prev, next: v });
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.#raw));
  }

  protected subscribe(w: WatcherLike): void {
    core.track(this, VALUE_KEY, w);
  }
}

export function Value<T>(initial: T): ValueImpl<T> {
  return new ValueImpl(initial);
}
