import { Reactive } from "../core/reactive.js";
import { Watcher } from "../effects/watch.js";

const LIST_KEY = Symbol("list");

export class ListPatch<T> {
  constructor(
    readonly start: number,
    readonly removed: T[],
    readonly added: T[],
    readonly reorder?: boolean,
  ) {}
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

class ReactiveList<T> extends Reactive<ListPatch<T>> {
  watch(fn: (data: ListPatch<T>) => void): () => void {
    const w = new Watcher<ListPatch<T>>(fn);
    this.observe(LIST_KEY, w);
    return () => w.close();
  }
}

export function List<T>(initial: T[] = []): T[] {
  const arr = [...initial];
  const reactive = new ReactiveList<T>();

  const proxy = new Proxy(arr, {
    get(o, k) {
      if (k === "watch")
        return (fn: (patch: ListPatch<T>) => void) => reactive.watch(fn);
      if (k === "length" || isArrayIndex(k)) {
        reactive.observe(LIST_KEY);
        return (o as any)[k];
      }
      const val = (o as any)[k];
      if (typeof k === "string" && ITERATING.has(k)) {
        return (...args: unknown[]) => {
          reactive.observe(LIST_KEY);
          return (val as Function).apply(o, args);
        };
      }
      if (typeof val === "function") return (val as Function).bind(o);
      return val;
    },
    set(o, k, v) {
      if (Object.is((o as any)[k], v)) return true;
      const prev = (o as any)[k];
      (o as any)[k] = v;
      if (isArrayIndex(k)) {
        reactive.emit(
          LIST_KEY,
          new ListPatch(Number(k), prev !== undefined ? [prev] : [], [v]),
        );
      }
      return true;
    },
  });

  const p = proxy as any;

  p.push = (...items: T[]) => {
    const start = arr.length;
    for (const item of items) arr[arr.length] = item;
    reactive.emit(LIST_KEY, new ListPatch(start, [], items));
    return arr.length;
  };

  p.pop = () => {
    const val = Array.prototype.pop.call(arr);
    reactive.emit(LIST_KEY, new ListPatch(arr.length, [val], []));
    return val;
  };

  p.shift = () => {
    const val = Array.prototype.shift.call(arr);
    reactive.emit(LIST_KEY, new ListPatch(0, [val], []));
    return val;
  };

  p.unshift = (...items: T[]) => {
    Array.prototype.unshift.apply(arr, items);
    reactive.emit(LIST_KEY, new ListPatch(0, [], items));
    return arr.length;
  };

  p.splice = (start: number, deleteCount?: number, ...items: T[]) => {
    const removed =
      deleteCount !== undefined
        ? Array.prototype.splice.call(arr, start, deleteCount, ...items)
        : Array.prototype.splice.call(arr, start, arr.length - start);
    reactive.emit(LIST_KEY, new ListPatch(start, removed, items));
    return removed;
  };

  p.sort = (fn?: (a: T, b: T) => number) => {
    const before = [...arr];
    Array.prototype.sort.call(arr, fn);
    reactive.emit(LIST_KEY, new ListPatch(0, before, [...arr], true));
    return proxy;
  };

  p.reverse = () => {
    const before = [...arr];
    Array.prototype.reverse.call(arr);
    reactive.emit(LIST_KEY, new ListPatch(0, before, [...arr], true));
    return proxy;
  };

  p.fill = (value: T, start?: number, end?: number) => {
    const s = start ?? 0;
    const e = end ?? arr.length;
    const prev = arr.slice(s, e);
    Array.prototype.fill.call(arr, value, start, end);
    reactive.emit(LIST_KEY, new ListPatch(s, prev, arr.slice(s, e)));
    return proxy;
  };

  p.copyWithin = (target: number, start: number, end?: number) => {
    const len =
      end !== undefined
        ? Math.min(end, arr.length) - start
        : arr.length - start;
    const prev = arr.slice(target, target + len);
    Array.prototype.copyWithin.call(arr, target, start, end);
    reactive.emit(
      LIST_KEY,
      new ListPatch(target, prev, arr.slice(target, target + len)),
    );
    return proxy;
  };

  Reactive.bind(proxy, reactive);
  return proxy as unknown as T[];
}
