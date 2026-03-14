export { Value, ValueImpl } from "./value.js";
export { Struct, StructImpl } from "./struct.js";
export { List, ListImpl } from "./list.js";
export { Batch } from "./batch.js";
export { Watch } from "./watch.js";
export { Reactive } from "./reactive.js";
import { core } from "./core.js";
export { core };
export const configure = core.configure;
export type { Patch, WatcherLike } from "./core.js";
export { getObjectId } from "./log.js";
export type { LogLevel } from "./log.js";
export type { ValuePatch } from "./value.js";
export type { StructPatch } from "./struct.js";
export type { ListPatch } from "./list.js";

/** Union of all patch data types for Watch(patch => ...) */
export type PatchData =
    | import("./value.js").ValuePatch<unknown>
    | import("./struct.js").StructPatch
    | import("./list.js").ListPatch<unknown>;
