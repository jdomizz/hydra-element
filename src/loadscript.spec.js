import { expect } from '@open-wc/testing'
import { stub } from 'sinon'
import { hydraEval } from './eval'
import { createHydraElement } from './test-helpers'
import { HydraElement } from './element'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

async function evalElement(el, code) {
  const evalPromise = new Promise(resolve => {
    el.addEventListener(
      'hydra-eval',
      e => resolve({ success: e.detail.success, error: e.detail.error }),
      { once: true }
    )
  })
  el.code = code
  return evalPromise
}

function stubAppendChild() {
  const original = document.head.appendChild
  const appendChild = stub(document.head, 'appendChild').callsFake(node => {
    return original.call(document.head, node)
  })
  return appendChild
}

describe('loadScript in non-global scope', () => {
  it('resolves await loadScript(url) via element and appends a <script> to document.head', async () => {
    const el = await createHydraElement()
    const appendChild = stubAppendChild()
    try {
      const { success, error } = await evalElement(
        el,
        'await loadScript("https://example.com/lib.js")'
      )
      expect(success).to.be.true
      expect(error).to.be.undefined
      expect(appendChild).to.have.been.calledOnce
      const [script] = appendChild.firstCall.args
      expect(script).to.be.instanceOf(HTMLScriptElement)
      expect(script.src).to.equal('https://example.com/lib.js')
    } finally {
      appendChild.restore()
    }
  })

  it('resolves scope-level hydraEval("await loadScript(url)", synth, scope)', async () => {
    const el = await createHydraElement()
    const appendChild = stubAppendChild()
    try {
      await hydraEval('await loadScript("https://example.com/lib.js")', el.synth, el._scope)
      expect(appendChild).to.have.been.calledOnce
      const [script] = appendChild.firstCall.args
      expect(script.src).to.equal('https://example.com/lib.js')
    } finally {
      appendChild.restore()
    }
  })

  it('loads a real fixture library and uses it from user code', async () => {
    const el = await createHydraElement()
    const libUrl = `data:text/javascript,${encodeURIComponent('window.__fixtureLib = () => 42')}`
    const { success, error } = await evalElement(
      el,
      `await loadScript("${libUrl}"); result = __fixtureLib()`
    )
    expect(success).to.be.true
    expect(error).to.be.undefined
    expect(window.__fixtureLib).to.be.a('function')
    expect(el._scope.result).to.equal(42)
  })
})
