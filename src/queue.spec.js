import { describe, expect, it, vi } from 'vitest'
import { EvalQueue } from './queue'

describe('EvalQueue', () => {
  it('should run tasks serially', async () => {
    const queue = new EvalQueue()
    const order = []
    let release
    const gate = new Promise(resolve => {
      release = resolve
    })
    const a = queue.submit(async () => {
      await gate
      order.push('a')
    })
    const b = queue.submit(async () => {
      order.push('b')
    })
    expect(order).toEqual([])
    release()
    await Promise.all([a, b])
    expect(order).toEqual(['a', 'b'])
  })

  it('should not poison the queue when a task rejects', async () => {
    const queue = new EvalQueue()
    const result = vi.fn()
    await queue.submit(() => Promise.reject(new Error('boom'))).catch(() => {})
    await queue.submit(() => {
      result()
      return Promise.resolve()
    })
    expect(result).toHaveBeenCalledTimes(1)
  })
})
