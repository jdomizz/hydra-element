import { expect } from '@open-wc/testing'
import { HYDRA_TOKENS, DEFAULT_WORDLIST, hydraGrammar, highlightHydra } from './hydra-config.js'

describe('hydra-config (data-first)', () => {
  it('HYDRA_TOKENS.functions has 43 entries and contains key DSL verbs', () => {
    expect(HYDRA_TOKENS.functions).to.have.lengthOf(43)
    expect(HYDRA_TOKENS.functions).to.include('osc')
    expect(HYDRA_TOKENS.functions).to.include('voronoi')
    expect(HYDRA_TOKENS.functions).to.include('modulateKaleid')
  })

  it('HYDRA_TOKENS.globals has 30 entries matching the sweep list', () => {
    expect(HYDRA_TOKENS.globals).to.have.lengthOf(30)
    // k0..k7, g0..g7, gp0..gp7, time, o0..o3, a
    const expected = [
      'k0',
      'k1',
      'k2',
      'k3',
      'k4',
      'k5',
      'k6',
      'k7',
      'g0',
      'g1',
      'g2',
      'g3',
      'g4',
      'g5',
      'g6',
      'g7',
      'gp0',
      'gp1',
      'gp2',
      'gp3',
      'gp4',
      'gp5',
      'gp6',
      'gp7',
      'time',
      'o0',
      'o1',
      'o2',
      'o3',
      'a',
    ]
    expect(HYDRA_TOKENS.globals).to.have.members(expected)
  })

  it('HYDRA_TOKENS.keywords has 17 common JS keywords', () => {
    expect(HYDRA_TOKENS.keywords).to.have.lengthOf(17)
    expect(HYDRA_TOKENS.keywords).to.include('const')
    expect(HYDRA_TOKENS.keywords).to.include('function')
  })

  it('DEFAULT_WORDLIST is the union of the three token groups (96 entries)', () => {
    const expectedSize =
      HYDRA_TOKENS.functions.length + HYDRA_TOKENS.globals.length + HYDRA_TOKENS.keywords.length
    expect(DEFAULT_WORDLIST.size).to.equal(expectedSize)
    expect(DEFAULT_WORDLIST.has('osc')).to.be.true
    expect(DEFAULT_WORDLIST.has('time')).to.be.true
    expect(DEFAULT_WORDLIST.has('const')).to.be.true
  })

  it('hydraGrammar is a Prism language object', () => {
    expect(hydraGrammar).to.exist
    expect(hydraGrammar.function).to.exist
    expect(hydraGrammar.global).to.exist
  })

  it('highlightHydra produces token spans', () => {
    const html = highlightHydra('osc(10)')
    expect(html).to.include('token')
    expect(html).to.include('function')
    expect(html).to.include('osc')
  })

  it('highlightHydra marks globals correctly', () => {
    const html = highlightHydra('time')
    expect(html).to.include('global')
    expect(html).to.include('time')
  })

  it('highlightHydra marks keywords correctly', () => {
    const html = highlightHydra('const x = 1')
    expect(html).to.include('keyword')
    expect(html).to.include('const')
  })
})
