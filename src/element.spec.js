import { html, fixture, expect } from '@open-wc/testing'
import { spy } from 'sinon'
import { HydraElement } from './element'

describe('<hydra-element>', () => {

  window.customElements.define('hydra-element', HydraElement)

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
    expect(el._options.makeGlobal).to.be.true
    expect(el._options.detectAudio).to.be.false
    expect(el._options.numSources).to.equal(4)
    expect(el._options.numOutputs).to.equal(4)
    expect(el._options.precision).to.be.null
    expect(el.transforms).to.deep.equal([])
    expect(el.pb).to.be.null
  })

  it('should update options when attributes change', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.setAttribute('width', '500')
    el.setAttribute('height', '300')
    el.setAttribute('global', 'false')
    el.setAttribute('audio', 'true')
    el.setAttribute('sources', '2')
    el.setAttribute('outputs', '1')
    el.setAttribute('precision', 'lowp')
    expect(el.canvas.width).to.equal(500)
    expect(el.canvas.height).to.equal(300)
    expect(el._options.width).to.equal(500)
    expect(el._options.height).to.equal(300)
    expect(el._options.makeGlobal).to.be.false
    expect(el._options.detectAudio).to.be.true
    expect(el._options.numSources).to.equal(2)
    expect(el._options.numOutputs).to.equal(1)
    expect(el._options.precision).to.equal('lowp')
  })
  
  it('should get code from textContent', async () => {
    const el = await fixture(html`<hydra-element>osc(10).out()</hydra-element>`)
    expect(el.code).to.equal('osc(10).out()')
  })

  it('should set code property', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.code = 'osc(10).out()'
    expect(el.code).to.equal('osc(10).out()')
  })

  it('should set canvas property', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const canvas = document.createElement('canvas')
    el.canvas = canvas
    expect(el.canvas).to.equal(canvas)
  })

  it('should set transforms property', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const fn = {
      name: 'yourNoise',
      type: 'src',
      inputs: [
        { type: 'float', name: 'scale', default: 5 },
        { type: 'float', name: 'offset', default: 0.5 }
      ],
      glsl: `return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);`
    }
    el.transforms = [fn]
    expect(el.transforms).to.deep.equal([fn])
  })

  it('should set pb property', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    el.pb = undefined
    expect(el.pb).to.equal(undefined)
  })

  it('should tick hydra when tick method is called', async () => {
    const el = await fixture(html`<hydra-element loop="false"></hydra-element>`)
    el._hydra = { tick: spy() }
    el.tick(0.1)
    expect(el._hydra.tick).to.have.been.calledOnceWith(0.1)
  })

})