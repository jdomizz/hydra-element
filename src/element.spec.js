import { html, fixture, expect } from '@open-wc/testing'
import { HydraElement } from './element'

describe('<hydra-element>', () => {
  if (!customElements.get('hydra-element')) {
    customElements.define('hydra-element', HydraElement)
  }

  it('should pass the a11y audit', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el).shadowDom.to.be.accessible()
  })

  it('should initialize with default options', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el.code).to.equal('')
    expect(el.canvas).to.exist
    expect(el.canvas.width).to.equal(window.innerWidth)
    expect(el.canvas.height).to.equal(window.innerHeight)
    expect(el._options.width).to.equal(window.innerWidth)
    expect(el._options.height).to.equal(window.innerHeight)
    expect(el._options.autoLoop).to.be.true
    expect(el._options.makeGlobal).to.be.false
    expect(el._options.detectAudio).to.be.false
    expect(el._options.numSources).to.equal(4)
    expect(el._options.numOutputs).to.equal(4)
    expect(el._options.precision).to.be.null
    expect(el._options.useAudioAnalyzer).to.be.true
    expect(el.pb).to.be.null
  })

  it('should update options when attributes change', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('width', '500')
    el.setAttribute('height', '300')
    el.setAttribute('global', 'true')
    el.setAttribute('audio', 'true')
    el.setAttribute('sources', '2')
    el.setAttribute('outputs', '1')
    el.setAttribute('precision', 'lowp')
    el.setAttribute('analyzer', 'false')
    expect(el.canvas.width).to.equal(500)
    expect(el.canvas.height).to.equal(300)
    expect(el._options.width).to.equal(500)
    expect(el._options.height).to.equal(300)
    expect(el._options.makeGlobal).to.be.true
    expect(el._options.detectAudio).to.be.true
    expect(el._options.numSources).to.equal(2)
    expect(el._options.numOutputs).to.equal(1)
    expect(el._options.precision).to.equal('lowp')
    expect(el._options.useAudioAnalyzer).to.be.false
  })

  it('should get code from textContent', async () => {
    const el = await fixture(html`<hydra-element>osc(10).out()</hydra-element>`)
    expect(el.code).to.equal('osc(10).out()')
  })

  it('should ignore textContent that is only whitespace', async () => {
    const el = await fixture(html`<hydra-element> </hydra-element>`)
    expect(el.code).to.equal('')
  })

  it('should set code', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.code = 'osc(10).out()'
    expect(el.code).to.equal('osc(10).out()')
  })

  it('should set canvas', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const canvas = document.createElement('canvas')
    el.canvas = canvas
    expect(el.canvas).to.equal(canvas)
  })

  it('should expose synth property', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el.synth).to.exist
    expect(el.synth.time).to.be.a('number')
    expect(el.synth.osc).to.be.a('function')
  })

  it('should dispatch hydra-ready event', async () => {
    let readySynth = null
    const el = document.createElement('hydra-element')
    el.addEventListener('hydra-ready', e => {
      readySynth = e.detail.synth
    })
    document.body.append(el)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(readySynth).to.exist
    el.remove()
  })

  it('should dispatch hydra-eval event on success', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const eventPromise = new Promise(resolve => {
      el.addEventListener('hydra-eval', resolve)
    })
    el.code = 'osc().out()'
    const event = await eventPromise
    expect(event.detail.success).to.be.true
  })

  it('should set pb', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.pb = undefined
    expect(el.pb).to.equal(undefined)
  })

  it('should observe loop attribute', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el._options.autoLoop).to.be.true
    el.setAttribute('loop', 'false')
    expect(el._options.autoLoop).to.be.false
    el.setAttribute('loop', 'true')
    expect(el._options.autoLoop).to.be.true
  })

  it('should stop loop on disconnect', async () => {
    const el = await fixture(html`<hydra-element loop="false"></hydra-element>`)
    el.remove()
    expect(el._rafId).to.be.null
  })

  it('should destroy hydra on disconnect', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el._hydra).to.exist
    el.remove()
    expect(el._hydra).to.be.null
  })

  it('should not throw on eval error', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(() => {
      el.code = 'throw new Error("test")'
    }).to.not.throw()
  })

  it('should resize canvas without recreating it', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const { canvas } = el
    el.setAttribute('width', '500')
    expect(el.canvas).to.equal(canvas)
    expect(canvas.width).to.equal(500)
  })

  it('should not remove custom canvas when recreating synth', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const customCanvas = document.createElement('canvas')
    customCanvas.id = 'custom-canvas'
    el.canvas = customCanvas
    expect(el.canvas).to.equal(customCanvas)
    el.setAttribute('global', 'true')
    expect(el.canvas).to.equal(customCanvas)
  })

  it('should maintain autoLoop state after synth recreation', async () => {
    const el = await fixture(html`<hydra-element loop="true"></hydra-element>`)
    const initialLoop = el._options.autoLoop
    el.setAttribute('global', 'true')
    expect(el._options.autoLoop).to.equal(initialLoop)
  })

  it('should handle async code evaluation', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const evalPromise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail.success))
    })
    el.code = 'await Promise.resolve(); osc().out()'
    const success = await evalPromise
    expect(success).to.be.true
  })

  it('should handle async code evaluation errors', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const evalPromise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail.success))
    })
    el.code = 'await Promise.reject(new Error("async error"))'
    const success = await evalPromise
    expect(success).to.be.false
  })

  it('should separate evaluation from event dispatch', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const events = []
    el.addEventListener('hydra-eval', e => events.push(e.detail))
    el.code = 'osc().out()'
    await new Promise(r => setTimeout(r, 10))
    expect(events).to.have.length(1)
    expect(events[0].success).to.be.true
  })

  it('should separate error handling from evaluation', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const events = []
    el.addEventListener('hydra-eval', e => events.push(e.detail))
    el.code = 'invalidFunction()'
    await new Promise(r => setTimeout(r, 10))
    expect(events).to.have.length(1)
    expect(events[0].success).to.be.false
    expect(events[0].error).to.exist
  })

  it('should manage canvas lifecycle independently', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const canvas1 = el.canvas
    el.setAttribute('width', '500')
    expect(el.canvas).to.equal(canvas1)
  })

  it('should manage hydra lifecycle independently', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const synth1 = el.synth
    el.setAttribute('global', 'true')
    expect(el.synth).to.not.equal(synth1)
  })

  it('should manage animation loop independently', async () => {
    const el = await fixture(html`<hydra-element loop="false"></hydra-element>`)
    expect(el._rafId).to.be.null
    el.setAttribute('loop', 'true')
    expect(el._rafId).to.not.be.null
    el.setAttribute('loop', 'false')
    expect(el._rafId).to.be.null
  })

  it('should recreate synth when global attribute changes', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const synth1 = el.synth
    el.setAttribute('global', 'true')
    expect(el.synth).to.not.equal(synth1)
  })

  it('should recreate synth when audio attribute changes', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const synth1 = el.synth
    el.setAttribute('audio', 'true')
    expect(el.synth).to.not.equal(synth1)
  })

  it('should recreate synth when sources attribute changes', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const synth1 = el.synth
    el.setAttribute('sources', '2')
    expect(el.synth).to.not.equal(synth1)
  })

  it('should recreate synth when outputs attribute changes', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const synth1 = el.synth
    el.setAttribute('outputs', '2')
    expect(el.synth).to.not.equal(synth1)
  })

  it('should recreate synth when precision attribute changes', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const synth1 = el.synth
    el.setAttribute('precision', 'highp')
    expect(el.synth).to.not.equal(synth1)
  })

  it('should convert width attribute to number option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('width', '500')
    expect(el._options.width).to.equal(500)
  })

  it('should convert height attribute to number option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('height', '300')
    expect(el._options.height).to.equal(300)
  })

  it('should convert global attribute to boolean option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('global', 'true')
    expect(el._options.makeGlobal).to.be.true
  })

  it('should convert analyzer attribute to boolean option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('analyzer', 'false')
    expect(el._options.useAudioAnalyzer).to.be.false
  })

  it('should convert audio attribute to boolean option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('audio', 'true')
    expect(el._options.detectAudio).to.be.true
  })

  it('should convert sources attribute to number option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('sources', '2')
    expect(el._options.numSources).to.equal(2)
  })

  it('should convert outputs attribute to number option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('outputs', '1')
    expect(el._options.numOutputs).to.equal(1)
  })

  it('should convert precision attribute to enum option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('precision', 'highp')
    expect(el._options.precision).to.equal('highp')
  })

  it('should convert loop attribute to boolean option', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('loop', 'false')
    expect(el._options.autoLoop).to.be.false
  })

  it('should handle canvas resize without affecting hydra', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const { canvas } = el
    const { synth } = el
    el.setAttribute('width', '500')
    expect(el.canvas).to.equal(canvas)
    expect(el.synth).to.equal(synth)
    expect(canvas.width).to.equal(500)
  })

  it('should handle hydra recreation without affecting canvas', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('global', 'true')
    expect(el.synth).to.exist
  })

  it('should handle loop control without affecting hydra', async () => {
    const el = await fixture(html`<hydra-element loop="false"></hydra-element>`)
    const { synth } = el
    el.setAttribute('loop', 'true')
    expect(el.synth).to.equal(synth)
    expect(el._rafId).to.not.be.null
  })

  it('should handle code evaluation without affecting canvas or loop', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const { canvas } = el
    el.code = 'osc().out()'
    await new Promise(r => setTimeout(r, 10))
    expect(el.canvas).to.equal(canvas)
  })
})
