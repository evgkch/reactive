import { Reactive, core, Batch, Watch } from '../../dist/index.js'

const tick = () => Promise.resolve()
const TOGGLE_KEY = Symbol('toggle')

// Custom primitive: subscribe() registers deps with core.track; on change call core.trigger
class Toggle extends Reactive {
  #value = false
  get() {
    core.track(this, TOGGLE_KEY)
    return this.#value
  }
  set(v) {
    if (this.#value === v) return
    const prev = this.#value
    this.#value = v
    core.trigger(this, TOGGLE_KEY, { prev, next: v })
  }
  subscribe(w) {
    core.track(this, TOGGLE_KEY, w)
  }
}

const toggle = new Toggle()
Batch(() => toggle.get())
Watch(toggle, () => {})
toggle.set(true)
await tick()
toggle.set(false)
