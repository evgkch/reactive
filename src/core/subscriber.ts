import { Context } from "@evgkch/context";
import type { Reactive } from "./reactive.js";

export abstract class Subscriber extends Context {
  #sources = new Set<Reactive>();
  #children = new Set<Subscriber>();

  constructor(parent: Context | null | undefined = Context.current()) {
    super(parent ?? undefined);
    if (parent instanceof Subscriber) parent.#children.add(this);
  }

  abstract receive(data: unknown): void;

  attach(source: Reactive): void {
    this.#sources.add(source);
  }

  protected teardown(): void {
    for (const child of this.#children) child.close();
    this.#children.clear();
  }

  close(): void {
    this.teardown();
    for (const source of this.#sources) source.detach(this);
    this.#sources.clear();
    super.close();
  }
}

