import { core, type BatcherLike, type Subscriber } from "./core.js";
import { PREFIX, type ReactiveLogger } from "./log.js";

export class Batcher implements BatcherLike {
  static #nextId = 0;
  static #logger: ReactiveLogger | null = null;

  static setLogger(lg: ReactiveLogger | null): void {
    Batcher.#logger = lg;
  }

  #fn: () => void;
  #stopped = false;
  readonly id: number;
  immediate: boolean;
  deps = new Set<Set<Subscriber>>();

  constructor(fn: () => void, immediate?: boolean) {
    this.#fn = fn;
    this.id = ++Batcher.#nextId;
    this.immediate = immediate ?? core.getDefaultBatchImmediate();
    Batcher.#logger?.log(`${PREFIX} [batch#${this.id}:init]`, this);
    this.run();
  }

  run(): void {
    if (this.#stopped) return;
    Batcher.#logger?.log(`${PREFIX} [batch#${this.id}:run]`);

    core.setActive(this);
    try {
      this.#fn();
    } finally {
      core.setActive(null);
    }
  }

  stop(): void {
    if (this.#stopped) return;
    this.#stopped = true;
    Batcher.#logger?.log(`${PREFIX} [batch#${this.id}:stop]`);
    for (const dep of this.deps) dep.delete(this);
    this.deps.clear();
  }
}

export function Batch(fn: () => void, immediate?: boolean): () => void {
  const b = new Batcher(fn, immediate);
  return () => b.stop();
}
