import { core, type WatcherLike } from "./core.js";
import { Reactive } from "./reactive.js";

const LENGTH_KEY = Symbol("length");
const REORDER_KEY = Symbol("reorder");

/** Unified patch for all List operations */
export interface ListPatch<T> {
  start: number;
  removed: T[];
  added: T[];
}

const ITERATING = new Set([
  "map",
  "filter",
  "forEach",
  "find",
  "findIndex",
  "some",
  "every",
  "reduce",
  "reduceRight",
  "includes",
  "indexOf",
]);

function isArrayIndex(k: string | symbol): k is string {
  if (typeof k !== "string" || k === "") return false;
  const n = Number(k);
  return (n | 0) === n && n >= 0 && String(n) === k;
}

export class ListImpl<T> extends Reactive<ListPatch<T>> {
  #arr: T[];

  constructor(initial: T[] = []) {
    super();
    this.#arr = [...initial];
    const arr = this.#arr;
    const cache = new Map<string | symbol, Function>();
    const self = this;

    const proxy = new Proxy(arr, {
      get(o, k, receiver) {
        if (k === "watch") {
          return (fn: (patch: ListPatch<T>) => void, immediate?: boolean) =>
            self.watch(fn, immediate);
        }
        if (k === "length") {
          core.track(o, LENGTH_KEY);
          return o.length;
        }
        if (isArrayIndex(k)) {
          core.track(o, k);
          core.track(o, REORDER_KEY);
          return (o as any)[k];
        }
        const val = (o as any)[k];
        if (typeof k === "string" && ITERATING.has(k)) {
          const cached = cache.get(k);
          if (cached) return cached;
          const fn = (...args: unknown[]) => {
            core.track(o, LENGTH_KEY);
            core.track(o, REORDER_KEY);
            return (val as Function).apply(o, args);
          };
          cache.set(k, fn);
          return fn;
        }
        if (typeof val === "function") {
          const cached = cache.get(k);
          if (cached) return cached;
          const fn = (val as Function).bind(o);
          cache.set(k, fn);
          return fn;
        }
        return val;
      },
      set(o, k, v) {
        if (Object.is((o as any)[k], v)) return true;
        const prevLen = o.length;
        const prev = (o as any)[k];
        (o as any)[k] = v;
        if (isArrayIndex(k)) {
          const i = Number(k);
          const patch: ListPatch<T> = {
            start: i,
            removed: prev !== undefined ? [prev] : [],
            added: [v],
          };
          core.trigger(o, k, patch);
          if (i >= prevLen) core.trigger(arr, LENGTH_KEY, patch);
        }
        return true;
      },
    });

    const p = proxy as any;

    p.push = (...items: T[]) => {
      const start = arr.length;
      for (const item of items) arr[arr.length] = item;
      const patch: ListPatch<T> = { start, removed: [], added: items };
      core.trigger(arr, LENGTH_KEY, patch);
      return arr.length;
    };

    p.pop = () => {
      const val = Array.prototype.pop.call(arr);
      const patch: ListPatch<T> = {
        start: arr.length,
        removed: [val],
        added: [],
      };
      core.trigger(arr, LENGTH_KEY, patch);
      return val;
    };

    p.shift = () => {
      const val = Array.prototype.shift.call(arr);
      const patch: ListPatch<T> = { start: 0, removed: [val], added: [] };
      core.trigger(arr, LENGTH_KEY, patch);
      core.trigger(arr, REORDER_KEY, patch);
      return val;
    };

    p.unshift = (...items: T[]) => {
      Array.prototype.unshift.apply(arr, items);
      const patch: ListPatch<T> = { start: 0, removed: [], added: items };
      core.trigger(arr, LENGTH_KEY, patch);
      core.trigger(arr, REORDER_KEY, patch);
      return arr.length;
    };

    p.splice = (start: number, deleteCount?: number, ...items: T[]) => {
      const removed =
        deleteCount !== undefined
          ? Array.prototype.splice.call(arr, start, deleteCount, ...items)
          : Array.prototype.splice.call(arr, start, arr.length - start);
      const patch: ListPatch<T> = { start, removed, added: items };
      core.trigger(arr, LENGTH_KEY, patch);
      core.trigger(arr, REORDER_KEY, patch);
      return removed;
    };

    p.sort = (fn?: (a: T, b: T) => number) => {
      const before = [...arr];
      Array.prototype.sort.call(arr, fn);
      const patch: ListPatch<T> = {
        start: 0,
        removed: before,
        added: [...arr],
      };
      core.trigger(arr, REORDER_KEY, patch);
      return proxy;
    };

    p.reverse = () => {
      const before = [...arr];
      Array.prototype.reverse.call(arr);
      const patch: ListPatch<T> = {
        start: 0,
        removed: before,
        added: [...arr],
      };
      core.trigger(arr, REORDER_KEY, patch);
      return proxy;
    };

    p.fill = (value: T, start?: number, end?: number) => {
      const s = start ?? 0;
      const e = end ?? arr.length;
      const prev = arr.slice(s, e);
      Array.prototype.fill.call(arr, value, start, end);
      const filled = arr.slice(s, e);
      const patch: ListPatch<T> = { start: s, removed: prev, added: filled };
      core.trigger(arr, REORDER_KEY, patch);
      return proxy;
    };

    p.copyWithin = (target: number, start: number, end?: number) => {
      const len =
        end !== undefined
          ? Math.min(end, arr.length) - start
          : arr.length - start;
      const prev = arr.slice(target, target + len);
      Array.prototype.copyWithin.call(arr, target, start, end);
      const copied = arr.slice(target, target + len);
      const patch: ListPatch<T> = {
        start: target,
        removed: prev,
        added: copied,
      };
      core.trigger(arr, REORDER_KEY, patch);
      return proxy;
    };

    return proxy as unknown as ListImpl<T>;
  }

  protected subscribe(w: WatcherLike): void {
    core.track(this.#arr, LENGTH_KEY, w);
    core.track(this.#arr, REORDER_KEY, w);
  }
}

export function List<T>(initial?: T[]): ListImpl<T> {
  return new ListImpl(initial ?? []);
}
