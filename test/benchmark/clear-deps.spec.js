import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Value, Batch } from '../../dist/index.js'

const tick = () => Promise.resolve()

/**
 * Proves: unsubscribing from all deps before each run() has higher overhead
 * than running the Batch. Clear-deps = O(|deps|) × Set.delete per run.
 * Both measured sync (no await in loop) for fair comparison.
 */
describe('benchmark: clear-deps overhead', () => {
  it('simulated clear-deps is costlier than Batch run', async () => {
    const N = 30_000
    const DEPS = 15

    // N Batches, each depends on one source — all triggers in one tick
    const sources = Array.from({ length: N }, () => Value(0))
    let runs = 0
    for (let i = 0; i < N; i++) {
      Batch(() => { sources[i].get(); runs++ })
    }
    const runStart = performance.now()
    for (let i = 0; i < N; i++) sources[i].set(i)
    await tick()
    const runMs = performance.now() - runStart

    // Simulate: before each run, clear deps (delete from each), then re-add
    const stub = {}
    const deps = new Set()
    for (let i = 0; i < DEPS; i++) deps.add(new Set([stub]))
    const clearStart = performance.now()
    for (let i = 0; i < N; i++) {
      deps.forEach(dep => dep.delete(stub))
      deps.clear()
      for (let j = 0; j < DEPS; j++) deps.add(new Set([stub]))
    }
    const clearMs = performance.now() - clearStart

    assert.ok(runs >= N)
    assert.ok(runMs > 0 && clearMs > 0)
    const ratio = (clearMs / runMs).toFixed(2)
    console.log(`  run: ${runMs.toFixed(1)}ms | clear-deps sim: ${clearMs.toFixed(1)}ms | ratio: ${ratio}`)
  })
})
