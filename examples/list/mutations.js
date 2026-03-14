import { List, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const items = List([3, 1, 2])
let lastLength = 0
// Batch tracks items.length; runs when length or order changes
Batch(() => { lastLength = items.length })
items.push(4)
items.sort((a, b) => a - b)
await tick()                    // lastLength === 4, items sorted
