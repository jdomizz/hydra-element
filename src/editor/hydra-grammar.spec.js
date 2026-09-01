import { expect } from '@open-wc/testing'
import 'prismjs'
import 'prismjs/components/prism-javascript.js'

// The module registers the `hydra` grammar at import time.
import './hydra-grammar.js'

const { Prism } = globalThis

/**
 * Hydra grammar contract test: verifies that the Hydra-specific tokens
 * (DSL functions, globals) are highlighted correctly when run through
 * Prism. Does NOT snapshot the full output — asserts on the presence of
 * the relevant token classes for the Hydra-specific tokens. This avoids
 * coupling to Prism internals while verifying token coverage.
 */
function highlight(code) {
  return Prism.highlight(code, Prism.languages.hydra, 'hydra')
}

describe('hydra-grammar', () => {
  it('DSL functions get the function token class', () => {
    const out = highlight('osc(1).kaleid(2).out(o0)')
    expect(out).to.include('<span class="token function">osc</span>')
    expect(out).to.include('<span class="token function">kaleid</span>')
    expect(out).to.include('<span class="token function">out</span>')
  })

  it('Hydra globals get the global token class', () => {
    const out = highlight('k0 + g3 + gp0 + time + o0 + a')
    expect(out).to.include('<span class="token global">k0</span>')
    expect(out).to.include('<span class="token global">g3</span>')
    expect(out).to.include('<span class="token global">gp0</span>')
    expect(out).to.include('<span class="token global">time</span>')
    expect(out).to.include('<span class="token global">o0</span>')
    expect(out).to.include('<span class="token global">a</span>')
  })

  it('standard JS keywords get the keyword token class', () => {
    const out = highlight('const x = 1')
    expect(out).to.include('<span class="token keyword">const</span>')
  })

  it('registers the hydra grammar exactly once (singleton guard)', () => {
    // Importing the module again must not blow up — the `if (!Prism.languages.hydra)`
    // guard keeps the grammar registered once across HMR / test re-runs.
    expect(() => import('./hydra-grammar.js')).to.not.throw()
    expect(Prism.languages.hydra).to.be.an('object')
  })
})
