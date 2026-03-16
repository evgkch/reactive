import { Context } from "@evgkch/context";
import type { Reactive } from "./reactive.js";

export abstract class Subscriber extends Context {
  sources = new Set<Reactive>();

  abstract receive(data: unknown): void;

  close(): void {
    for (const source of this.sources) source.detach(this);
    this.sources.clear();
    super.close();
  }
}

