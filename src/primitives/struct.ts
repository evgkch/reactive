import { Reactive } from "../core/reactive.js";
import { Watcher } from "../effects/watch.js";

const SKIP_KEYS = new Set<string | symbol>([
  "__proto__",
  "constructor",
  "prototype",
]);

export class StructPatch<K = string | symbol, V = unknown> {
  constructor(
    readonly key: K,
    readonly prev: V,
    readonly next: V,
  ) {}
}

class ReactiveStruct<T extends object> extends Reactive<StructPatch> {
  #keys: string[];

  constructor(data: T) {
    super();
    this.#keys = Object.keys(data).filter((k) => !SKIP_KEYS.has(k));
  }

  watch(fn: (data: StructPatch) => void): () => void {
    const w = new Watcher<StructPatch>(fn);
    for (const key of this.#keys) {
      this.observe(key, w);
    }
    return () => w.close();
  }
}

export function Struct<T extends object>(data: T): T {
  const reactive = new ReactiveStruct(data);

  const proxy = new Proxy(data, {
    get(o, k) {
      if (!SKIP_KEYS.has(k)) reactive.observe(k);
      return (o as any)[k];
    },
    set(o, k, v) {
      if (SKIP_KEYS.has(k)) return true;
      if (Object.is((o as any)[k], v)) return true;
      const prev = (o as any)[k];
      (o as any)[k] = v;
      reactive.emit(k, new StructPatch(k, prev, v));
      return true;
    },
  });

  Reactive.bind(proxy, reactive);
  return proxy as unknown as T;
}
