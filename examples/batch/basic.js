import { Value, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const x = Value(0)
const stop = Batch(() => x.get())
x.set(1)
await tick()                    // Batch ran
stop()                          // unsubscribe
x.set(2)
await tick()                    // Batch no longer runs
