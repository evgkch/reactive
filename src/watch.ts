import { core, type Patch, type Subscriber, type WatcherLike } from "./core.js";

export class Watcher implements WatcherLike {
    #fn: (patch: Patch) => void;
    #stopped = false;
    immediate: boolean;
    deps = new Set<Set<Subscriber>>();

    constructor(fn: (patch: Patch) => void, immediate?: boolean) {
        this.#fn = fn;
        this.immediate = immediate ?? core.getDefaultWatchImmediate();
    }

    call(patch: Patch): void {
        if (this.#stopped) return;
        this.#fn(patch);
    }

    stop(): void {
        if (this.#stopped) return;
        this.#stopped = true;
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
