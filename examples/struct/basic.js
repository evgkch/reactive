import { Struct, Batch } from '../../dist/index.js'

const user = Struct({ name: 'alice', age: 25 })
// Batch tracks only what it reads — here only user.name
Batch(() => user.name)
user.name = 'bob'               // → Batch runs
user.age = 30                   // → Batch does not run (age was not read)
