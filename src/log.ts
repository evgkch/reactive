/** Log level: false = off, true = Batch/Watch/stop, 'verbose' = + track/trigger/configure */
export type LogLevel = false | true | "verbose";

let logLevel: LogLevel = false;

const objectIds = new WeakMap<object, number>();
let nextObjectId = 0;
let nextBatchId = 0;
let nextWatchId = 0;

const PREFIX = "[reactive]";

function idFor(obj: object, prefix: string): string {
    let n = objectIds.get(obj);
    if (n === undefined) {
        n = ++nextObjectId;
        objectIds.set(obj, n);
    }
    return `${prefix}${n}`;
}

/** Stable id for any object (target, Value, List, etc.) — use in console to find references. */
export function getObjectId(obj: object): string {
    return idFor(obj, "t");
}

export function getNextBatchId(): number {
    return ++nextBatchId;
}

export function getNextWatchId(): number {
    return ++nextWatchId;
}

export function setLogLevel(level: LogLevel): void {
    logLevel = level;
}

export function getLogLevel(): LogLevel {
    return logLevel;
}

function formatKey(key: string | symbol): string {
    return typeof key === "symbol" ? key.description ?? "sym" : String(key);
}

function formatPatch(data: unknown): string {
    if (data === null || data === undefined) return "";
    const d = data as Record<string, unknown>;
    if ("prev" in d && "next" in d && !("start" in d))
        return `${d.prev} → ${d.next}`;
    if ("key" in d && "prev" in d && "next" in d)
        return `key ${String(d.key)} ${d.prev} → ${d.next}`;
    if ("start" in d && "removed" in d && "added" in d) {
        const r = (d.removed as unknown[])?.length ?? 0;
        const a = (d.added as unknown[])?.length ?? 0;
        return `start=${d.start} removed=${r} added=${a}`;
    }
    return String(data);
}

export function logBatchRun(batchId: number, kind: "init" | "triggered"): void {
    if (logLevel === false) return;
    console.log(`${PREFIX} [Batch #${batchId}] run (${kind})`);
}

export function logBatchStop(batchId: number): void {
    if (logLevel === false) return;
    console.log(`${PREFIX} [Batch #${batchId}] stop`);
}

export function logWatch(
    watchId: number,
    target: object,
    key: string | symbol,
    data: unknown
): void {
    if (logLevel === false) return;
    const targetId = idFor(target, "t");
    const keyStr = formatKey(key);
    const summary = formatPatch(data);
    console.log(
        `${PREFIX} [Watch #${watchId}] ${targetId}#${keyStr} ${summary}`.trim()
    );
}

export function logWatchStop(watchId: number): void {
    if (logLevel === false) return;
    console.log(`${PREFIX} [Watch #${watchId}] stop`);
}

export function logTrack(
    target: object,
    key: string | symbol,
    kind: "Batch" | "Watch",
    id: number
): void {
    if (logLevel !== "verbose") return;
    const targetId = idFor(target, "t");
    console.log(
        `${PREFIX} [track] ${kind}#${id} ← ${targetId}#${formatKey(key)}`
    );
}

export function logTrigger(
    target: object,
    key: string | symbol,
    count: number
): void {
    if (logLevel !== "verbose") return;
    const targetId = idFor(target, "t");
    console.log(
        `${PREFIX} [trigger] ${targetId}#${formatKey(key)} → ${count} subscriber(s)`
    );
}

export function logConfigure(opts: Record<string, unknown>): void {
    if (logLevel !== "verbose") return;
    console.log(`${PREFIX} [configure]`, opts);
}
