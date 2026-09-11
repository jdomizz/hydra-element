/**
 * Node-lane spec for the headless core: injected engine factory + injected
 * scheduler. The engine behaviors of the old `hydra.spec.js` (init, `s`/`o`,
 * destroy, tick, setResolution) land here host-less; the event behaviors stay
 * browser-side on the runtime.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHydraCore, setDefaultHydraFactory } from './index'
import { EvalQueue } from './queue'
import type { RafScheduler } from './loop'
import type { HydraFactory, HydraLike } from './types'

/** The core never touches the canvas — a stub satisfies the type. */
const canvasStub = {} as HTMLCanvasElement

function makeFakeHydra() {
  const clear = vi.fn()
  const audioStop = vi.fn()
  const setResolution = vi.fn<(width: number, height: number) => void>()
  const setFunction = vi.fn()
  const osc = vi.fn()
  const tick = vi.fn()
  const loadScript = vi.fn(() => Promise.resolve())
  const sources = Array.from({ length: 4 }, () => ({ clear }))
  const synth = { setResolution, setFunction, osc, time: 0, width: 100, height: 100 }
  const hydra: HydraLike = {
    synth,
    s: sources,
    o: Array.from({ length: 4 }),
    loadScript,
    tick,
    getAudio: () => ({ stop: audioStop }),
  }
  return { hydra, synth, sources, clear, audioStop, setResolution, osc, tick, loadScript }
}

describe('HydraCore (Node lane)', () => {
  beforeEach(() => {
    setDefaultHydraFactory(null)
  })

  it('throws when no factory is registered', () => {
    expect(() => createHydraCore({ canvas: canvasStub })).toThrow(/hydraFactory/)
  })

  it('init creates the engine through the factory (and the facade injects the default)', () => {
    const { hydra } = makeFakeHydra()
    const constructed: Array<unknown> = []
    const factory: HydraFactory = opts => {
      constructed.push(opts)
      return hydra
    }
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    expect(constructed).toHaveLength(1)
    expect(core.synth).toBeDefined()
    expect(core.hydra).toBe(hydra)
  })

  it('exposes the sources array as `s` and outputs as `o` on the synth (non-enumerable)', () => {
    const { hydra } = makeFakeHydra()
    const factory: HydraFactory = () => hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    expect(core.synth!.s).toBe(hydra.s)
    expect(core.synth!.o).toBe(hydra.o)
    const descriptor = Object.getOwnPropertyDescriptor(core.synth!, 's')
    expect(descriptor?.enumerable).toBe(false)
  })

  it('evalAsync resolves and evaluates through the synth', async () => {
    const { hydra, osc } = makeFakeHydra()
    const factory: HydraFactory = () => hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    await expect(core.evalAsync('osc(42)')).resolves.toBeUndefined()
    expect(osc).toHaveBeenCalledOnce()
    expect(osc).toHaveBeenCalledWith(42)
  })

  it('evalAsync rejects and attaches the user-code line', async () => {
    const factory: HydraFactory = () => makeFakeHydra().hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    const error = await core.evalAsync('throw new Error("boom")').catch(e => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error & { line?: number }).line).toBe(1)
  })

  it('serializes evaluations through the queue (second eval waits for the first)', async () => {
    const order: string[] = []
    const queue = new EvalQueue()
    queue.submit(async () => {
      order.push('first:start')
      await new Promise(resolve => setTimeout(resolve, 10))
      order.push('first:end')
    })
    queue.submit(async () => order.push('second'))
    await queue.submit(async () => order.push('third'))
    expect(order).toEqual(['first:start', 'first:end', 'second', 'third'])
  })

  it('keeps the queue alive after a rejected task', async () => {
    const queue = new EvalQueue()
    await expect(
      queue.submit(async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    await expect(queue.submit(async () => 'ok')).resolves.toBe('ok')
  })

  it('scope persists across init() resets', async () => {
    const factory: HydraFactory = () => makeFakeHydra().hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    await core.evalAsync('myVar = 42')
    core.init()
    await core.evalAsync('captured = () => myVar')
    expect((core.scope.captured as () => number)()).toBe(42)
  })

  it('destroy clears sources and stops audio (historical order)', () => {
    const { hydra, clear, audioStop } = makeFakeHydra()
    const factory: HydraFactory = () => hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    core.destroy()
    expect(clear).toHaveBeenCalledTimes(4)
    expect(audioStop).toHaveBeenCalledOnce()
    expect(core.synth).toBeUndefined()
  })

  it('start/stop drive the injected scheduler', () => {
    const rafCallbacks: Array<(time: number) => void> = []
    const cancel = vi.fn()
    const scheduler: RafScheduler = {
      requestAnimationFrame: callback => {
        rafCallbacks.push(callback)
        return rafCallbacks.length
      },
      cancelAnimationFrame: cancel,
    }
    const factory: HydraFactory = () => makeFakeHydra().hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub, scheduler })
    core.start()
    expect(rafCallbacks).toHaveLength(1)
    core.stop()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('tick forwards dt to the engine', () => {
    const { hydra, tick } = makeFakeHydra()
    const factory: HydraFactory = () => hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    core.tick(50)
    expect(tick).toHaveBeenCalledOnce()
    expect(tick).toHaveBeenCalledWith(50)
  })

  it('setResolution forwards to the synth', () => {
    const { hydra, setResolution } = makeFakeHydra()
    const factory: HydraFactory = () => hydra
    setDefaultHydraFactory(factory)
    const core = createHydraCore({ canvas: canvasStub })
    core.setResolution(640, 480)
    expect(setResolution).toHaveBeenCalledOnce()
    expect(setResolution).toHaveBeenCalledWith(640, 480)
  })
})
