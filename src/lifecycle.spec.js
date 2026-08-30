import { html, fixture, expect } from '@open-wc/testing'
import sinon from 'sinon'
import { HydraElement } from './element'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('canvas-setter-eval', () => {
  it('re-evaluates code when canvas is set', async () => {
    const el = await fixture(html`<hydra-element>osc().out()</hydra-element>`)
    await wait(10)
    const evals = []
    el.addEventListener('hydra-eval', e => evals.push(e.detail))

    const customCanvas = document.createElement('canvas')
    el.canvas = customCanvas

    await wait(10)
    expect(el.canvas).to.equal(customCanvas)
    expect(evals.length).to.be.greaterThan(0)
    expect(evals[0].success).to.be.true
  })

  it('does not evaluate when canvas is set with empty code', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await wait(10)
    const evals = []
    el.addEventListener('hydra-eval', e => evals.push(e.detail))

    const customCanvas = document.createElement('canvas')
    el.canvas = customCanvas

    await wait(10)
    expect(evals).to.have.length(0)
  })
})

describe('connected-callback-reentry', () => {
  it('does not re-initialize synth on repeated connectedCallback', async () => {
    const el = await fixture(html`<hydra-element>osc().out()</hydra-element>`)
    const synth1 = el.synth
    el.connectedCallback()
    expect(el.synth).to.equal(synth1)
  })

  it('preserves the synth when moved in the DOM', async () => {
    const el = await fixture(html`<hydra-element>osc().out()</hydra-element>`)
    const synth1 = el.synth
    expect(synth1).to.exist

    const container = document.createElement('div')
    document.body.append(container)
    container.append(el)
    await wait(10)
    expect(el.synth).to.equal(synth1)
    el.remove()
  })
})

describe('lifecycle-resource-leaks', () => {
  it('destroys the previous manager before resetting the synth', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const old = el.hydraManager
    const destroySpy = sinon.spy(old, 'destroy')
    el.setAttribute('global', 'true')
    await wait(10)
    expect(destroySpy).to.have.been.calledOnce
  })

  it('ready resolves the current synth after a reset', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const first = (await el.ready).synth
    el.setAttribute('audio', 'true')
    await wait(10)
    const second = (await el.ready).synth
    expect(first).to.not.equal(second)
    expect(second).to.equal(el.synth)
  })

  it('destroy tears down and a later reconnect re-initializes fresh', async () => {
    const el = await fixture(html`<hydra-element>osc().out()</hydra-element>`)
    const s1 = el.synth
    el.destroy()
    expect(el.synth).to.be.undefined
    document.body.append(el)
    await wait(10)
    expect(el.synth).to.not.equal(s1)
    el.remove()
  })

  it('destroy removes analyzer canvases', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    const analyzer = document.createElement('canvas')
    el.shadowRoot.append(analyzer)
    el.destroy()
    expect(el.shadowRoot.contains(analyzer)).to.be.false
  })
})

describe('refactor-names', () => {
  it('uses hasSynthResettingAttribute on the attribute handler', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    expect(el.attributeHandler.hasSynthResettingAttribute('global')).to.be.true
    expect(el.attributeHandler.hasSynthResettingAttribute('width')).to.be.false
  })
})
