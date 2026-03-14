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
}

export interface WatcherLike {
    deps: Set<Set<Subscriber>>;
    immediate: boolean;
    call(patch: Patch): void;
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
}

function trigger<D>(target: object, key: string | symbol, data?: D): void {
    const dep = targetMap.get(target)?.get(key);
    if (!dep) return;
    const patch = data !== undefined ? ({ target, key, data: data as D } as Patch) : null;
    for (const s of dep) {
        if ("call" in s) {
            if (patch) {
                if (s.immediate) s.call(patch);
                else scheduleWatcher(s, patch);
            }
        } else {
            if (s.immediate) s.run();
            else scheduleBatcher(s);
        }
    }
}

export const core = {
    configure(opts?: { batch?: boolean; watch?: boolean }): void {
        if (opts?.batch !== undefined) defaultBatchImmediate = opts.batch;
        if (opts?.watch !== undefined) defaultWatchImmediate = opts.watch;
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
