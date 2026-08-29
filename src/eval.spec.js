import { expect } from '@open-wc/testing'
import { spy } from 'sinon'
import { hydraEval, hydraEvalAsync } from './eval'

describe('hydraEval', () => {
  it('should prioritize synth properties over window', () => {
    const synth = { time: 42, osc: spy() }
    hydraEval('osc(time)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(42)
  })

  it('should fallback to window for Math', () => {
    const synth = { osc: spy() }
    hydraEval('osc(Math.PI)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(Math.PI)
  })

  it('should allow access to console', () => {
    const synth = {}
    expect(() => hydraEval('console.log("test")', synth)).to.not.throw()
  })

  it('should resolve time dynamically after synth.time changes', () => {
    const synth = { time: 0 }
    const scope = Object.create(null)
    hydraEval('captured = () => time', synth, scope)
    synth.time = 42
    expect(scope.captured()).to.equal(42)
  })

  it('should resolve speed dynamically after synth.speed changes', () => {
    const synth = { speed: 1 }
    const scope = Object.create(null)
    hydraEval('captured = () => speed', synth, scope)
    synth.speed = 3
    expect(scope.captured()).to.equal(3)
  })

  it('should resolve bpm dynamically after synth.bpm changes', () => {
    const synth = { bpm: 30 }
    const scope = Object.create(null)
    hydraEval('captured = () => bpm', synth, scope)
    synth.bpm = 120
    expect(scope.captured()).to.equal(120)
  })

  it('should call chained methods', () => {
    const outSpy = spy()
    const oscResult = { out: outSpy }
    const synth = { osc: () => oscResult }
    hydraEval('osc(10, 0.2).out()', synth)
    expect(outSpy).to.have.been.calledOnce
  })

  it('should access source buffers', () => {
    const initSpy = spy()
    const synth = { s0: { init: initSpy } }
    hydraEval('s0.init({})', synth)
    expect(initSpy).to.have.been.calledOnceWith({})
  })

  it('should access audio properties', () => {
    const synth = { osc: spy(), a: { fft: [0.5, 0.3] } }
    hydraEval('osc(a.fft[0])', synth)
    expect(synth.osc).to.have.been.calledOnceWith(0.5)
  })

  it('should handle nested property access', () => {
    const synth = { osc: spy(), mouse: { x: 100, y: 200 } }
    hydraEval('osc(mouse.x, mouse.y)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(100, 200)
  })

  it('should handle method chaining with multiple calls', () => {
    const modulateSpy = spy()
    const outSpy = spy()
    const oscResult = { modulate: () => ({ out: outSpy }) }
    const synth = { osc: () => oscResult, modulate: modulateSpy }
    hydraEval('osc(10).modulate(osc(5)).out()', synth)
    expect(outSpy).to.have.been.calledOnce
  })

  describe('scope isolation (trap set)', () => {
    it('should not pollute synth with bare assignments', () => {
      const synth = { osc: spy() }
      hydraEval('x = 42; osc(x)', synth)
      expect(synth.x).to.be.undefined
      expect(synth.osc).to.have.been.calledOnceWith(42)
    })

    it('should sync speed assignment to synth', () => {
      const synth = { speed: 1 }
      hydraEval('speed = 2', synth)
      expect(synth.speed).to.equal(2)
    })

    it('should sync bpm assignment to synth', () => {
      const synth = { bpm: 30 }
      hydraEval('bpm = 120', synth)
      expect(synth.bpm).to.equal(120)
    })
  })

  describe('hydraEvalAsync', () => {
    it('should support async/await syntax', async () => {
      const synth = { osc: spy(), speed: 1 }
      await hydraEvalAsync('await Promise.resolve(); osc(42); speed = 3', synth)
      expect(synth.osc).to.have.been.calledOnceWith(42)
      expect(synth.speed).to.equal(3)
    })

    it('should return a promise', () => {
      const synth = {}
      const result = hydraEvalAsync('42', synth)
      expect(result).to.be.a('promise')
    })
  })

  describe('persistent scope', () => {
    it('should persist variables between evals with shared scope', () => {
      const synth = { osc: spy() }
      const scope = Object.create(null)
      hydraEval('myVar = 42', synth, scope)
      hydraEval('osc(myVar)', synth, scope)
      expect(synth.osc).to.have.been.calledOnceWith(42)
    })

    it('should allow function definitions to persist', () => {
      const synth = { osc: spy() }
      const scope = Object.create(null)
      hydraEval('myFunc = (x) => x * 2', synth, scope)
      hydraEval('osc(myFunc(21))', synth, scope)
      expect(synth.osc).to.have.been.calledOnceWith(42)
    })

    it('should isolate variables without shared scope', () => {
      const synth = { osc: spy() }
      hydraEval('myVar = 42', synth)
      hydraEval('osc(myVar)', synth)
      expect(synth.osc).to.have.been.calledOnceWith(undefined)
    })

    it('should not persist let declarations (block-scoped)', () => {
      const synth = { osc: spy() }
      const scope = Object.create(null)
      hydraEval('let myLet = 42', synth, scope)
      hydraEval('osc(myLet)', synth, scope)
      expect(synth.osc).to.have.been.calledOnceWith(undefined)
    })

    it('should not persist const declarations (block-scoped)', () => {
      const synth = { osc: spy() }
      const scope = Object.create(null)
      hydraEval('const myConst = 42', synth, scope)
      hydraEval('osc(myConst)', synth, scope)
      expect(synth.osc).to.have.been.calledOnceWith(undefined)
    })
  })
})
