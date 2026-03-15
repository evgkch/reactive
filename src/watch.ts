import { core, type Patch, type Subscriber, type WatcherLike } from "./core.js";
import { PREFIX, type ReactiveLogger } from "./log.js";

export class Watcher implements WatcherLike {
  static #nextId = 0;
  static #logger: ReactiveLogger | null = null;

  static setLogger(lg: ReactiveLogger | null): void {
    Watcher.#logger = lg;
  }

  #fn: (patch: Patch) => void;
  #stopped = false;
  readonly id: number;
  immediate: boolean;
  deps = new Set<Set<Subscriber>>();

  constructor(fn: (patch: Patch) => void, immediate?: boolean) {
    this.#fn = fn;
    this.id = ++Watcher.#nextId;
    this.immediate = immediate ?? core.getDefaultWatchImmediate();
    Watcher.#logger?.log(`${PREFIX} [watch#${this.id}:init]`, this);
  }

  call(patch: Patch): void {
    if (this.#stopped) return;
    Watcher.#logger?.log(`${PREFIX} [watch#${this.id}:call]`, patch);
    this.#fn(patch);
  }

  stop(): void {
    if (this.#stopped) return;
    this.#stopped = true;
    Watcher.#logger?.log(`${PREFIX} [watch#${this.id}:stop]`);
    for (const dep of this.deps) dep.delete(this);
    this.deps.clear();
  }
}

export function Watch<P>(
  source: {
    watch: (fn: (patch: P) => void, immediate?: boolean) => () => void;
  },
  fn: (patch: P) => void,
  immediate?: boolean,
): () => void {
  return source.watch(fn, immediate);
}
