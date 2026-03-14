import { Struct, List, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

const cart = List([
  Struct({ name: 'Apple', price: 1.5, qty: 2 }),
  Struct({ name: 'Bread', price: 2, qty: 1 }),
])
let total = 0
let summary = []
// total and summary recompute when cart or any item field changes
Batch(() => {
  total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  summary = cart.map((i) => `${i.name} x${i.qty} = $${(i.price * i.qty).toFixed(2)}`)
})
cart[0].qty = 3
await tick()                    // total and summary updated
cart.push(Struct({ name: 'Milk', price: 3, qty: 1 }))
await tick()                    // total and summary include new item
