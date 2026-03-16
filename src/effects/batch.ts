import { Context } from "@evgkch/context";
import { Subscriber } from "../core/subscriber.js";
import type { ReactiveLogger } from "../log.js";

export class Batcher extends Subscriber {
  static #queue = new Map<Batcher, () => void>();
  static #scheduled = false;

  static #flush(): void {
    Batcher.#scheduled = false;
    for (const fn of Batcher.#queue.values()) fn();
    Batcher.#queue.clear();
  }

  static #schedule(self: Batcher, fn: () => void): void {
    Batcher.#queue.set(self, fn);
    if (!Batcher.#scheduled) {
      Batcher.#scheduled = true;
      queueMicrotask(Batcher.#flush);
    }
  }

  #fn: () => void;

  constructor(fn: () => void) {
    super(Context.current());
    this.#fn =
      Context.current() instanceof Subscriber
        ? () => {
            fn();
            this.close();
          }
        : fn;
    this.execute();
  }

  receive(): void {
    if (this.closed) return;
    Batcher.#schedule(this, () => this.execute());
  }

  execute(): void {
    if (this.closed) return;
    this.run(() => this.#fn());
  }

  close(): void {
    if (this.closed) return;
    super.close();
  }
}

export function Batch(fn: () => void): () => void {
  const wrapped = Batch.logger
    ? () => {
        Batch.logger?.log("[batch:run]");
        fn();
      }
    : fn;
  const b = new Batcher(wrapped);
  Batch.logger?.log("[batch:init]", { batcher: b });
  return () => {
    Batch.logger?.log("[batch:close]", { batcher: b });
    b.close();
  };
}

export namespace Batch {
  export let logger: ReactiveLogger | undefined;
}

