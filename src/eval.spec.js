import { expect } from '@open-wc/testing'
import { spy } from 'sinon'
import { hydraEval } from './eval'

describe('hydraEval', () => {
  it('should prioritize synth properties over window', async () => {
    const synth = { time: 42, osc: spy() }
    await hydraEval('osc(time)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(42)
  })

  it('should fallback to window for Math', async () => {
    const synth = { osc: spy() }
    await hydraEval('osc(Math.PI)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(Math.PI)
  })

  it('should allow access to console', async () => {
    const synth = {}
    await hydraEval('console.log("test")', synth)
  })

  for (const prop of ['time', 'speed', 'bpm']) {
    it(`should resolve ${prop} dynamically after synth.${prop} changes`, async () => {
      const synth = { [prop]: 0 }
      const scope = Object.create(null)
      await hydraEval(`captured = () => ${prop}`, synth, scope)
      synth[prop] = 42
      expect(scope.captured()).to.equal(42)
    })
  }

  it('should call chained methods', async () => {
    const outSpy = spy()
    const oscResult = { out: outSpy }
    const synth = { osc: () => oscResult }
    await hydraEval('osc(10, 0.2).out()', synth)
    expect(outSpy).to.have.been.calledOnce
  })

  it('should access source buffers', async () => {
    const initSpy = spy()
    const synth = { s0: { init: initSpy } }
    await hydraEval('s0.init({})', synth)
    expect(initSpy).to.have.been.calledOnceWith({})
  })

  it('should access audio properties', async () => {
    const synth = { osc: spy(), a: { fft: [0.5, 0.3] } }
    await hydraEval('osc(a.fft[0])', synth)
    expect(synth.osc).to.have.been.calledOnceWith(0.5)
  })

  it('should handle nested property access', async () => {
    const synth = { osc: spy(), mouse: { x: 100, y: 200 } }
    await hydraEval('osc(mouse.x, mouse.y)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(100, 200)
  })

  it('should handle method chaining with multiple calls', async () => {
    const modulateSpy = spy()
    const outSpy = spy()
    const oscResult = { modulate: () => ({ out: outSpy }) }
    const synth = { osc: () => oscResult, modulate: modulateSpy }
    await hydraEval('osc(10).modulate(osc(5)).out()', synth)
    expect(outSpy).to.have.been.calledOnce
  })

  describe('async support', () => {
    it('should support async/await syntax in the code', async () => {
      const synth = { osc: spy(), speed: 1 }
      await hydraEval('await Promise.resolve(); osc(42); speed = 3', synth)
      expect(synth.osc).to.have.been.calledOnceWith(42)
      expect(synth.speed).to.equal(3)
    })

    it('should always return a promise', () => {
      const synth = {}
      expect(hydraEval('42', synth)).to.be.a('promise')
    })

    it('should reject on syntax errors', async () => {
      const synth = {}
      let caught = null
      try {
        await hydraEval('(((((', synth)
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceOf(SyntaxError)
    })
  })

  describe('scope isolation (trap set)', () => {
    it('should not pollute synth with bare assignments', async () => {
      const synth = { osc: spy() }
      await hydraEval('x = 42; osc(x)', synth)
      expect(synth.x).to.be.undefined
      expect(synth.osc).to.have.been.calledOnceWith(42)
    })

    for (const prop of ['speed', 'bpm']) {
      it(`should sync ${prop} assignment to synth`, async () => {
        const synth = { [prop]: 1 }
        await hydraEval(`${prop} = 2`, synth)
        expect(synth[prop]).to.equal(2)
      })
    }
  })

  describe('persistent scope', () => {
    it('should persist variables between evals with shared scope', async () => {
      const synth = { osc: spy() }
      const scope = Object.create(null)
      await hydraEval('myVar = 42', synth, scope)
      await hydraEval('osc(myVar)', synth, scope)
      expect(synth.osc).to.have.been.calledOnceWith(42)
    })

    it('should allow function definitions to persist', async () => {
      const synth = { osc: spy() }
      const scope = Object.create(null)
      await hydraEval('myFunc = (x) => x * 2', synth, scope)
      await hydraEval('osc(myFunc(21))', synth, scope)
      expect(synth.osc).to.have.been.calledOnceWith(42)
    })

    it('should isolate variables without shared scope', async () => {
      const synth = { osc: spy() }
      await hydraEval('myVar = 42', synth)
      await hydraEval('osc(myVar)', synth)
      expect(synth.osc).to.have.been.calledOnceWith(undefined)
    })

    for (const keyword of ['let', 'const']) {
      it(`should not persist ${keyword} declarations (block-scoped)`, async () => {
        const synth = { osc: spy() }
        const scope = Object.create(null)
        await hydraEval(`${keyword} myVar = 42`, synth, scope)
        await hydraEval('osc(myVar)', synth, scope)
        expect(synth.osc).to.have.been.calledOnceWith(undefined)
      })
    }
  })
})
