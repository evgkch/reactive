import type { Patch } from "./core.js";
import { Watcher } from "./watch.js";
import type { WatcherLike } from "./core.js";

export abstract class Reactive<P> {
    protected abstract subscribe(watcher: WatcherLike): void;

    watch(fn: (patch: P) => void, immediate?: boolean): () => void {
        const w = new Watcher((p: Patch) => fn(p.data as P), immediate);
        this.subscribe(w);
        return () => w.stop();
    }
}
