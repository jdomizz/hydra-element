/**
 * Browser-lane spec for the hydra runtime's event behavior — the event half of
 * the old `hydra.spec.js`. The engine behaviors (init, `s`/`o`, destroy, tick,
 * setResolution) live in the Node lane (`core.spec.ts`). Here a minimal host (a
 * real element with the runtime's expected seams) + a fake engine factory
 * exercise `hydra-ready`, `hydra-eval`, and the scope `loadScript` binding.
 */
import { expect } from '@open-wc/testing'
import { setDefaultHydraFactory } from '../core'
import { HydraRuntime } from './runtime'

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

const osc = () => ({ out: () => {} })

function makeFakeHydra() {
  const synth = {
    osc,
    time: 0,
    bpm: 30,
    speed: 1,
    fps: 0,
    setResolution() {},
    setFunction() {},
  }
  return {
    synth,
    s: Array.from({ length: 4 }, () => ({ clear() {} })),
    o: Array.from({ length: 4 }),
    loadScript: () => Promise.resolve(),
    tick() {},
    getAudio: () => ({ stop() {} }),
  }
}

/**
 * A real `<div>` (so MutationObserver + event dispatch work) extended with the
 * runtime's expected host seams. Left unappended so `isConnected` is false —
 * the loop never starts and no teardown leaks a rAF.
 */
function makeHost() {
  const host = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  Object.assign(host, {
    seedCode: '',
    canvas,
    canvasManager: { tagAnalyzerCanvases() {} },
    notifyReady() {},
  })
  return host
}

describe('HydraRuntime', () => {
  afterEach(() => {
    setDefaultHydraFactory(null)
  })

  it('dispatches hydra-ready with the synth on attach', async () => {
    setDefaultHydraFactory(() => makeFakeHydra())
    const host = makeHost()
    const runtime = new HydraRuntime()
    const promise = new Promise(resolve => {
      host.addEventListener('hydra-ready', e => resolve(e.detail), { once: true })
    })
    runtime.attach(host)
    const detail = await promise
    expect(detail.synth).to.equal(runtime.synth)
    runtime.destroy()
  })

  it('binds loadScript on the scope', () => {
    setDefaultHydraFactory(() => makeFakeHydra())
    const host = makeHost()
    const runtime = new HydraRuntime()
    runtime.attach(host)
    expect(runtime.scope.loadScript).to.be.a('function')
    runtime.destroy()
  })

  for (const [label, code, success, line] of EVAL_CASES) {
    it(`dispatches hydra-eval for ${label}`, async () => {
      setDefaultHydraFactory(() => makeFakeHydra())
      const host = makeHost()
      const runtime = new HydraRuntime()
      runtime.attach(host)
      const promise = new Promise(resolve => {
        host.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })
      runtime.code = code
      const detail = await promise
      expect(detail.success).to.equal(success)
      if (success) {
        expect('line' in detail).to.equal(false)
      } else {
        expect(detail.error).to.exist
        expect(detail.line).to.equal(line)
      }
      runtime.destroy()
    })
  }
})
