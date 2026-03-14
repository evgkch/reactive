import { Value, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const a = Value(1)
const b = Value(2)
let runs = 0
Batch(() => { a.get(); b.get(); runs++ })
// Two changes in same tick → one microtask → Batch runs once (not twice)
a.set(10)
b.set(20)
await tick()                    // runs === 2 (initial + one rerun)
