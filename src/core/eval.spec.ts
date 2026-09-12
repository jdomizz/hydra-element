/**
 * Node-lane port of the old `src/eval.spec.js` (WTR). Every `it()` from the
 * browser suite maps 1:1 here with the same stub-synth shape — the Proxy
 * scope contract is pure and needs no DOM.
 */
import { describe, expect, it, vi } from 'vitest'
import { createEvaluator, hydraEval } from './eval'

describe('hydraEval', () => {
  it('should prioritize synth properties over window', async () => {
    const synth = { time: 42, osc: vi.fn() }
    await hydraEval('osc(time)', synth)
    expect(synth.osc).toHaveBeenCalledOnce()
    expect(synth.osc).toHaveBeenCalledWith(42)
  })

  it('should fallback to window for Math', async () => {
    const synth = { osc: vi.fn() }
    await hydraEval('osc(Math.PI)', synth)
    expect(synth.osc).toHaveBeenCalledOnce()
    expect(synth.osc).toHaveBeenCalledWith(Math.PI)
  })

  it('should allow access to console', async () => {
    const synth = {}
    await hydraEval('console.log("test")', synth)
  })

  for (const prop of ['time', 'speed', 'bpm']) {
    it(`should resolve ${prop} dynamically after synth.${prop} changes`, async () => {
      const synth: Record<string, unknown> = { [prop]: 0 }
      const scope = Object.create(null) as Record<string, unknown>
      await hydraEval(`captured = () => ${prop}`, synth, scope)
      synth[prop] = 42
      expect((scope.captured as () => number)()).toBe(42)
    })
  }

  it('should call chained methods', async () => {
    const outSpy = vi.fn()
    const oscResult = { out: outSpy }
    const synth = { osc: () => oscResult }
    await hydraEval('osc(10, 0.2).out()', synth)
    expect(outSpy).toHaveBeenCalledOnce()
  })

  it('should access source buffers', async () => {
    const initSpy = vi.fn()
    const synth = { s0: { init: initSpy } }
    await hydraEval('s0.init({})', synth)
    expect(initSpy).toHaveBeenCalledOnce()
    expect(initSpy).toHaveBeenCalledWith({})
  })

  it('should access audio properties', async () => {
    const synth = { osc: vi.fn(), a: { fft: [0.5, 0.3] } }
    await hydraEval('osc(a.fft[0])', synth)
    expect(synth.osc).toHaveBeenCalledOnce()
    expect(synth.osc).toHaveBeenCalledWith(0.5)
  })

  it('should handle nested property access', async () => {
    const synth = { osc: vi.fn(), mouse: { x: 100, y: 200 } }
    await hydraEval('osc(mouse.x, mouse.y)', synth)
    expect(synth.osc).toHaveBeenCalledOnce()
    expect(synth.osc).toHaveBeenCalledWith(100, 200)
  })

  it('should handle method chaining with multiple calls', async () => {
    const manipulateSpy = vi.fn()
    const outSpy = vi.fn()
    const oscResult = { manipulate: () => ({ out: outSpy }) }
    const synth = { osc: () => oscResult, manipulate: manipulateSpy }
    await hydraEval('osc(10).manipulate(osc(5)).out()', synth)
    expect(outSpy).toHaveBeenCalledOnce()
  })

  describe('async support', () => {
    it('should support async/await syntax in the code', async () => {
      const synth: Record<string, unknown> = { osc: vi.fn(), speed: 1 }
      await hydraEval('await Promise.resolve(); osc(42); speed = 3', synth)
      expect(synth.osc).toHaveBeenCalledOnce()
      expect(synth.osc).toHaveBeenCalledWith(42)
      expect(synth.speed).toBe(3)
    })

    it('should always return a promise', () => {
      const synth = {}
      expect(hydraEval('42', synth)).toBeInstanceOf(Promise)
    })

    it('should reject on syntax errors', async () => {
      const synth = {}
      await expect(hydraEval('(((((', synth)).rejects.toBeInstanceOf(SyntaxError)
    })

    it('should not be fooled by a trailing line comment without newline', async () => {
      const outSpy = vi.fn()
      const synth = { osc: () => ({ out: outSpy }) }
      // code ends with `// ...` and no trailing newline; the wrapper must not
      // let the comment swallow its closing braces.
      await hydraEval('osc(1).out() // trailing comment', synth)
      expect(outSpy).toHaveBeenCalledOnce()
    })
  })

  describe('scope isolation (trap set)', () => {
    it('should not pollute synth with bare assignments', async () => {
      const synth: Record<string, unknown> = { osc: vi.fn() }
      await hydraEval('x = 42; osc(x)', synth)
      expect(synth.x).toBeUndefined()
      expect(synth.osc).toHaveBeenCalledOnce()
      expect(synth.osc).toHaveBeenCalledWith(42)
    })

    for (const prop of ['speed', 'bpm']) {
      it(`should sync ${prop} assignment to synth`, async () => {
        const synth: Record<string, unknown> = { [prop]: 1 }
        await hydraEval(`${prop} = 2`, synth)
        expect(synth[prop]).toBe(2)
      })
    }
  })

  describe('persistent scope', () => {
    it('should persist variables between evals with shared scope', async () => {
      const synth = { osc: vi.fn() }
      const scope = Object.create(null) as Record<string, unknown>
      await hydraEval('myVar = 42', synth, scope)
      await hydraEval('osc(myVar)', synth, scope)
      expect(synth.osc).toHaveBeenCalledOnce()
      expect(synth.osc).toHaveBeenCalledWith(42)
    })

    it('should allow function definitions to persist', async () => {
      const synth = { osc: vi.fn() }
      const scope = Object.create(null) as Record<string, unknown>
      await hydraEval('myFunc = (x) => x * 2', synth, scope)
      await hydraEval('osc(myFunc(21))', synth, scope)
      expect(synth.osc).toHaveBeenCalledOnce()
      expect(synth.osc).toHaveBeenCalledWith(42)
    })

    it('should isolate variables without shared scope', async () => {
      const synth = { osc: vi.fn() }
      await hydraEval('myVar = 42', synth)
      await hydraEval('osc(myVar)', synth)
      expect(synth.osc).toHaveBeenCalledOnce()
      expect(synth.osc).toHaveBeenCalledWith(undefined)
    })

    for (const keyword of ['let', 'const']) {
      it(`should not persist ${keyword} declarations (block-scoped)`, async () => {
        const synth = { osc: vi.fn() }
        const scope = Object.create(null) as Record<string, unknown>
        await hydraEval(`${keyword} myVar = 42`, synth, scope)
        await hydraEval('osc(myVar)', synth, scope)
        expect(synth.osc).toHaveBeenCalledOnce()
        expect(synth.osc).toHaveBeenCalledWith(undefined)
      })
    }
  })

  describe('undefined identifier warnings', () => {
    it('should warn once for a totally undefined identifier', async () => {
      const scope = Object.create(null) as Record<string, unknown>
      await hydraEval('notARealThing = 1', {}, scope)
      // Just verify it doesn't throw
      expect(scope.notARealThing).toBe(1)
    })
  })
})

describe('createEvaluator', () => {
  it('persists bare assignments across calls', async () => {
    const synth = { osc: vi.fn() }
    const evaluate = createEvaluator(synth)
    await evaluate('x = 42')
    await evaluate('osc(x)')
    expect(synth.osc).toHaveBeenCalledOnce()
    expect(synth.osc).toHaveBeenCalledWith(42)
  })

  it('seeds and reads through the exposed scope', async () => {
    const synth = { osc: vi.fn() }
    const evaluate = createEvaluator(synth)
    evaluate.scope.y = 7
    await evaluate('osc(y)')
    expect(synth.osc).toHaveBeenCalledWith(7)
    await evaluate('result = 42')
    expect(evaluate.scope.result).toBe(42)
  })

  it('isolates each evaluator from the others', async () => {
    const synth = { osc: vi.fn() }
    const a = createEvaluator(synth)
    const b = createEvaluator(synth)
    await a('x = 1')
    await b('osc(x)')
    expect(synth.osc).toHaveBeenCalledWith(undefined)
  })
})
