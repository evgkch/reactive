import { Value, Batch } from '../../dist/index.js'

const score = Value(0)
score.set(10)
score.update((n) => n * 2)
// Batch runs once now (tracks score.get()), will run again when score changes
Batch(() => score.get())
