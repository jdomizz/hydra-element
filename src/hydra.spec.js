import { expect } from '@open-wc/testing'
import { HydraManager } from './hydra'

function makeManager() {
  const host = document.createElement('div')
  const manager = new HydraManager({
    host,
    options: { width: 100, height: 100 },
    scope: Object.create(null),
  })
  return { host, manager }
}

// [label, code, success, expectedLine] — expectedLine only applies to
// failures (`undefined` = the error carries no parseable position).
const EVAL_CASES = [
  ['sync success', 'osc().out()', true],
  ['sync error', 'throw new Error("boom")', false, 1],
  ['async success', 'await Promise.resolve(); osc().out()', true],
  ['async error', 'await Promise.reject(new Error("async boom"))', false, 1],
  ['multiline sync error', 'const a = 1\nconst b = 2\nthrow new Error("boom")', false, 3],
  [
    'multiline async error',
    'const a = 1\nawait Promise.resolve()\nawait Promise.reject(new Error("async boom"))',
    false,
    3,
  ],
  ['error without parseable position', 'await Promise.reject("plain string")', false, undefined],
]

describe('HydraManager', () => {
  it('creates a hydra instance and exposes its synth', () => {
    const { manager } = makeManager()
    manager.init()
    expect(manager.synth).to.exist
    expect(manager.synth.osc).to.be.a('function')
  })

  it('dispatches hydra-ready with the synth on init', async () => {
    const { manager, host } = makeManager()
    const promise = new Promise(resolve => {
      host.addEventListener('hydra-ready', e => resolve(e.detail), { once: true })
    })
    manager.init()
    const detail = await promise
    expect(detail.synth).to.equal(manager.synth)
  })

  it('binds loadScript on the scope when available', () => {
    const { manager } = makeManager()
    manager.init()
    expect(manager.scope.loadScript).to.be.a('function')
  })

  for (const [label, code, success, line] of EVAL_CASES) {
    it(`dispatches hydra-eval for ${label}`, async () => {
      const { manager, host } = makeManager()
      manager.init()
      const promise = new Promise(resolve => {
        host.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })
      manager.evaluate(code)
      const detail = await promise
      expect(detail.success).to.equal(success)
      if (success) {
        expect('line' in detail).to.equal(false)
      } else {
        expect(detail.error).to.exist
        expect(detail.line).to.equal(line)
      }
    })
  }

  it('destroy clears sources and drops the instance', () => {
    const { manager } = makeManager()
    manager.init()
    manager.destroy()
    expect(manager.synth).to.be.undefined
  })

  it('tick advances the synth clock via public API', () => {
    const { manager } = makeManager()
    manager.init()
    const t0 = manager.synth.time
    manager.tick(50)
    expect(manager.synth.time).to.be.greaterThan(t0)
  })

  it('setResolution updates the synth size via public API', () => {
    const { manager } = makeManager()
    manager.init()
    manager.setResolution(640, 480)
    expect(manager.synth.width).to.equal(640)
    expect(manager.synth.height).to.equal(480)
  })

  it('exposes the sources array as `s` and outputs as `o` on the synth', () => {
    const { manager } = makeManager()
    manager.init()
    expect(manager.synth.s).to.be.an('array')
    expect(manager.synth.s.length).to.equal(4)
    expect(manager.synth.s[0]).to.equal(manager.synth.s0)
    expect(manager.synth.o).to.be.an('array')
    expect(manager.synth.o.length).to.equal(4)
    expect(manager.synth.o[0]).to.equal(manager.synth.o0)
  })
})
