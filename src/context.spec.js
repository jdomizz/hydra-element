import { describe, expect, it, vi } from 'vitest'
import { createContext, loadScript } from './context'

describe('createContext', () => {
  it('should evaluate code against the synth and persist bare assignments', async () => {
    const synth = { osc: vi.fn() }
    const context = createContext({ synth })
    await context.eval('x = 42')
    await context.eval('osc(x)')
    expect(synth.osc).toHaveBeenCalledWith(42)
  })

  it('should reuse a provided scope and isolate contexts', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const synth = { osc: vi.fn() }
    const scope = Object.create(null)
    const context = createContext({ synth }, { scope })
    context.scope.y = 7
    await context.eval('osc(y)')
    expect(synth.osc).toHaveBeenCalledWith(7)

    const other = createContext({ synth })
    await other.eval('osc(y)')
    expect(synth.osc).toHaveBeenCalledWith(undefined)
    warn.mockRestore()
  })

  it('should give a bound static precedence over a synth property', async () => {
    const synth = { osc: vi.fn(), mouse: { x: 1, y: 2 } }
    const context = createContext({ synth })
    context.bind('mouse', { x: 100, y: 200 })
    await context.eval('osc(mouse.x, mouse.y)')
    expect(synth.osc).toHaveBeenCalledWith(100, 200)
  })

  it('should resolve a bindLive provider per read', async () => {
    const synth = { osc: vi.fn() }
    const context = createContext({ synth })
    let live = 1
    context.bindLive('live', () => live)
    await context.eval('osc(live)')
    live = 2
    await context.eval('osc(live)')
    expect(synth.osc).toHaveBeenNthCalledWith(1, 1)
    expect(synth.osc).toHaveBeenNthCalledWith(2, 2)
  })

  it('should remove a bound name with unbind', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const synth = { osc: vi.fn() }
    const context = createContext({ synth })
    context.bind('bound', 7)
    await context.eval('osc(bound)')
    context.unbind('bound')
    await context.eval('osc(bound)')
    expect(synth.osc).toHaveBeenNthCalledWith(1, 7)
    expect(synth.osc).toHaveBeenNthCalledWith(2, undefined)
    warn.mockRestore()
  })

  it('should not pin live engine-owned names by default', async () => {
    const synth = { osc: vi.fn(), time: 10 }
    const context = createContext({ synth })
    await context.eval('time = 0')
    synth.time = 42
    await context.eval('osc(time)')
    expect(synth.osc).toHaveBeenCalledWith(42)
  })
})

describe('editor globals', () => {
  it('should bind _hydra and hydraSynth into the scope by default', async () => {
    const hydra = { synth: {} }
    const context = createContext(hydra)
    await context.eval('captured = [_hydra, hydraSynth]')
    expect(context.scope.captured).toEqual([hydra, hydra])
    expect(globalThis._hydra).toBeUndefined()
  })

  it('should skip editor globals when editorGlobals is false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = createContext({ synth: {} }, { editorGlobals: false })
    await context.eval('captured = [_hydra, hydraSynth]')
    expect(context.scope.captured).toEqual([undefined, undefined])
    warn.mockRestore()
  })
})

describe('loadScript', () => {
  it('should evaluate the fetched script and restore the globals bridge', async () => {
    const synth = { osc: () => ({ out: () => {} }) }
    const hydra = { synth }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('osc().out()') }))
    )
    await loadScript('ext.js', { hydra })
    expect(globalThis.synth).toBeUndefined()
    expect(globalThis.fetch).toHaveBeenCalledWith('ext.js')
    vi.unstubAllGlobals()
  })
})
