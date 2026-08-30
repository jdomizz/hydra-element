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
})
