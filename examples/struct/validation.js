import { Struct, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const form = Struct({ name: '', age: 0 })
let errors = []
// Batch recomputes errors when form.name or form.age change
Batch(() => {
  const { name, age } = form
  errors = []
  if (!name.trim()) errors.push('name required')
  if (age < 0 || age > 150) errors.push('invalid age')
})
form.name = 'Alice'
form.age = 25
await tick()                    // errors = []
form.age = 200
await tick()                    // errors = ['invalid age']
