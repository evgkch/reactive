import { Value, List, Watch } from '../../dist/index.js'

const count = Value(0)
const list = List([1, 2])
// Watch fires sync. Value patch: { prev, next }. List patch: { start, removed, added }
Watch(count, (patch) => {})
Watch(list, (patch) => {})
count.set(5)                    // → count watcher gets { prev: 0, next: 5 }
list.push(3)                    // → list watcher gets { start: 2, removed: [], added: [3] }
list.sort((a, b) => a - b)      // → { start: 0, removed: [...], added: [...] }
