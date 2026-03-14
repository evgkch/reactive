import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Struct, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

describe('benchmark: Struct throughput', () => {
  it('property mutation in loop', async () => {
    const N = 20_000
    const s = Struct({ a: 0, b: 0 })
    let sum = 0
    Batch(() => { sum = s.a + s.b })
    await tick()

    const start = performance.now()
    for (let i = 0; i < N; i++) {
      s.a = i
      s.b = i + 1
      await tick()
    }
    const ms = performance.now() - start

    assert.strictEqual(sum, (N - 1) + N)
    console.log(`  ${N} property mutations: ${ms.toFixed(1)}ms`)
  })
})
