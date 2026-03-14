import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Value, Batch } from '../dist/index.js'

const tick = () => Promise.resolve()

describe('batching', () => {
  it('Batch runs after microtask', async () => {
    const v = Value(0)
    let calls = 0
    Batch(() => { v.get(); calls++ })
    v.set(1)
    v.set(2)
    assert.strictEqual(calls, 1)
    await tick()
    assert.strictEqual(calls, 2)
  })
})
