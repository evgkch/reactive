import { Value, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const count = Value(0)
const doubled = Value(0)
// doubled always = count * 2; Batch runs when count changes
Batch(() => doubled.set(count.get() * 2))
count.set(5)
await tick()                    // Batch ran, doubled is now 10
