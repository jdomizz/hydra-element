import { html, fixture, expect } from '@open-wc/testing'
import { HydraElement } from './element'

describe('<hydra-element>', () => {

  window.customElements.define('hydra-element', HydraElement)

  it('should pass the a11y audit', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el)
      .shadowDom
      .to.be.accessible()
  })

  it('should...', async () => {
    // TODO
  })

})
