import { Reactive, Watcher, Batch, Watch } from "../../src/index.js";

// A clock that ticks
class Clock extends Reactive<{ prev: number; next: number }> {
  static #KEY = Symbol("tick");
  #value = 0;

  // read — tracked by Batch
  get(): number {
    this.observe(Clock.#KEY);
    return this.#value;
  }

  // write — notifies subscribers
  tick(): void {
    const prev = this.#value;
    this.#value++;
    this.emit(Clock.#KEY, { prev, next: this.#value });
  }

  // watch — synchronous, with patch
  watch(fn: (data: { prev: number; next: number }) => void): () => void {
    const w = new Watcher(fn);
    this.observe(Clock.#KEY, w);
    return () => w.close();
  }
}

const clock = new Clock();

// Works with Batch
Batch(() => {
  clock.get();
});

// Works with Watch
Watch(clock, () => {});

clock.tick(); // → 0 → 1 (sync), tick: 1 (microtask)
clock.tick(); // → 1 → 2 (sync), tick: 2 (microtask)
