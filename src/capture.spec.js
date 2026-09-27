import { describe, expect, it, vi } from 'vitest'
import { FrameCapture } from './capture'

function makeHydra() {
  return { getScreenImage: vi.fn() }
}

describe('FrameCapture', () => {
  it('should resolve with the blob read through the engine latch', async () => {
    const blob = { size: 12 }
    const hydra = makeHydra()
    hydra.getScreenImage = vi.fn(cb => cb(blob))
    const capture = new FrameCapture()
    capture.attach(hydra)
    await expect(capture.capture(() => true)).resolves.toBe(blob)
    expect(hydra.getScreenImage).toHaveBeenCalledOnce()
  })

  it('should reject capture before an engine is attached', async () => {
    const capture = new FrameCapture()
    await expect(capture.capture(() => true)).rejects.toThrow(
      'capture: the engine is not initialized'
    )
  })

  it('should reject capture when the render loop is stopped', async () => {
    const hydra = makeHydra()
    const capture = new FrameCapture()
    capture.attach(hydra)
    await expect(capture.capture(() => false)).rejects.toThrow(
      'capture: the render loop is not running'
    )
    expect(hydra.getScreenImage).not.toHaveBeenCalled()
  })

  it('should reject a second capture while one is in flight', async () => {
    const hydra = makeHydra()
    const capture = new FrameCapture()
    capture.attach(hydra)
    const first = capture.capture(() => true)
    await expect(capture.capture(() => true)).rejects.toThrow(
      'capture: another capture is in flight'
    )
    hydra.getScreenImage.mock.calls[0][0]({ size: 1 })
    await expect(first).resolves.toEqual({ size: 1 })
  })

  it('should detach the engine and reject in-flight captures', async () => {
    const hydra = makeHydra()
    const capture = new FrameCapture()
    capture.attach(hydra)
    const first = capture.capture(() => true)
    capture.detach()
    await expect(first).rejects.toThrow('capture: the engine was torn down')
    await expect(capture.capture(() => true)).rejects.toThrow(
      'capture: the engine is not initialized'
    )
  })
})
