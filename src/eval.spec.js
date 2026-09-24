import { describe, expect, it, vi } from 'vitest'
import { hydraEval, bindScope, userCodeLine } from './eval'

describe('hydraEval', () => {
  it('should prioritize synth properties over window', async () => {
    const synth = { time: 42, osc: vi.fn() }
    await hydraEval('osc(time)', synth)
    expect(synth.osc).toHaveBeenCalledTimes(1)
    expect(synth.osc).toHaveBeenCalledWith(42)
  })

  it('should fall back to window for globals like Math', async () => {
    const synth = { osc: vi.fn() }
    await hydraEval('osc(Math.PI)', synth)
    expect(synth.osc).toHaveBeenCalledWith(Math.PI)
  })

  it('should expose the synth instance as `synth`', async () => {
    const synth = { osc: vi.fn() }
    const scope = Object.create(null)
    await hydraEval('result = synth', synth, scope)
    expect(scope.result).toBe(synth)
  })

  for (const prop of ['time', 'speed', 'bpm']) {
    it(`should resolve \`${prop}\` live after synth.${prop} changes`, async () => {
      const synth = { [prop]: 0 }
      const scope = Object.create(null)
      await hydraEval(`captured = () => ${prop}`, synth, scope)
      synth[prop] = 42
      expect(scope.captured()).toBe(42)
    })
  }

  it('should preserve `this` when calling synth methods bare', async () => {
    const synth = {
      base: 21,
      double() {
        return this.base * 2
      },
    }
    const scope = Object.create(null)
    await hydraEval('result = double()', synth, scope)
    expect(scope.result).toBe(42)
  })

  it('should bind bare globals so `this` is globalThis (not the proxy)', async () => {
    globalThis.checkThis = function () {
      return this === globalThis
    }
    const scope = Object.create(null)
    await hydraEval('result = checkThis()', {}, scope)
    expect(scope.result).toBe(true)
    delete globalThis.checkThis
  })

  it('should call chained methods', async () => {
    const out = vi.fn()
    const synth = { osc: () => ({ out }) }
    await hydraEval('osc(10, 0.2).out()', synth)
    expect(out).toHaveBeenCalledTimes(1)
  })

  it('should access source buffers', async () => {
    const init = vi.fn()
    const synth = { s0: { init } }
    await hydraEval('s0.init({})', synth)
    expect(init).toHaveBeenCalledTimes(1)
    expect(init).toHaveBeenCalledWith({})
  })

  it('should access audio properties', async () => {
    const synth = { osc: vi.fn(), a: { fft: [0.5, 0.3] } }
    await hydraEval('osc(a.fft[0])', synth)
    expect(synth.osc).toHaveBeenCalledWith(0.5)
  })

  it('should handle nested property access', async () => {
    const synth = { osc: vi.fn(), mouse: { x: 100, y: 200 } }
    await hydraEval('osc(mouse.x, mouse.y)', synth)
    expect(synth.osc).toHaveBeenCalledWith(100, 200)
  })

  it('should handle method chaining with nested calls', async () => {
    const out = vi.fn()
    const synth = { osc: () => ({ manipulate: () => ({ out }) }) }
    await hydraEval('osc(10).manipulate(osc(5)).out()', synth)
    expect(out).toHaveBeenCalledTimes(1)
  })

  describe('async support', () => {
    it('should support async/await syntax', async () => {
      const synth = { osc: vi.fn(), speed: 1 }
      await hydraEval('await Promise.resolve(); osc(42); speed = 3', synth)
      expect(synth.osc).toHaveBeenCalledWith(42)
      expect(synth.speed).toBe(3)
    })

    it('should always return a promise', () => {
      expect(hydraEval('42', {})).toBeInstanceOf(Promise)
    })

    it('should reject on syntax errors', async () => {
      await expect(hydraEval('(((((', {})).rejects.toBeInstanceOf(SyntaxError)
    })

    it('should not be fooled by a trailing line comment', async () => {
      const out = vi.fn()
      const synth = { osc: () => ({ out }) }
      await hydraEval('osc(1).out() // trailing comment', synth)
      expect(out).toHaveBeenCalledTimes(1)
    })
  })

  describe('scope isolation', () => {
    it('should not pollute the synth with bare assignments', async () => {
      const synth = { osc: vi.fn() }
      await hydraEval('x = 42; osc(x)', synth)
      expect(synth.x).toBeUndefined()
      expect(synth.osc).toHaveBeenCalledWith(42)
    })

    for (const prop of ['speed', 'bpm']) {
      it(`should mirror \`${prop}\` assignment onto the synth`, async () => {
        const synth = { [prop]: 1 }
        await hydraEval(`${prop} = 2`, synth)
        expect(synth[prop]).toBe(2)
      })
    }
  })

  describe('persistent scope', () => {
    it('should persist bare assignments between evals with a shared scope', async () => {
      const synth = { osc: vi.fn() }
      const scope = Object.create(null)
      await hydraEval('myVar = 42', synth, scope)
      await hydraEval('osc(myVar)', synth, scope)
      expect(synth.osc).toHaveBeenCalledWith(42)
    })

    it('should persist function definitions between evals', async () => {
      const synth = { osc: vi.fn() }
      const scope = Object.create(null)
      await hydraEval('myFunc = (x) => x * 2', synth, scope)
      await hydraEval('osc(myFunc(21))', synth, scope)
      expect(synth.osc).toHaveBeenCalledWith(42)
    })

    it('should isolate variables without a shared scope', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const synth = { osc: vi.fn() }
      await hydraEval('myVar = 42', synth)
      await hydraEval('osc(myVar)', synth)
      expect(synth.osc).toHaveBeenCalledWith(undefined)
      warn.mockRestore()
    })

    for (const keyword of ['let', 'const']) {
      it(`should not persist \`${keyword}\` declarations (block-scoped)`, async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const synth = { osc: vi.fn() }
        const scope = Object.create(null)
        await hydraEval(`${keyword} myVar = 42`, synth, scope)
        await hydraEval('osc(myVar)', synth, scope)
        expect(synth.osc).toHaveBeenCalledWith(undefined)
        warn.mockRestore()
      })
    }
  })

  describe('live engine-owned names', () => {
    it('does not pin time/width/height assignments', async () => {
      const synth = { time: 10, width: 640, height: 480 }
      const scope = Object.create(null)
      await hydraEval('time = 0; width = 100; height = 200', synth, scope)
      synth.time = 42
      synth.width = 1280
      synth.height = 720
      await hydraEval('result = [time, width, height]', synth, scope)
      expect(scope.result).toEqual([42, 1280, 720])
    })

    it('reads user props live after external synth mutations (e.g. hush)', async () => {
      const synth = { speed: 1, update: () => 0 }
      const scope = Object.create(null)
      await hydraEval('speed = 3; captured = () => speed', synth, scope)
      synth.speed = 9
      expect(scope.captured()).toBe(9)
    })

    it('lets an explicitly bound value override the live read', async () => {
      const synth = { time: 10 }
      const scope = Object.create(null)
      bindScope(scope, 'time', 5)
      await hydraEval('result = time', synth, scope)
      expect(scope.result).toBe(5)
    })
  })

  describe('undefined identifier warnings', () => {
    it('warns once per scope, not per page', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const scopeA = Object.create(null)
      const scopeB = Object.create(null)
      await hydraEval('aMissingThing', {}, scopeA)
      await hydraEval('aMissingThing', {}, scopeA)
      await hydraEval('aMissingThing', {}, scopeB)
      expect(warn).toHaveBeenCalledTimes(2)
      warn.mockRestore()
    })
  })
})

describe('userCodeLine', () => {
  it('maps a thrown error back to its line in the user code', async () => {
    const code = ['const a = 1', 'const b = 2', 'throw new Error("boom")'].join('\n')
    let error
    try {
      await hydraEval(code, {})
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect(userCodeLine(error, code)).toBe(3)
  })

  it('returns undefined when the error carries no user-code position', async () => {
    let error
    try {
      await hydraEval('(((', {})
    } catch (e) {
      error = e
    }
    expect(userCodeLine(error, '(((')).toBeUndefined()
  })
})
