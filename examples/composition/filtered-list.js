import { Value, Struct, List, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

// Struct with Value (filter) + List of Structs (items)
const state = Struct({
  filter: Value('all'),
  items: List([
    Struct({ text: 'Learn reactive', done: false }),
    Struct({ text: 'Build app', done: true }),
    Struct({ text: 'Ship it', done: false }),
  ]),
})
let filtered = []
// filtered recomputes when state.filter or state.items change
Batch(() => {
  const f = state.filter.get()
  filtered = state.items.filter((item) => {
    if (f === 'active') return !item.done
    if (f === 'completed') return item.done
    return true
  })
})
state.filter.set('active')
await tick()                    // filtered = not-done items
state.items[0].done = true
await tick()                    // filtered updates
state.filter.set('completed')
await tick()                    // filtered = done items
