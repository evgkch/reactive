import { core, type WatcherLike } from "./core.js";
import { Reactive } from "./reactive.js";

const SKIP_KEYS = new Set<string | symbol>(["__proto__", "constructor", "prototype"]);

/** Patch data for Struct property changes */
export interface StructPatch<K = string | symbol, V = unknown> {
    key: K;
    prev: V;
    next: V;
}

export class StructImpl<T extends object> extends Reactive<StructPatch> {
    #target: T;

    constructor(data: T) {
        super();
        this.#target = data;
        return new Proxy(data, {
            get: (o, k, receiver) => {
                if (k === "watch") {
                    return (fn: (patch: StructPatch) => void, immediate?: boolean) =>
                        (this as StructImpl<T>).watch(fn, immediate);
                }
                if (!SKIP_KEYS.has(k)) core.track(o, k);
                return (o as any)[k];
            },
            set: (o, k, v) => {
                if (SKIP_KEYS.has(k)) return true;
                if (Object.is((o as any)[k], v)) return true;
                const prev = (o as any)[k];
                (o as any)[k] = v;
                core.trigger<StructPatch>(o, k, { key: k, prev, next: v });
                return true;
            },
        }) as unknown as StructImpl<T>;
    }

    protected subscribe(w: WatcherLike): void {
        for (const key of Object.keys(this.#target)) {
            if (!SKIP_KEYS.has(key)) core.track(this.#target, key, w);
        }
    }
}

export function Struct<T extends object>(data: T): StructImpl<T> {
    return new StructImpl(data);
}
