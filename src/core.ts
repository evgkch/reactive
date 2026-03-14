import * as log from "./log.js";

/** Container for change data. Each primitive defines its own `data` shape. */
export interface Patch<D = unknown> {
    target: object;
    key: string | symbol;
    data: D;
}

export interface BatcherLike {
    deps: Set<Set<Subscriber>>;
    immediate: boolean;
    run(): void;
    id?: number;
}

export interface WatcherLike {
    deps: Set<Set<Subscriber>>;
    immediate: boolean;
    call(patch: Patch): void;
    id?: number;
}

export type Subscriber = BatcherLike | WatcherLike;
type Dep = Set<Subscriber>;
type DepsMap = Map<string | symbol, Dep>;

const targetMap = new WeakMap<object, DepsMap>();
let active: Subscriber | null = null;
const queue = new Set<BatcherLike>();
const watcherPatches = new Map<WatcherLike, Patch[]>();
let scheduled = false;

let defaultBatchImmediate = false;
let defaultWatchImmediate = true;

function flush(): void {
    for (const b of queue) {
        queue.delete(b);
        b.run();
    }
    for (const [w, patches] of watcherPatches) {
        watcherPatches.delete(w);
        for (const p of patches) w.call(p);
    }
    scheduled = false;
}

function scheduleBatcher(b: BatcherLike): void {
    queue.add(b);
    if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
    }
}

function scheduleWatcher(w: WatcherLike, patch: Patch): void {
    let arr = watcherPatches.get(w);
    if (!arr) {
        arr = [];
        watcherPatches.set(w, arr);
    }
    arr.push(patch);
    if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
    }
}

function setActive(s: Subscriber | null): void {
    active = s;
}

function track(
    target: object,
    key: string | symbol,
    subscriber?: Subscriber
): void {
    const sub = subscriber ?? active;
    if (!sub) return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    if (dep.has(sub)) return;
    dep.add(sub);
    sub.deps.add(dep);
    if (
        log.getLogLevel() === "verbose" &&
        sub.id !== undefined
    ) {
        log.logTrack(
            target,
            key,
            "call" in sub ? "Watch" : "Batch",
            sub.id
        );
    }
}

function trigger<D>(target: object, key: string | symbol, data?: D): void {
    const dep = targetMap.get(target)?.get(key);
    if (!dep) return;
    if (log.getLogLevel() === "verbose") {
        log.logTrigger(target, key, dep.size);
    }
    const patch: Patch = { target, key, data };
    for (const s of dep) {
        if ("call" in s) {
            if (s.immediate) s.call(patch);
            else scheduleWatcher(s, patch);
        } else {
            if (s.immediate) s.run();
            else scheduleBatcher(s);
        }
    }
}

export const core = {
    configure(opts?: {
        batch?: boolean | "sync" | "async";
        watch?: boolean | "sync" | "async";
        log?: log.LogLevel;
    }): void {
        if (opts?.log !== undefined) {
            log.setLogLevel(opts.log);
            if (log.getLogLevel() === "verbose") {
                log.logConfigure(
                    Object.fromEntries(
                        Object.entries(opts).filter(
                            ([k]) => k === "batch" || k === "watch" || k === "log"
                        )
                    )
                );
            }
        }
        if (opts?.batch !== undefined) {
            if (opts.batch === "sync") defaultBatchImmediate = true;
            else if (opts.batch === "async") defaultBatchImmediate = false;
            else defaultBatchImmediate = opts.batch;
        }
        if (opts?.watch !== undefined) {
            if (opts.watch === "sync") defaultWatchImmediate = true;
            else if (opts.watch === "async") defaultWatchImmediate = false;
            else defaultWatchImmediate = opts.watch;
        }
    },
    getDefaultBatchImmediate(): boolean {
        return defaultBatchImmediate;
    },
    getDefaultWatchImmediate(): boolean {
        return defaultWatchImmediate;
    },
    setActive,
    track,
    trigger,
} as const;
