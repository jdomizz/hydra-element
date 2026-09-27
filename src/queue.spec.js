import { describe, expect, it } from 'vitest'
import { EvalQueue } from './queue.js'

describe('EvalQueue', () => {
  it('serializes tasks and preserves results', async () => {
    const queue = new EvalQueue()
    const order = []
    let release
    const gate = new Promise(resolve => (release = resolve))
    const first = queue.submit(async () => {
      order.push('first:start')
      await gate
      order.push('first:end')
      return 1
    })
    const second = queue.submit(async () => {
      order.push('second')
      return 2
    })
    await Promise.resolve()
    expect(order).toEqual(['first:start'])
    release()
    await expect(first).resolves.toBe(1)
    await expect(second).resolves.toBe(2)
    expect(order).toEqual(['first:start', 'first:end', 'second'])
  })

  it('continues after a rejected task', async () => {
    const queue = new EvalQueue()
    const failed = queue.submit(() => Promise.reject(new Error('boom')))
    const next = queue.submit(() => Promise.resolve(2))
    await expect(failed).rejects.toThrow('boom')
    await expect(next).resolves.toBe(2)
  })
})
