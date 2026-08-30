import { html, fixture, expect } from '@open-wc/testing'
import sinon from 'sinon'
import { HydraElement } from './element'
import { wait } from './test-helpers'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

const SYNTH_CONFIG_VALUES = {
  global: 'true',
  audio: 'true',
  sources: '2',
  outputs: '1',
  precision: 'lowp',
}
const SYNTH_CONFIG_ATTRS = Object.keys(SYNTH_CONFIG_VALUES)

const CONVERSION_CASES = [
  ['width', '500', 'size'],
  ['height', '300', 'size'],
  ...SYNTH_CONFIG_ATTRS.map(attr => [attr, SYNTH_CONFIG_VALUES[attr], 'synth-config']),
  ['loop', 'false', 'loop'],
]

const EVAL_CASES = [
  ['sync success', 'osc().out()', true],
  ['sync error', 'throw new Error("boom")', false],
  ['async success', 'await Promise.resolve(); osc().out()', true],
  ['async error', 'await Promise.reject(new Error("async boom"))', false],
]

describe('<hydra-element>', () => {
  it('passes the a11y audit', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el).shadowDom.to.be.accessible()
  })

  it('exposes code, canvas, and synth', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el.code).to.equal('')
    expect(el.canvas).to.exist
    expect(el.synth).to.exist
    expect(el.synth.osc).to.be.a('function')
  })

  it('reads code from textContent', async () => {
    const el = await fixture(html`<hydra-element>osc(10).out()</hydra-element>`)
    expect(el.code).to.equal('osc(10).out()')
  })

  it('ignores whitespace-only textContent', async () => {
    const el = await fixture(html`<hydra-element> </hydra-element>`)
    expect(el.code).to.equal('')
  })

  it('preserves a custom canvas across synth recreation', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const customCanvas = document.createElement('canvas')
    el.canvas = customCanvas
    expect(el.canvas).to.equal(customCanvas)
    el.setAttribute('global', 'true')
    await wait(10)
    expect(el.canvas).to.equal(customCanvas)
  })

  it('sizes the canvas from width/height attributes', async () => {
    const el = await fixture(html`<hydra-element width="500" height="300"></hydra-element>`)
    expect(el.canvas.width).to.equal(500)
    expect(el.canvas.height).to.equal(300)
  })

  it('resizes the canvas without recreating the synth', async () => {
    const el = await fixture(html`<hydra-element width="640"></hydra-element>`)
    const { canvas, synth } = el
    el.setAttribute('width', '800')
    expect(el.canvas).to.equal(canvas)
    expect(el.synth).to.equal(synth)
    expect(canvas.width).to.equal(800)
  })

  it('recreates the synth when synth-config attributes change', async () => {
    for (const attr of SYNTH_CONFIG_ATTRS) {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const synth1 = el.synth
      el.setAttribute(attr, SYNTH_CONFIG_VALUES[attr])
      await wait(10)
      expect(el.synth, `attr ${attr}`).to.not.equal(synth1)
    }
  })

  it('converts each attribute to its observable effect', async () => {
    for (const [attr, value, kind] of CONVERSION_CASES) {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const synth1 = el.synth
      if (kind === 'loop') {
        const before = el.synth.time
        el.setAttribute(attr, value)
        await wait(60)
        expect(el.synth.time, `attr ${attr}`).to.equal(before)
      } else {
        el.setAttribute(attr, value)
        if (kind === 'size') {
          expect(el.canvas[attr], `attr ${attr}`).to.equal(Number(value))
          expect(el.synth, `attr ${attr}`).to.equal(synth1)
        } else {
          await wait(10)
          expect(el.synth, `attr ${attr}`).to.not.equal(synth1)
        }
      }
    }
  })

  it('advances time while looping', async () => {
    const el = await fixture(html`<hydra-element loop="true"></hydra-element>`)
    const t0 = el.synth.time
    await wait(60)
    expect(el.synth.time).to.be.greaterThan(t0)
  })

  it('stalls time when the loop is off', async () => {
    const el = await fixture(html`<hydra-element loop="false"></hydra-element>`)
    const t0 = el.synth.time
    await wait(60)
    expect(el.synth.time).to.equal(t0)
  })

  it('stalls time when disconnected', async () => {
    const el = await fixture(html`<hydra-element loop="true"></hydra-element>`)
    const { synth } = el
    const t0 = synth.time
    el.remove()
    await wait(60)
    expect(synth.time).to.equal(t0)
  })

  it('dispatches hydra-ready with the synth instance', async () => {
    const el = document.createElement('hydra-element')
    const promise = new Promise(resolve => {
      el.addEventListener('hydra-ready', e => resolve(e.detail), { once: true })
    })
    document.body.append(el)
    const { synth } = await promise
    expect(synth).to.exist
    el.remove()
  })

  it('resolves the ready promise even after hydra-ready has fired', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const { synth } = await el.ready
    expect(synth).to.equal(el.synth)
  })

  it('exposes window._hydra and window.synth for community extensions compatibility', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(window._hydra).to.exist
    expect(window._hydra).to.equal(el.hydraManager.hydra)
    expect(window.synth).to.exist
    expect(window.synth).to.equal(el.hydraManager.hydra.synth)
    // Verify they have the properties extensions expect
    expect(window._hydra.synth).to.exist
    expect(window._hydra.canvas).to.exist
    expect(window._hydra.sandbox).to.exist
    expect(window._hydra.loadScript).to.be.a('function')
    expect(window._hydra.setResolution).to.be.a('function')
    expect(window.synth.setFunction).to.be.a('function')
  })

  it('allows setFunction inside code', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const promise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
    })
    el.code = `
      setFunction({
        name: 'customOsc',
        type: 'src',
        inputs: [
          { type: 'float', name: 'freq', default: 10 },
          { type: 'float', name: 'sync', default: 0.1 }
        ],
        glsl: \`return vec4(sin(freq*_st.x), cos(sync*_st.y), 0.5, 1.0);\`
      })
      customOsc(5, 0.2).out()
    `
    const detail = await promise
    expect(detail.success).to.be.true
    // Verify the function was added
    expect(el.synth.customOsc).to.be.a('function')
  })

  it('supports loadScript inside code', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const promise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
    })
    // Use a data URL to load a simple script that adds a function
    const scriptCode =
      'window._testExtension = true; setFunction({ name: "testFunc", type: "src", inputs: [], glsl: "return vec4(1.0, 0.0, 0.0, 1.0);" });'
    const scriptUrl = `data:text/javascript,${encodeURIComponent(scriptCode)}`
    el.code = `
      await loadScript('${scriptUrl}')
      testFunc().out()
    `
    const detail = await promise
    expect(detail.success).to.be.true
    expect(window._testExtension).to.be.true
    expect(el.synth.testFunc).to.be.a('function')
    // Cleanup
    delete window._testExtension
  })

  for (const [label, code, success] of EVAL_CASES) {
    it(`dispatches hydra-eval for ${label}`, async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })
      el.code = code
      const detail = await promise
      expect(detail.success).to.equal(success)
      if (!success) expect(detail.error).to.exist
    })
  }

  it('dispatches a single hydra-eval event per evaluation', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const details = []
    el.addEventListener('hydra-eval', e => details.push(e.detail))
    el.code = 'osc().out()'
    await wait(10)
    expect(details).to.have.length(1)
    expect(details[0].success).to.be.true
  })

  it('destroy tears down the synth and resets state', async () => {
    const el = await fixture(html`<hydra-element>osc().out()</hydra-element>`)
    const s1 = el.synth
    expect(s1).to.exist
    el.destroy()
    expect(el.synth).to.be.undefined
    expect(el.hydraManager).to.be.null
  })

  it('destroy allows a fresh reconnect', async () => {
    const el = await fixture(html`<hydra-element>osc().out()</hydra-element>`)
    const s1 = el.synth
    el.destroy()
    document.body.append(el)
    await wait(10)
    expect(el.synth).to.exist
    expect(el.synth).to.not.equal(s1)
    el.remove()
  })

  it('restores the default loop when the attribute is removed', async () => {
    const el = await fixture(html`<hydra-element loop="false"></hydra-element>`)
    const t0 = el.synth.time
    el.removeAttribute('loop')
    await wait(60)
    expect(el.synth.time).to.be.greaterThan(t0)
  })
})
