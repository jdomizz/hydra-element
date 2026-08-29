import { fixture, expect, html } from '@open-wc/testing'
import { HydraElement } from './element'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

async function createHydraElement(code = '') {
  const el = await fixture(html`<hydra-element>${code}</hydra-element>`)
  await new Promise(resolve => {
    if (el.synth) {
      resolve()
    } else {
      el.addEventListener('hydra-ready', () => resolve(), { once: true })
    }
  })
  return el
}

describe('integration', () => {
  it('should initialize canvas and synth', async () => {
    const el = await createHydraElement('solid(1, 0, 0, 1).out()')
    expect(el.canvas).to.exist
    expect(el.synth).to.exist
  })

  it('should expose synth with working DSL methods', async () => {
    const el = await createHydraElement()
    expect(el.synth.osc).to.be.a('function')
    expect(el.synth.solid).to.be.a('function')
    expect(el.synth.s0).to.exist
    expect(el.synth.o0).to.exist
  })

  it('should allow setting custom functions via synth.setFunction', async () => {
    const el = await createHydraElement()
    el.synth.setFunction({
      name: 'customSrc',
      type: 'src',
      inputs: [],
      glsl: `return vec4(1.0, 0.0, 0.0, 1.0);`,
    })
    expect(el.synth.customSrc).to.be.a('function')
  })

  it('should evaluate code without errors', async () => {
    const el = await createHydraElement()
    const evalPromise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail.success), { once: true })
    })
    el.code = 'solid(1, 0, 0, 1).out()'
    const success = await evalPromise
    expect(success).to.be.true
  })
})

describe('multi-instance', () => {
  it('should create independent synth instances', async () => {
    const el1 = await createHydraElement()
    const el2 = await createHydraElement()
    expect(el1.synth).to.not.equal(el2.synth)
  })

  it('should maintain separate code per element', async () => {
    const el1 = await createHydraElement('solid(1, 0, 0, 1).out()')
    const el2 = await createHydraElement('solid(0, 0, 1, 1).out()')
    expect(el1.code).to.equal('solid(1, 0, 0, 1).out()')
    expect(el2.code).to.equal('solid(0, 0, 1, 1).out()')
  })

  it('should not share canvas between elements', async () => {
    const el1 = await createHydraElement()
    const el2 = await createHydraElement()
    expect(el1.canvas).to.not.equal(el2.canvas)
  })

  it('should handle multiple elements on same page', async () => {
    const container = await fixture(html`
      <div>
        <hydra-element>solid(1, 0, 0, 1).out()</hydra-element>
        <hydra-element>solid(0, 1, 0, 1).out()</hydra-element>
        <hydra-element>solid(0, 0, 1, 1).out()</hydra-element>
      </div>
    `)
    const elements = container.querySelectorAll('hydra-element')
    expect(elements.length).to.equal(3)
    elements.forEach(el => {
      expect(el.synth).to.exist
      expect(el.canvas).to.exist
    })
  })
})
