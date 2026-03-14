import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Value, Batch, Watch, configure } from '../dist/index.js'

const tick = () => Promise.resolve()

describe('Batch', () => {
  it('runs on creation', () => {
    const v = Value(0)
    let runs = 0
    Batch(() => { v.get(); runs++ })
    assert.strictEqual(runs, 1)
  })

  it('stop unsubscribes', async () => {
    const v = Value(0)
    let runs = 0
    const stop = Batch(() => { v.get(); runs++ })
    v.set(1)
    await tick()
    assert.strictEqual(runs, 2)
    stop()
    v.set(2)
    await tick()
    assert.strictEqual(runs, 2)
  })

  it('exception in Batch leaves active null', async () => {
    const v = Value(0)
    try {
      Batch(() => {
        v.get()
        throw new Error('boom')
      })
    } catch (_) {}
    let ok = false
    Batch(() => { v.get(); ok = true })
    await tick()
    assert.ok(ok)
  })

  it('multiple Batches on same source', async () => {
    const v = Value(0)
    let a = 0, b = 0
    Batch(() => { a = v.get() })
    Batch(() => { b = v.get() })
    await tick()
    v.set(1)
    await tick()
    assert.strictEqual(a, 1)
    assert.strictEqual(b, 1)
  })

  it('Batch runs on change', async () => {
    const v = Value(0)
    let x = 0
    Batch(() => { x = v.get() })
    await tick()
    v.set(1)
    await tick()
    assert.strictEqual(x, 1)
  })

  it('Watch receives patches (immediate by default)', () => {
    const v = Value(0)
    const collected = []
    Watch(v, (patch) => collected.push(patch))
    v.set(1)
    assert.strictEqual(collected.length, 1)
    assert.strictEqual(collected[0].prev, 0)
    assert.strictEqual(collected[0].next, 1)
  })

  it('Watch false batches', async () => {
    const v = Value(0)
    const collected = []
    Watch(v, (patch) => collected.push(patch), false)
    v.set(1)
    await tick()
    assert.strictEqual(collected.length, 1)
  })

  it('Batch immediate runs synchronously', () => {
    const v = Value(0)
    let runs = 0
    Batch(() => { v.get(); runs++ }, true)
    assert.strictEqual(runs, 1)
    v.set(1)
    assert.strictEqual(runs, 2)
  })

  it('configure sets defaults for Batch and Watch', () => {
    configure({ batch: true })
    const v = Value(0)
    let runs = 0
    Batch(() => { v.get(); runs++ })
    v.set(1)
    assert.strictEqual(runs, 2)
    configure({ batch: false })

    configure({ watch: false })
    const collected = []
    Watch(v, (patch) => collected.push(patch))
    v.set(2)
    assert.strictEqual(collected.length, 0)
    return tick().then(() => {
      assert.strictEqual(collected.length, 1)
      configure({ watch: true })
    })
  })

  it('configure accepts "sync"/"async" aliases', async () => {
    const v = Value(0)

    // Batch: "sync" makes updates immediate
    configure({ batch: 'sync' })
    let runs = 0
    Batch(() => { v.get(); runs++ })
    v.set(1)
    assert.strictEqual(runs, 2)

    // Batch: "async" batches into a microtask
    configure({ batch: 'async' })
    let asyncRuns = 0
    Batch(() => { v.get(); asyncRuns++ })
    v.set(2)
    assert.strictEqual(asyncRuns, 1)
    await tick()
    assert.strictEqual(asyncRuns, 2)

    // Watch: "async" defers patches
    configure({ watch: 'async' })
    const collected = []
    Watch(v, (patch) => collected.push(patch))
    v.set(3)
    assert.strictEqual(collected.length, 0)
    await tick()
    assert.strictEqual(collected.length, 1)

    // reset to defaults for other tests
    configure({ batch: false, watch: true })
  })
})
