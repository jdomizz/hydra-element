/**
 * Browser-lane specs for the context-loss recovery (the port-must-fix) and
 * the seed-eval contract. Uses synthetic `webglcontextlost`/`restored` events
 * — the shell's loss handler dispatches `hydra-context-lost` on the host and
 * the runtime stops the core + awaits a re-armed one-shot restore.
 */
import { expect, fixture, html } from '@open-wc/testing'
import '../index'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('context-loss recovery', () => {
  it('survives a second context loss (the port-must-fix)', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready
    const { canvas } = el
    let losses = 0
    el.addEventListener('hydra-context-lost', () => {
      losses++
    })
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    expect(losses, 'both losses must dispatch hydra-context-lost').to.equal(2)
  })

  it('re-initializes, re-evals, and re-fires ready on restore', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`)
    await el.ready
    el.code = 'osc().out()'
    await wait(20)
    const synth1 = el.synth
    const { canvas } = el

    const readyPromise = new Promise(resolve => {
      el.addEventListener('hydra-ready', e => resolve(e.detail), { once: true })
    })
    const evalPromise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
    })

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    canvas.dispatchEvent(new Event('webglcontextrestored'))

    const detail = await evalPromise
    expect(detail.success, 'restore must re-eval the current code').to.be.true
    const ready = await readyPromise
    expect(ready.synth, 'a fresh synth must be built').to.not.equal(synth1)
    expect(el.synth, 'el.synth must reflect the fresh synth').to.not.equal(synth1)
  })

  it('evaluates the textContent seed on connect (you are live)', async () => {
    const el = document.createElement('hydra-element')
    const promise = new Promise(resolve => {
      el.addEventListener('hydra-eval', e => resolve(e.detail), { once: true })
    })
    el.textContent = 'osc().out()'
    document.body.append(el)
    const detail = await promise
    expect(detail.success, 'the seed code must evaluate on connect').to.be.true
    el.remove()
  })
})
