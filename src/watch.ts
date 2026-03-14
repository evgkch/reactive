import { core, type Patch, type Subscriber, type WatcherLike } from "./core.js";
import * as log from "./log.js";

export class Watcher implements WatcherLike {
    #fn: (patch: Patch) => void;
    #stopped = false;
    readonly id: number;
    immediate: boolean;
    deps = new Set<Set<Subscriber>>();

    constructor(fn: (patch: Patch) => void, immediate?: boolean) {
        this.#fn = fn;
        this.id = log.getNextWatchId();
        this.immediate = immediate ?? core.getDefaultWatchImmediate();
    }

    call(patch: Patch): void {
        if (this.#stopped) return;
        if (log.getLogLevel()) {
            log.logWatch(
                this.id,
                patch.target,
                patch.key,
                patch.data
            );
        }
        this.#fn(patch);
    }

    stop(): void {
        if (this.#stopped) return;
        this.#stopped = true;
        if (log.getLogLevel()) log.logWatchStop(this.id);
        for (const dep of this.deps) dep.delete(this);
        this.deps.clear();
    }
}

export function Watch<P>(
    source: { watch: (fn: (patch: P) => void, immediate?: boolean) => () => void },
    fn: (patch: P) => void,
    immediate?: boolean
): () => void {
    return source.watch(fn, immediate);
}
