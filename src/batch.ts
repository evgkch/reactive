import { core, type BatcherLike, type Subscriber } from "./core.js";
import * as log from "./log.js";

export class Batcher implements BatcherLike {
    #fn: () => void;
    #stopped = false;
    #runCount = 0;
    readonly id: number;
    immediate: boolean;
    deps = new Set<Set<Subscriber>>();

    constructor(fn: () => void, immediate?: boolean) {
        this.#fn = fn;
        this.id = log.getNextBatchId();
        this.immediate = immediate ?? core.getDefaultBatchImmediate();
        this.run();
    }

    run(): void {
        if (this.#stopped) return;
        this.#runCount++;
        if (log.getLogLevel()) {
            log.logBatchRun(
                this.id,
                this.#runCount === 1 ? "init" : "triggered"
            );
        }
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
        if (log.getLogLevel()) log.logBatchStop(this.id);
        for (const dep of this.deps) dep.delete(this);
        this.deps.clear();
    }
}

export function Batch(fn: () => void, immediate?: boolean): () => void {
    const b = new Batcher(fn, immediate);
    return () => b.stop();
}
