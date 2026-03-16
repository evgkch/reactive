import { Context } from "@evgkch/context";
import { Subscriber } from "./subscriber.js";

export abstract class Reactive<D = unknown> extends Context {
  static #registry = new WeakMap<object, Reactive<any>>();

  static bind<D>(data: object, reactive: Reactive<D>): void {
    Reactive.#registry.set(data, reactive);
  }

  static for<D>(data: object): Reactive<D> | undefined {
    return Reactive.#registry.get(data) as Reactive<D> | undefined;
  }

  #deps = new Map<string | symbol, Set<Subscriber>>();

  abstract watch(fn: (data: D) => void): () => void;

  observe(key: string | symbol, sub?: Subscriber): void {
    const s = sub ?? Context.current();
    if (!(s instanceof Subscriber)) return;
    let dep = this.#deps.get(key);
    if (!dep) {
      dep = new Set();
      this.#deps.set(key, dep);
    }
    dep.add(s);
    s.attach(this);
  }

  emit(key: string | symbol, data: D): void {
    const dep = this.#deps.get(key);
    if (!dep) return;
    for (const sub of dep) sub.receive(data);
  }

  detach(sub: Subscriber): void {
    for (const dep of this.#deps.values()) dep.delete(sub);
  }

  close(): void {
    this.#deps.clear();
    super.close();
  }
}
