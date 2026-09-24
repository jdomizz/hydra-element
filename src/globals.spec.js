import { describe, expect, it } from 'vitest'
import { publishHydraGlobals } from './globals'

describe('publishHydraGlobals', () => {
  it('should publish the hydra surface and restore it', () => {
    const synth = { osc: () => {}, solid: () => {} }
    const hydra = { synth }
    const restore = publishHydraGlobals(hydra)
    expect(globalThis._hydra).toBe(hydra)
    expect(globalThis.hydraSynth).toBe(hydra)
    expect(globalThis.synth).toBe(synth)
    expect(typeof globalThis.osc).toBe('function')
    restore()
    expect(globalThis._hydra).toBeUndefined()
    expect(globalThis.synth).toBeUndefined()
    expect(globalThis.osc).toBeUndefined()
  })

  it('should not publish mutable state (update, speed, time…)', () => {
    const synth = { osc: () => {}, update: () => {}, speed: 1, time: 0 }
    const hydra = { synth }
    const restore = publishHydraGlobals(hydra)
    expect(typeof globalThis.osc).toBe('function')
    expect(globalThis.update).toBeUndefined()
    expect(globalThis.speed).toBeUndefined()
    expect(globalThis.time).toBeUndefined()
    restore()
  })

  it('should restore a pre-existing global value', () => {
    globalThis.synth = 'original'
    const hydra = { synth: { osc: () => {} } }
    const restore = publishHydraGlobals(hydra)
    expect(globalThis.synth).not.toBe('original')
    restore()
    expect(globalThis.synth).toBe('original')
    delete globalThis.synth
  })
})
