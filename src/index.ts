import { core } from "./core.js";
import { Batcher } from "./batch.js";
import { Watcher } from "./watch.js";
import { ValuePatch } from "./value.js";
import { StructPatch } from "./struct.js";
import { ListPatch } from "./list.js";

export { Value, ValueImpl } from "./value.js";
export { Struct, StructImpl } from "./struct.js";
export { List, ListImpl } from "./list.js";
export { Batch, Batcher } from "./batch.js";
export { Watch, Watcher } from "./watch.js";
export { Reactive } from "./reactive.js";

export { core };

/** Log config: `{ logger, batch?, watch? }` or `null` to detach. `batch`/`watch` — attach logger to Batcher/Watcher (default true). */
export type LogConfig = {
  logger: import("./log.js").ReactiveLogger;
  batch?: boolean;
  watch?: boolean;
} | null;

export function configure(opts?: {
  batch?: boolean | "sync" | "async";
  watch?: boolean | "sync" | "async";
  log?: LogConfig;
}): void {
  if (opts?.log !== undefined) {
    if (opts.log === null) {
      Batcher.setLogger(null);
      Watcher.setLogger(null);
    } else {
      const { logger, batch = true, watch = true } = opts.log;
      Batcher.setLogger(batch ? logger : null);
      Watcher.setLogger(watch ? logger : null);
    }
  }
  core.configure(opts);
}

export type { Patch, WatcherLike } from "./core.js";
export type { ReactiveLogger } from "./log.js";
export type { ValuePatch } from "./value.js";
export type { StructPatch } from "./struct.js";
export type { ListPatch } from "./list.js";

/** Union of all patch data types for Watch(patch => ...) */
export type PatchData =
  | ValuePatch<unknown>
  | StructPatch<unknown>
  | ListPatch<unknown>;
