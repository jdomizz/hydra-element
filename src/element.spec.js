import { html, fixture, expect } from '@open-wc/testing'
import sinon from 'sinon'
import { HydraElement, injectFoucGuard } from './element'
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

  it('exposes window._hydra and window.synth persistently in global mode', async () => {
    const el = await fixture(html`<hydra-element global="true"></hydra-element>`)
    expect(window._hydra).to.exist
    expect(window._hydra).to.equal(el.hydraManager.hydra)
    expect(window.synth).to.exist
    expect(window.synth).to.equal(el.hydraManager.hydra.synth)
    expect(window._hydra.synth).to.exist
    expect(window._hydra.canvas).to.exist
    expect(window._hydra.sandbox).to.exist
    expect(window._hydra.loadScript).to.be.a('function')
    expect(window._hydra.setResolution).to.be.a('function')
    expect(window.synth.setFunction).to.be.a('function')
  })

  it('does not pollute window in non-global mode', async () => {
    delete window._hydra
    delete window.synth
    delete window.osc
    delete window.setFunction
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready
    expect(window._hydra).to.be.undefined
    expect(window.synth).to.be.undefined
    expect(window.osc).to.be.undefined
    expect(window.setFunction).to.be.undefined
    el.remove()
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

  it('restores window globals after loadScript settles', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready
    const scriptUrl = `data:text/javascript,${encodeURIComponent('/* noop */')}`
    await el.loadScript(scriptUrl)
    expect(window._hydra).to.be.undefined
    expect(window.synth).to.be.undefined
    expect(window.setFunction).to.be.undefined
  })

  it('restores pre-existing window values after loadScript', async () => {
    window.render = 'app-render'
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready
    await el.loadScript('data:text/javascript,/* noop */')
    expect(window.render).to.equal('app-render')
    delete window.render
  })

  it('restores globals when the script fails to load', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready
    sinon.stub(el.hydraManager.hydra, 'loadScript').rejects(new Error('boom'))
    let caught
    try {
      await el.loadScript('https://example.com/nope.js')
    } catch (e) {
      caught = e
    } finally {
      el.hydraManager.hydra.loadScript.restore()
    }
    expect(caught).to.exist
    expect(caught.message).to.equal('boom')
    expect(window._hydra).to.be.undefined
    expect(window.synth).to.be.undefined
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

  it('re-applies transforms after a synth reset', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.transforms = [
      {
        name: 'myNoise',
        type: 'src',
        inputs: [{ name: 'scale', type: 'float', default: 5 }],
        glsl: 'return vec4(vec3(0.5), 1.0);',
      },
    ]
    expect(el.synth.myNoise).to.be.a('function')
    el.setAttribute('sources', '2')
    await wait(10)
    expect(el.synth.myNoise, 'after reset').to.be.a('function')
  })
})

describe('FOUC guard', () => {
  it('is present in document.head after module load', () => {
    const style = document.head.querySelector('style[data-hydra-fouc]')
    expect(style).to.exist
    expect(style.textContent).to.include(':not(:defined)')
    expect(style.textContent).to.include('hydra-element')
  })

  it('is idempotent — duplicate calls do not add a second <style>', () => {
    const before = document.head.querySelectorAll('style[data-hydra-fouc]').length
    injectFoucGuard()
    injectFoucGuard()
    const after = document.head.querySelectorAll('style[data-hydra-fouc]').length
    expect(after).to.equal(before)
  })
})
