import { html, fixture, expect } from '@open-wc/testing'
import { HydraElement } from './element.js'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

describe('Community extensions compatibility', () => {
  // Pattern 1: loadScript + setFunction (metagrowing, geikha)
  describe('Pattern 1: loadScript + setFunction', () => {
    it('simulated extension with setFunction', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })

      // Simulate what metagrowing/geikha extensions do
      const extensionCode = `
        setFunction({
          name: 'turb',
          type: 'src',
          inputs: [
            { type: 'float', name: 'freq', default: 3 },
            { type: 'float', name: 'offset', default: 0 }
          ],
          glsl: \`return vec4(sin(freq*_st.x + offset), cos(freq*_st.y), 0.5, 1.0);\`
        })
      `

      el.code = `
        ${extensionCode}
        turb(3, 0).out(o0)
      `

      const detail = await promise
      expect(detail.success).to.be.true
      expect(el.synth.turb).to.be.a('function')
    })
  })

  // Pattern 2: loadScript + custom init function
  describe('Pattern 2: loadScript + init function', () => {
    it('simulated extension with init function', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })

      // Simulate what hydra-strudel does
      el.code = `
        window.initMyExtension = async () => {
          setFunction({
            name: 'myFunc',
            type: 'src',
            inputs: [],
            glsl: 'return vec4(1.0, 0.0, 0.0, 1.0);'
          })
        }
        await initMyExtension()
        myFunc().out()
      `

      const detail = await promise
      expect(detail.success).to.be.true
      expect(window.initMyExtension).to.be.a('function')
      expect(el.synth.myFunc).to.be.a('function')
    })
  })

  // Pattern 3: loadScript + global functions (hydra-midi)
  describe('Pattern 3: loadScript exposes globals', () => {
    it('simulated extension exposes global functions', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })

      // Simulate what hydra-midi does
      el.code = `
        window.midi = () => 0.5
        window.cc = () => 0.3
        window.note = () => 0.7
        osc().out()
      `

      const detail = await promise
      expect(detail.success).to.be.true
      expect(window.midi).to.be.a('function')
      expect(window.cc).to.be.a('function')
      expect(window.note).to.be.a('function')
    })
  })

  // Pattern 4: loadScript + window._hydra access (shader-park) —
  // window._hydra is transiently bridged while the script loads,
  // then restored. Assertions target both states.
  describe('Pattern 4: loadScript + window._hydra access', () => {
    it('bridges window._hydra during loadScript and restores it afterwards', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      await el.ready
      const scriptUrl = `data:text/javascript,${encodeURIComponent(
        'if (typeof window._hydra === "undefined") throw new Error("no bridge");' +
          'if (typeof window.synth.setFunction !== "function") throw new Error("no setFunction");' +
          'window._sawBridge = true;'
      )}`
      await el.loadScript(scriptUrl)
      expect(window._sawBridge).to.be.true
      expect(window._hydra).to.be.undefined
      expect(window.synth).to.be.undefined
      delete window._sawBridge
    })

    it('extensions can reach window._hydra via global="true"', async () => {
      const _el = await fixture(html`<hydra-element global="true"></hydra-element>`)
      expect(window._hydra).to.exist
      expect(window._hydra.synth).to.exist
      expect(window._hydra.canvas).to.exist
      expect(window._hydra.sandbox).to.exist
    })
  })

  // Pattern 5: loadScript for creative coding libs (p5.js, three.js)
  describe('Pattern 5: Creative coding libraries', () => {
    it('simulated p5.js-like library loads', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })

      // Simulate loading a library that exposes a global
      el.code = `
        window.p5 = { version: '1.7.0' }
        osc().out()
      `

      const detail = await promise
      expect(detail.success).to.be.true
      expect(window.p5).to.exist
    })
  })

  // Pattern 6: setFunction inside code (DSL compatibility)
  describe('Pattern 6: setFunction inside code', () => {
    it('setFunction works without synth. prefix', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })

      el.code = `
        setFunction({
          name: 'myCustomFunc',
          type: 'src',
          inputs: [
            { type: 'float', name: 'freq', default: 10 }
          ],
          glsl: \`return vec4(sin(freq*_st.x), 0.5, 0.5, 1.0);\`
        })
        myCustomFunc(5).out()
      `

      const detail = await promise
      expect(detail.success).to.be.true
      expect(el.synth.myCustomFunc).to.be.a('function')
    })
  })

  // Pattern 7: Direct synth access
  describe('Pattern 7: Direct synth access', () => {
    it('synth.setFunction works', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      const promise = new Promise(resolve => {
        el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
      })

      el.code = `
        synth.setFunction({
          name: 'anotherFunc',
          type: 'src',
          inputs: [],
          glsl: 'return vec4(1.0, 0.0, 0.0, 1.0);'
        })
        anotherFunc().out()
      `

      const detail = await promise
      expect(detail.success).to.be.true
      expect(el.synth.anotherFunc).to.be.a('function')
    })

    it('window.synth.setFunction works (global="true" fixture)', async () => {
      const el = await fixture(html`<hydra-element global="true"></hydra-element>`)

      window.synth.setFunction({
        name: 'globalFunc',
        type: 'src',
        inputs: [],
        glsl: 'return vec4(0.0, 1.0, 0.0, 1.0);',
      })

      expect(el.synth.globalFunc).to.be.a('function')
    })
  })
})
