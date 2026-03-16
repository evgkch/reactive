import { Context } from "@evgkch/context";
import { Reactive } from "../core/reactive.js";
import { Subscriber } from "../core/subscriber.js";
import type { ReactiveLogger } from "../log.js";

export class Watcher<D> extends Subscriber {
  #fn: (data: D) => void;

  constructor(fn: (data: D) => void) {
    super(Context.current());
    this.#fn = fn;
  }

  receive(data: unknown): void {
    if (this.closed) return;
    this.#fn(data as D);
  }
}

export function Watch<D>(source: object, fn: (data: D) => void): () => void {
  const reactive =
    source instanceof Reactive
      ? (source as Reactive<D>)
      : Reactive.for<D>(source);

  if (!reactive) throw new Error("Watch: source is not a reactive primitive");

  const wrapped = Watch.logger
    ? (data: D) => {
        Watch.logger?.log("[watch:call]", { data });
        fn(data);
      }
    : fn;

  const w = new Watcher(wrapped);
  Watch.logger?.log("[watch:init]", { watcher: w });

  const stop = reactive.watch((data) => w.receive(data));

  return () => {
    Watch.logger?.log("[watch:close]", { watcher: w });
    w.close();
    stop();
  };
}

export namespace Watch {
  export let logger: ReactiveLogger | undefined;
}
