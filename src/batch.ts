import { core, type BatcherLike, type Subscriber } from "./core.js";

export class Batcher implements BatcherLike {
    #fn: () => void;
    #stopped = false;
    immediate: boolean;
    deps = new Set<Set<Subscriber>>();

    constructor(fn: () => void, immediate?: boolean) {
        this.#fn = fn;
        this.immediate = immediate ?? core.getDefaultBatchImmediate();
        this.run();
    }

    run(): void {
        if (this.#stopped) return;
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
        for (const dep of this.deps) dep.delete(this);
        this.deps.clear();
    }
}

export function Batch(fn: () => void, immediate?: boolean): () => void {
    const b = new Batcher(fn, immediate);
    return () => b.stop();
}
