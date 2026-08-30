import { expect } from '@open-wc/testing'
import { HydraElement } from './element'
import { createHydraElement } from './test-helpers'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

describe('integration', () => {
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
