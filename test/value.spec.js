import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Value, Batch } from '../dist/index.js'

const tick = () => Promise.resolve()

describe('Value', () => {
  it('get/set', () => {
    const v = Value(0)
    assert.strictEqual(v.get(), 0)
    v.set(42)
    assert.strictEqual(v.get(), 42)
  })

  it('update', () => {
    const v = Value(10)
    v.update(n => n + 1)
    assert.strictEqual(v.get(), 11)
  })

  it('same value does not trigger (Object.is)', async () => {
    const ref = { x: 1 }
    const v = Value(ref)
    let runs = 0
    Batch(() => { v.get(); runs++ })
    v.set(ref)
    await tick()
    assert.strictEqual(runs, 1)
  })
})
