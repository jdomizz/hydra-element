import { html, fixture, oneEvent, expect } from '@open-wc/testing'
import { HydraElement } from '../src/element.js'
import { PRESETS } from './presets.js'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

describe('playground presets', () => {
  it('"custom GLSL" preset is self-contained (no prior setFunction)', async () => {
    const preset = PRESETS.find(p => p.title === 'custom GLSL')
    expect(preset, 'preset entry must exist in playground/presets.js').to.exist

    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready

    expect(el.synth.noixe, 'noixe must NOT be registered before preset runs').to.be.undefined

    el.code = preset.code
    await oneEvent(el, 'hydra-eval')

    expect(el.synth.noixe, 'noixe must be registered after preset runs').to.be.a('function')
  })
})
