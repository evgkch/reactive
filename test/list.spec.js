import { describe, it } from 'node:test'
import assert from 'node:assert'
import { List, Batch, Watch } from '../dist/index.js'

const tick = () => Promise.resolve()

describe('List', () => {
  it('push/pop/length', () => {
    const list = List([1, 2])
    assert.strictEqual(list.length, 2)
    list.push(3)
    assert.strictEqual(list.length, 3)
    assert.strictEqual(list.pop(), 3)
    assert.strictEqual(list.length, 2)
  })

  it('map/filter', () => {
    const list = List([1, 2, 3])
    assert.deepStrictEqual(list.map(x => x * 2), [2, 4, 6])
    assert.deepStrictEqual(list.filter(x => x > 1), [2, 3])
  })

  it('splice/sort/reverse', () => {
    const list = List([3, 1, 2])
    list.splice(1, 1, 10)
    assert.deepStrictEqual([...list], [3, 10, 2])
    list.sort((a, b) => a - b)
    assert.deepStrictEqual([...list], [2, 3, 10])
    list.reverse()
    assert.deepStrictEqual([...list], [10, 3, 2])
  })

  it('Batch on length/reorder', async () => {
    const list = List(['a'])
    let len = 0, sum = ''
    Batch(() => { len = list.length; sum = list.join('') })
    await tick()
    list.push('b')
    await tick()
    assert.strictEqual(len, 2)
    assert.strictEqual(sum, 'ab')
  })

  it('empty list', () => {
    const list = List()
    assert.strictEqual(list.length, 0)
    list.push(1)
    assert.strictEqual(list.length, 1)
  })

  it('index access tracks and triggers', async () => {
    const list = List([1, 2, 3])
    let first = 0
    Batch(() => { first = list[0] })
    await tick()
    list[0] = 99
    await tick()
    assert.strictEqual(first, 99)
  })

  it('index assignment extending array triggers length', async () => {
    const list = List([1, 2])
    let len = 0
    Batch(() => { len = list.length })
    await tick()
    list[5] = 99
    await tick()
    assert.strictEqual(len, 6)
  })

  it('Batch reading only length does not re-run on sort', async () => {
    const list = List([3, 1, 2])
    let runs = 0
    Batch(() => { list.length; runs++ })
    await tick()
    assert.strictEqual(runs, 1)
    list.sort((a, b) => a - b)
    await tick()
    assert.strictEqual(runs, 1)
    list.push(4)
    await tick()
    assert.strictEqual(runs, 2)
  })

  it('Batch reading list[0] does not re-run on push', async () => {
    const list = List([1, 2])
    let runs = 0
    Batch(() => { list[0]; runs++ })
    await tick()
    assert.strictEqual(runs, 1)
    list.push(3)
    await tick()
    assert.strictEqual(runs, 1)
    list[0] = 99
    await tick()
    assert.strictEqual(runs, 2)
  })

  it('Batch reading list[0] does not re-run on list[2]=x', async () => {
    const list = List([1, 2])
    let runs = 0
    Batch(() => { list[0]; runs++ })
    await tick()
    assert.strictEqual(runs, 1)
    list[2] = 3
    await tick()
    assert.strictEqual(runs, 1)
  })

  it('fill and copyWithin trigger', async () => {
    const list = List([1, 2, 3])
    let sum = 0
    Batch(() => { sum = list.reduce((a, b) => a + b, 0) })
    await tick()
    list.fill(0)
    await tick()
    assert.strictEqual(sum, 0)
  })

  it('Watch receives List patches', () => {
    const list = List([1, 2])
    const patches = []
    Watch(list, (p) => patches.push(p))
    list.push(3)
    const pushPatch = patches.find((p) => p.added?.length && !p.removed?.length && p.start === 2)
    assert.ok(pushPatch)
    assert.deepStrictEqual(pushPatch.added, [3])
    list.sort((a, b) => a - b)
    const sortPatch = patches.find((p) => p.removed?.length > 0 && p.added?.length > 0 && p.start === 0)
    assert.ok(sortPatch)
  })

  it('Watch receives exactly one patch per List operation', async () => {
    const list = List([1, 2, 3])
    const patches = []
    Watch(list, (p) => patches.push(p))

    list.splice(1, 1, 10)
    await tick()
    assert.strictEqual(patches.length, 1)
    assert.deepStrictEqual(patches[0], {
      start: 1,
      removed: [2],
      added: [10],
    })

    patches.length = 0
    list[0] = 99
    await tick()
    assert.strictEqual(patches.length, 1)
    assert.deepStrictEqual(patches[0], {
      start: 0,
      removed: [1],
      added: [99],
    })
  })

  it('.watch() is same as Watch(list, fn)', () => {
    const list = List([1, 2])
    const patches = []
    const stop = list.watch((p) => patches.push(p))
    list.push(3)
    assert.strictEqual(patches.length, 1)
    assert.strictEqual(patches[0].start, 2)
    assert.deepStrictEqual(patches[0].added, [3])
    stop()
    list.push(4)
    assert.strictEqual(patches.length, 1)
  })

  it('shift/unshift trigger reorder', async () => {
    const list = List([1, 2, 3])
    let snapshot = []
    Batch(() => { list.length; snapshot = list.map(x => x) })
    await tick()
    list.shift()
    await tick()
    assert.deepStrictEqual(snapshot, [2, 3])
    list.unshift(0)
    await tick()
    assert.deepStrictEqual(snapshot, [0, 2, 3])
  })
})
