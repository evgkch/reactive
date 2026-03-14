import { List, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const tasks = List(['buy milk', 'write code'])
let rendered = []
// Batch runs when tasks (length or items) change
Batch(() => { rendered = tasks.map((t) => t.toUpperCase()) })
tasks.push('ship it')
await tick()                    // Batch ran, rendered updated
tasks.splice(1, 1)
await tick()                    // Batch ran again
