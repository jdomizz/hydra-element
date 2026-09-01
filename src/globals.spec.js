import { expect } from '@open-wc/testing'
import { publishHydraGlobals } from './globals'

function makeSynth() {
  const synth = {
    osc: () => 'osc',
    setFunction: () => 'setFunction',
    label: 'synth-prop',
  }
  return { synth }
}

describe('publishHydraGlobals', () => {
  it('publishes _hydra, synth, and synth functions on window', () => {
    const hydra = makeSynth()
    const restore = publishHydraGlobals(hydra)
    try {
      expect(window._hydra).to.equal(hydra)
      expect(window.synth).to.equal(hydra.synth)
      expect(window.osc()).to.equal('osc')
      expect(window.setFunction()).to.equal('setFunction')
    } finally {
      restore()
    }
  })

  it('restores pre-existing window values and deletes keys that were absent', () => {
    window.osc = 'app-osc'
    const hydra = makeSynth()
    const restore = publishHydraGlobals(hydra)
    restore()
    expect(window.osc).to.equal('app-osc')
    delete window.osc
  })

  it('deletes keys it introduced when window did not have them before', () => {
    delete window.setFunction
    const hydra = makeSynth()
    const restore = publishHydraGlobals(hydra)
    expect(window.setFunction).to.be.a('function')
    restore()
    expect(window.setFunction).to.be.undefined
  })

  it('binds synth functions so this points to the synth', () => {
    const synth = {
      tag: 'synth-instance',
      greet() {
        return this.tag
      },
    }
    const hydra = { synth }
    const restore = publishHydraGlobals(hydra)
    try {
      expect(window.greet()).to.equal('synth-instance')
    } finally {
      restore()
    }
  })

  it('publishes window.hydraSynth as an alias for the hydra-synth instance (bridge fix)', () => {
    // hydra-vertex + hydra-datamosh read `window.hydraSynth` directly
    // (per .opencode/specs/hydra-element/active/playground-extensions-catalog.md
    // §5 — bridge survey 2026-09-01). The bridge publishes it as an
    // alias for `_hydra` (same instance) so those demos run.
    delete window.hydraSynth
    const hydra = makeSynth()
    const restore = publishHydraGlobals(hydra)
    try {
      expect(window.hydraSynth, 'alias published').to.equal(hydra)
      expect(window._hydra, '_hydra still published').to.equal(hydra)
      expect(window.hydraSynth === window._hydra, 'same instance').to.equal(true)
    } finally {
      restore()
    }
  })

  it('restores pre-existing window.hydraSynth instead of deleting it', () => {
    // If the page already had a `hydraSynth` global before publish (e.g.
    // another library), the bridge must restore the prior value on
    // restore — not delete it. Regression for the snapshot/restore
    // contract.
    const sentinel = 'page-level-hydraSynth'
    window.hydraSynth = sentinel
    const hydra = makeSynth()
    const restore = publishHydraGlobals(hydra)
    expect(window.hydraSynth).to.equal(hydra) // overwrite during publish
    restore()
    expect(window.hydraSynth).to.equal(sentinel) // restore prior
    delete window.hydraSynth
  })
})
