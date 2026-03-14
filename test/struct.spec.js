import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Struct, Batch, Watch } from '../dist/index.js'

const tick = () => Promise.resolve()

describe('Struct', () => {
  it('get/set', () => {
    const s = Struct({ a: 1, b: 2 })
    assert.strictEqual(s.a, 1)
    s.a = 3
    assert.strictEqual(s.a, 3)
  })

  it('Batch runs on change', async () => {
    const s = Struct({ name: 'alice' })
    let last = ''
    Batch(() => { last = s.name })
    await tick()
    assert.strictEqual(last, 'alice')
    s.name = 'bob'
    await tick()
    assert.strictEqual(last, 'bob')
  })

  it('skips __proto__ and constructor', () => {
    const s = Struct({ x: 1 })
    assert.strictEqual(s.constructor, Object)
    assert.ok(Object.getPrototypeOf(s))
  })

  it('multiple properties tracked independently', async () => {
    const s = Struct({ a: 1, b: 2 })
    let aVal = 0, bVal = 0
    Batch(() => { aVal = s.a })
    Batch(() => { bVal = s.b })
    await tick()
    s.a = 10
    await tick()
    assert.strictEqual(aVal, 10)
    assert.strictEqual(bVal, 2)
    s.b = 20
    await tick()
    assert.strictEqual(bVal, 20)
  })

  it('Watch receives Struct patches', () => {
    const s = Struct({ name: 'alice', age: 25 })
    const collected = []
    Watch(s, (patch) => collected.push(patch))
    s.name = 'bob'
    const namePatch = collected.find((p) => p?.key === 'name')
    assert.ok(namePatch)
    assert.strictEqual(namePatch.prev, 'alice')
    assert.strictEqual(namePatch.next, 'bob')
  })
})
