import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Value, Struct, List, Batch, Watch } from '../dist/index.js'

const tick = () => Promise.resolve()

describe('Complex (Value + Struct + List)', () => {
  it('Struct with Value + List — filter and items', async () => {
    const state = Struct({
      filter: Value('all'),
      items: List([
        Struct({ text: 'a', done: false }),
        Struct({ text: 'b', done: true }),
        Struct({ text: 'c', done: false })
      ])
    })

    let filtered = []
    Batch(() => {
      const f = state.filter.get()
      filtered = state.items.filter((item) => {
        if (f === 'active') return !item.done
        if (f === 'completed') return item.done
        return true
      })
    })
    await tick()

    assert.strictEqual(filtered.length, 3)
    assert.strictEqual(filtered[0].text, 'a')
    assert.strictEqual(filtered[1].text, 'b')
    assert.strictEqual(filtered[2].text, 'c')

    state.filter.set('active')
    await tick()
    assert.strictEqual(filtered.length, 2)
    assert.strictEqual(filtered[0].text, 'a')
    assert.strictEqual(filtered[1].text, 'c')

    state.filter.set('completed')
    await tick()
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].text, 'b')

    state.items[0].done = true
    await tick()
    state.filter.set('active')
    await tick()
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].text, 'c')
  })

  it('List of Structs — computed total', async () => {
    const cart = List([
      Struct({ name: 'A', price: 10, qty: 2 }),
      Struct({ name: 'B', price: 5, qty: 1 })
    ])

    let total = 0
    Batch(() => {
      total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
    })
    await tick()

    assert.strictEqual(total, 25)

    cart[0].qty = 3
    await tick()
    assert.strictEqual(total, 35)

    cart.push(Struct({ name: 'C', price: 2, qty: 4 }))
    await tick()
    assert.strictEqual(total, 43)
  })

  it('Struct with List — push triggers Batch', async () => {
    const state = Struct({ items: List([1, 2]) })
    let len = 0
    Batch(() => { len = state.items.length })
    await tick()
    assert.strictEqual(len, 2)

    state.items.push(3)
    await tick()
    assert.strictEqual(len, 3)
  })

  it('Struct with Value — nested get/set triggers Batch', async () => {
    const state = Struct({ count: Value(0) })
    let doubled = 0
    Batch(() => { doubled = state.count.get() * 2 })
    await tick()
    assert.strictEqual(doubled, 0)

    state.count.set(5)
    await tick()
    assert.strictEqual(doubled, 10)
  })

  it('multiple batches on same complex state', async () => {
    const state = Struct({
      filter: Value('all'),
      items: List([Struct({ x: 1 }), Struct({ x: 2 })])
    })
    let sumA = 0
    let sumB = 0
    Batch(() => { sumA = state.items.reduce((s, i) => s + i.x, 0) })
    Batch(() => { sumB = state.filter.get().length + state.items.length })
    await tick()
    assert.strictEqual(sumA, 3)
    assert.strictEqual(sumB, 5) // 'all'.length=3 + items.length=2

    state.items[0].x = 10
    await tick()
    assert.strictEqual(sumA, 12)
    assert.strictEqual(sumB, 5) // filter/items.length unchanged

    state.filter.set('x')
    await tick()
    assert.strictEqual(sumB, 3) // 'x'.length=1 + items.length=2
  })

  it('Watch receives patches from Value + List', () => {
    const state = Struct({ count: Value(0), items: List([1]) })
    const collected = []
    Watch(state.count, (patch) => collected.push(patch))
    Watch(state.items, (patch) => collected.push(patch))
    state.count.set(10)
    const vPatch = collected.find((p) => 'prev' in p && 'next' in p && !('start' in p) && p.prev === 0 && p.next === 10)
    assert.ok(vPatch)
    state.items.push(2)
    const pushPatch = collected.find((p) => p.added?.length && !p.removed?.length)
    assert.ok(pushPatch)
    assert.deepStrictEqual(pushPatch.added, [2])
  })

  it('batch chain — derived Value triggers dependent Batch', async () => {
    const state = Struct({ count: Value(0) })
    const doubled = Value(0)
    Batch(() => doubled.set(state.count.get() * 2))
    let display = ''
    Batch(() => { display = `count: ${state.count.get()}, doubled: ${doubled.get()}` })
    await tick()
    assert.strictEqual(display, 'count: 0, doubled: 0')

    state.count.set(5)
    await tick()
    assert.strictEqual(display, 'count: 5, doubled: 10')
  })
})
