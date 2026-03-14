import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Value, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

describe('benchmark: Value throughput', () => {
  it('get/set in tight loop', async () => {
    const N = 100_000
    const v = Value(0)
    let sum = 0
    Batch(() => { sum += v.get() })
    await tick()

    const start = performance.now()
    for (let i = 0; i < N; i++) {
      v.set(i)
      await tick()
    }
    const ms = performance.now() - start

    assert.strictEqual(sum, (N * (N - 1)) / 2)
    console.log(`  ${N} get+set cycles: ${ms.toFixed(1)}ms (${(N / (ms / 1000)).toFixed(0)} ops/s)`)
  })

  it('multiple Values, single Batch', async () => {
    const N = 20_000
    const COUNT = 20
    const sources = Array.from({ length: COUNT }, () => Value(0))
    let runs = 0
    Batch(() => {
      sources.forEach(s => s.get())
      runs++
    })
    await tick()

    const start = performance.now()
    for (let i = 0; i < N; i++) {
      sources[i % COUNT].set(i)
      await tick()
    }
    const ms = performance.now() - start

    assert.ok(runs >= N)
    console.log(`  ${N} triggers × ${COUNT} deps: ${ms.toFixed(1)}ms`)
  })
})
