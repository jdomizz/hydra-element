import { fixture, expect, html } from '@open-wc/testing'
import { HydraElement } from './element'
import { createHydraElement } from './test-helpers'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

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
