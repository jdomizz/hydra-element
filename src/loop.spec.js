import { afterEach, describe, expect, it, vi } from 'vitest'
import { Loop } from './loop'

describe('Loop', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should compute delta time in milliseconds across ticks', () => {
    const onTick = vi.fn()
    const loop = new Loop({ onTick })
    loop.tick(100)
    expect(onTick).toHaveBeenLastCalledWith(100)
    loop.tick(150)
    expect(onTick).toHaveBeenLastCalledWith(50)
    expect(loop.tick(150)).toBe(0)
  })

  it('should start and stop the loop', () => {
    const cancel = vi.fn()
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 42)
    )
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const loop = new Loop({ onTick: vi.fn() })
    loop.start()
    expect(loop.isRunning).toBe(true)
    loop.stop()
    expect(cancel).toHaveBeenCalledWith(42)
    expect(loop.isRunning).toBe(false)
  })

  it('should be a no-op to start while already running', () => {
    const request = vi.fn(() => 7)
    vi.stubGlobal('requestAnimationFrame', request)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const loop = new Loop({ onTick: vi.fn() })
    loop.start()
    loop.start()
    expect(request).toHaveBeenCalledTimes(1)
  })
})
