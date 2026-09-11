import { expect } from '@open-wc/testing'
import {
  DEFAULT_RUNTIME_OPTIONS,
  HYDRA_ATTRS,
  RESET_ATTRS,
  isHydraRuntimeAttr,
  parseHydraAttr,
  parseHydraAttrs,
  parseResetAttr,
} from './runtime/attributes'

describe('runtime attribute parsing (pure)', () => {
  it('parses boolean config options', () => {
    expect(parseHydraAttr('global', 'true', DEFAULT_RUNTIME_OPTIONS).makeGlobal).to.equal(true)
    expect(parseHydraAttr('audio', 'true', DEFAULT_RUNTIME_OPTIONS).detectAudio).to.equal(true)
  })

  it('parses counted options and clamps at zero', () => {
    expect(parseHydraAttr('sources', '2', DEFAULT_RUNTIME_OPTIONS).numSources).to.equal(2)
    expect(parseHydraAttr('outputs', '0', DEFAULT_RUNTIME_OPTIONS).numOutputs).to.equal(0)
  })

  it('clamps sources/outputs to the maximum bound of 16 (default on out-of-range)', () => {
    expect(parseHydraAttr('sources', '1000', DEFAULT_RUNTIME_OPTIONS).numSources).to.equal(4)
    expect(parseHydraAttr('outputs', '1000', DEFAULT_RUNTIME_OPTIONS).numOutputs).to.equal(4)
    expect(parseHydraAttr('sources', '20', DEFAULT_RUNTIME_OPTIONS).numSources).to.equal(4)
    expect(parseHydraAttr('outputs', '20', DEFAULT_RUNTIME_OPTIONS).numOutputs).to.equal(4)
  })

  it('parses precision to a valid value only', () => {
    expect(parseHydraAttr('precision', 'lowp', DEFAULT_RUNTIME_OPTIONS).precision).to.equal('lowp')
    expect(parseHydraAttr('precision', 'wrong', DEFAULT_RUNTIME_OPTIONS).precision).to.equal(null)
  })

  it('parses loop to autoLoop', () => {
    expect(parseHydraAttr('loop', 'false', DEFAULT_RUNTIME_OPTIONS).autoLoop).to.equal(false)
  })

  it('merges changes immutably (previous options untouched)', () => {
    const prev = { ...DEFAULT_RUNTIME_OPTIONS, autoLoop: false }
    const updated = parseHydraAttr('global', 'true', prev)
    expect(updated.makeGlobal).to.equal(true)
    expect(updated.autoLoop).to.equal(false)
    expect(prev.makeGlobal).to.equal(false)
    expect(prev.autoLoop).to.equal(false)
  })

  it('reports reset attributes (the non-loop subset)', () => {
    for (const attr of ['global', 'audio', 'sources', 'outputs', 'precision']) {
      expect(RESET_ATTRS, `RESET_ATTRS must include ${attr}`).to.include(attr)
    }
    expect(RESET_ATTRS).to.not.include('loop')
  })

  it('parseResetAttr ignores non-reset names and parses reset names', () => {
    const prev = { ...DEFAULT_RUNTIME_OPTIONS, autoLoop: true }
    expect(parseResetAttr('loop', 'false', prev)).to.equal(prev)
    expect(parseResetAttr('global', 'true', prev).makeGlobal).to.equal(true)
  })

  it('isHydraRuntimeAttr recognizes the observed attribute set', () => {
    expect(isHydraRuntimeAttr('global')).to.equal(true)
    expect(isHydraRuntimeAttr('loop')).to.equal(true)
    expect(isHydraRuntimeAttr('width')).to.equal(false)
  })

  it('parseHydraAttrs reads the observed attributes from a host', () => {
    const host = {
      attrs: { global: 'true', sources: '2', loop: 'false' },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null
      },
    }
    const options = parseHydraAttrs(host)
    expect(options.makeGlobal).to.equal(true)
    expect(options.numSources).to.equal(2)
    expect(options.autoLoop).to.equal(false)
    expect(options.detectAudio).to.equal(false) // untouched default
    expect(options.numOutputs).to.equal(4) // absent attr keeps default (not Number(null)=0)
  })

  it('HYDRA_ATTRS is exactly the observed set', () => {
    expect(HYDRA_ATTRS).to.deep.equal([
      'global',
      'audio',
      'sources',
      'outputs',
      'precision',
      'loop',
    ])
  })
})
