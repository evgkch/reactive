import { describe, it } from 'node:test'
import assert from 'node:assert'
import { List, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

describe('benchmark: List throughput', () => {
  it('push in loop with Batch', async () => {
    const N = 10_000
    const list = List()
    let len = 0
    Batch(() => { len = list.length })
    await tick()

    const start = performance.now()
    for (let i = 0; i < N; i++) {
      list.push(i)
      await tick()
    }
    const ms = performance.now() - start

    assert.strictEqual(len, N)
    console.log(`  ${N} push cycles: ${ms.toFixed(1)}ms`)
  })

  it('index assignment in loop', async () => {
    const N = 5_000
    const list = List(Array.from({ length: N }, (_, i) => i))
    let lastSum = 0
    Batch(() => { lastSum = list.reduce((a, b) => a + b, 0) })
    await tick()

    const start = performance.now()
    for (let i = 0; i < N; i++) {
      list[i] = i * 2
      await tick()
    }
    const ms = performance.now() - start

    assert.ok(typeof lastSum === 'number' && lastSum > 0)
    console.log(`  ${N} index assignments: ${ms.toFixed(1)}ms`)
  })
})
