import { expect } from '@open-wc/testing'
import { HydraManager } from './hydra'

function makeManager() {
  return new HydraManager({
    host: document.createElement('div'),
    options: { width: 100, height: 100 },
    scope: Object.create(null),
  })
}

const EVAL_CASES = [
  ['sync success', 'osc().out()', true],
  ['sync error', 'throw new Error("boom")', false],
  ['async success', 'await Promise.resolve(); osc().out()', true],
  ['async error', 'await Promise.reject(new Error("async boom"))', false],
]

describe('HydraManager', () => {
  it('creates a hydra instance and exposes its synth', () => {
    const manager = makeManager()
    manager.init()
    expect(manager.hydra).to.exist
    expect(manager.synth).to.exist
    expect(manager.synth.osc).to.be.a('function')
  })

  it('dispatches hydra-ready with the synth on init', async () => {
    const manager = makeManager()
    const promise = new Promise(resolve => {
      manager.host.addEventListener('hydra-ready', e => resolve(e.detail), { once: true })
    })
    manager.init()
    const detail = await promise
    expect(detail.synth).to.equal(manager.synth)
  })

  it('binds loadScript on the scope when available', () => {
    const manager = makeManager()
    manager.init()
    expect(manager.scope.loadScript).to.be.a('function')
  })

  for (const [label, code, success] of EVAL_CASES) {
    it(`dispatches hydra-eval for ${label}`, async () => {
      const manager = makeManager()
      manager.init()
      const promise = new Promise(resolve => {
        manager.host.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })
      manager.evaluate(code)
      const detail = await promise
      expect(detail.success).to.equal(success)
      if (!success) expect(detail.error).to.exist
    })
  }

  it('destroy clears sources and drops the instance', () => {
    const manager = makeManager()
    manager.init()
    manager.destroy()
    expect(manager.hydra).to.equal(null)
    expect(manager.synth).to.be.undefined
  })

  it('tick advances the synth clock via public API', () => {
    const manager = makeManager()
    manager.init()
    const t0 = manager.synth.time
    manager.tick(50)
    expect(manager.synth.time).to.be.greaterThan(t0)
  })

  it('setResolution updates the synth size via public API', () => {
    const manager = makeManager()
    manager.init()
    manager.setResolution(640, 480)
    expect(manager.synth.width).to.equal(640)
    expect(manager.synth.height).to.equal(480)
  })
})
