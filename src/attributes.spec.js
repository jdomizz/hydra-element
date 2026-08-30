import { fixture, expect, html } from '@open-wc/testing'
import { AttributeHandler } from './attributes'
import { HydraElement } from './element'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

describe('AttributeHandler', () => {
  it('parses width and height to numbers', () => {
    const handler = new AttributeHandler({ width: 10, height: 20 })
    expect(handler.parse('width', '500')).to.deep.equal({ width: 500 })
    expect(handler.parse('height', '300')).to.deep.equal({ height: 300 })
  })

  it('falls back to current size on invalid numbers', () => {
    const handler = new AttributeHandler({ width: 10 })
    expect(handler.parse('width', 'abc')).to.deep.equal({ width: 10 })
    expect(handler.parse('width', '-5')).to.deep.equal({ width: 10 })
  })

  it('parses boolean config options', () => {
    const handler = new AttributeHandler({ makeGlobal: false, detectAudio: false })
    expect(handler.parse('global', 'true')).to.deep.equal({ makeGlobal: true })
    expect(handler.parse('audio', 'true')).to.deep.equal({ detectAudio: true })
  })

  it('parses counted options and clamps at zero', () => {
    const handler = new AttributeHandler({ numSources: 4, numOutputs: 4 })
    expect(handler.parse('sources', '2')).to.deep.equal({ numSources: 2 })
    expect(handler.parse('outputs', '0')).to.deep.equal({ numOutputs: 0 })
  })

  it('clamps sources/outputs to the maximum bound of 16', () => {
    const handler = new AttributeHandler({ numSources: 4, numOutputs: 4 })
    expect(handler.parse('sources', '1000')).to.deep.equal({ numSources: 4 })
    expect(handler.parse('outputs', '1000')).to.deep.equal({ numOutputs: 4 })
    expect(handler.parse('sources', '20')).to.deep.equal({ numSources: 4 })
    expect(handler.parse('outputs', '20')).to.deep.equal({ numOutputs: 4 })
  })

  it('parses precision to a valid value only', () => {
    const handler = new AttributeHandler({ precision: null })
    expect(handler.parse('precision', 'lowp')).to.deep.equal({ precision: 'lowp' })
    expect(handler.parse('precision', 'wrong')).to.deep.equal({ precision: null })
  })

  it('parses loop to autoLoop', () => {
    const handler = new AttributeHandler({ autoLoop: true })
    expect(handler.parse('loop', 'false')).to.deep.equal({ autoLoop: false })
  })

  it('update merges changes immutably', () => {
    const handler = new AttributeHandler({ width: 10, autoLoop: true })
    const updated = handler.update('width', '500')
    expect(updated).to.equal(handler.getOptions())
    expect(updated.width).to.equal(500)
    expect(updated.autoLoop).to.be.true
  })

  it('reports synth-reset attributes', () => {
    const handler = new AttributeHandler({})
    expect(handler.hasSynthResettingAttribute('global')).to.be.true
    expect(handler.hasSynthResettingAttribute('audio')).to.be.true
    expect(handler.hasSynthResettingAttribute('sources')).to.be.true
    expect(handler.hasSynthResettingAttribute('outputs')).to.be.true
    expect(handler.hasSynthResettingAttribute('precision')).to.be.true
    expect(handler.hasSynthResettingAttribute('width')).to.be.false
    expect(handler.hasSynthResettingAttribute('loop')).to.be.false
  })
})

describe('refactor-names', () => {
  it('uses hasSynthResettingAttribute on the attribute handler', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el.attributeHandler.hasSynthResettingAttribute('global')).to.be.true
    expect(el.attributeHandler.hasSynthResettingAttribute('width')).to.be.false
  })
})
