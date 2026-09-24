// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HydraElement } from './element'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

const originalFactory = HydraElement.hydraFactory

function makeStubHydra() {
  return {
    synth: { setFunction: vi.fn(), setResolution: vi.fn(), osc: () => ({ out: () => {} }) },
    s: [{ clear: vi.fn() }, { clear: vi.fn() }],
    tick: vi.fn(),
  }
}

function mount() {
  const el = document.createElement('hydra-element')
  document.body.append(el)
  return el
}

function nextHydraEval(el) {
  return new Promise(resolve => {
    el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
  })
}

describe('<hydra-element>', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    HydraElement.hydraFactory = originalFactory
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('should expose the synth instance', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    expect(el.synth).toBe(stub.synth)
  })

  it('should keep the engine off globalThis by default and bind it into the eval scope', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    expect(globalThis._hydra).toBeUndefined()
    expect(globalThis.hydraSynth).toBeUndefined()
    expect(el.scope._hydra).toBe(stub)
    expect(el.scope.hydraSynth).toBe(stub)
    el.destroy()
    expect(globalThis._hydra).toBeUndefined()
    expect(globalThis.hydraSynth).toBeUndefined()
  })

  it('should publish the engine on globalThis only when global is enabled', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = document.createElement('hydra-element')
    el.setAttribute('global', 'true')
    document.body.append(el)
    await el.ready
    expect(globalThis._hydra).toBe(stub)
    expect(globalThis.hydraSynth).toBe(stub)
    el.destroy()
    expect(globalThis._hydra).toBeUndefined()
    expect(globalThis.hydraSynth).toBeUndefined()
  })

  it('should dispatch `hydra-ready` with the engine on init', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = document.createElement('hydra-element')
    const detail = await new Promise(resolve => {
      el.addEventListener('hydra-ready', e => resolve(e.detail), { once: true })
      document.body.append(el)
    })
    expect(detail).toEqual({ synth: stub.synth })
  })

  it('should dispatch `hydra-eval` success when code evaluates', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    const detail = await Promise.all([nextHydraEval(el), (el.code = 'osc().out()')]).then(
      ([d]) => d
    )
    expect(detail.success).toBe(true)
  })

  it('should dispatch `hydra-eval` failure with an error on bad code', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    const detail = await Promise.all([nextHydraEval(el), (el.code = '(((((')]).then(([d]) => d)
    expect(detail.success).toBe(false)
    expect(detail.error).toBeTruthy()
  })

  it('should destroy the previous engine when attributes change', async () => {
    const first = makeStubHydra()
    const second = makeStubHydra()
    const instances = [first, second]
    HydraElement.hydraFactory = () => instances.shift()
    const el = mount()
    await el.ready
    expect(el.synth).toBe(first.synth)
    el.setAttribute('sources', '2')
    expect(first.s[0].clear).toHaveBeenCalled()
    expect(el.synth).toBe(second.synth)
  })

  it('should own the loop and stop it on destroy', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1)
    el.destroy()
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1)
    expect(el.synth).toBeUndefined()
    expect(stub.s[0].clear).toHaveBeenCalled()
  })

  it('should forward ticks to the engine', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    el.tick(16)
    expect(stub.tick).toHaveBeenCalledWith(16)
  })

  it('should init the engine once with multiple initial attributes', async () => {
    const stub = makeStubHydra()
    const seen = []
    HydraElement.hydraFactory = options => {
      seen.push(options)
      return stub
    }
    const el = document.createElement('hydra-element')
    el.setAttribute('width', '500')
    el.setAttribute('height', '300')
    el.setAttribute('audio', 'true')
    document.body.append(el)
    await el.ready
    expect(seen).toHaveLength(1)
    expect(el.canvas.width).toBe(500)
    expect(el.canvas.height).toBe(300)
    expect(seen[0].detectAudio).toBe(true)
  })

  it('should resize without recreating the engine when width changes', async () => {
    const stub = makeStubHydra()
    let calls = 0
    HydraElement.hydraFactory = () => {
      calls++
      return stub
    }
    const el = mount()
    await el.ready
    el.setAttribute('width', '640')
    expect(el.canvas.width).toBe(640)
    expect(calls).toBe(1)
    expect(stub.synth.width).toBe(640)
    expect(stub.synth.height).toBe(720)
  })

  it('should toggle the loop via the loop attribute without recreating the engine', async () => {
    const stub = makeStubHydra()
    let calls = 0
    HydraElement.hydraFactory = () => {
      calls++
      return stub
    }
    const el = mount()
    await el.ready
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1)
    el.setAttribute('loop', 'false')
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1)
    el.setAttribute('loop', 'true')
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2)
    expect(calls).toBe(1)
  })

  it('should not start the loop when loop="false" is set initially', async () => {
    const stub = makeStubHydra()
    HydraElement.hydraFactory = () => stub
    const el = document.createElement('hydra-element')
    el.setAttribute('loop', 'false')
    document.body.append(el)
    await el.ready
    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('should re-resolve `ready` after destroy and reconnect', async () => {
    const first = makeStubHydra()
    const second = makeStubHydra()
    const instances = [first, second]
    HydraElement.hydraFactory = () => instances.shift()
    const el = mount()
    await el.ready
    expect(el.synth).toBe(first.synth)
    el.destroy()
    const readyPromise = el.ready
    el.remove()
    document.body.append(el)
    expect((await readyPromise).synth).toBe(second.synth)
    expect(el.synth).toBe(second.synth)
  })

  it('should publish the engine surface while loadScript runs', async () => {
    const stub = makeStubHydra()
    let resolve
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(res => (resolve = res)))
    )
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    const loading = el.loadScript('ext.js')
    expect(globalThis.synth).toBe(stub.synth)
    resolve({ ok: true, text: () => Promise.resolve('') })
    await loading
    expect(globalThis.synth).toBeUndefined()
  })

  it('should evaluate the fetched extension in the eval scope', async () => {
    const stub = makeStubHydra()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('osc().out()') }))
    )
    HydraElement.hydraFactory = () => stub
    const el = mount()
    await el.ready
    const detail = await Promise.all([nextHydraEval(el), (el.code = 'loadScript("ext.js")')]).then(
      ([d]) => d
    )
    expect(detail.success).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith('ext.js')
  })
})
