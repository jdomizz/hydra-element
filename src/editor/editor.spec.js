/**
 * `<hydra-editor>` contract tests. Verifies the public surface from
 * `src/hydra-editor.d.ts`:
 *   - `value` get/set (setter is silent — does NOT dispatch `code-apply`)
 *   - `placeholder` inherited
 *   - `addWords(words)` extends the dropdown wordlist
 *   - `destroy()` is idempotent and safe after disconnect
 *   - Ctrl+Enter and Cmd+Enter dispatch `code-apply` with `{ code }`
 *   - a11y: `role="textbox"`, `aria-multiline="true"`, `aria-label`
 *     (consumer-supplied or default).
 *
 * Per AGENTS.md: chai assertions on primitives only. No sinon-chai spy
 * assertions (they hang the session). We assert on `ev.detail.code` and
 * the dispatched event's `bubbles`/`composed` booleans.
 */
import { expect, fixture, oneEvent } from '@open-wc/testing'
import './index.js'

describe('<hydra-editor>', () => {
  it('registers and upgrades to the element class', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    expect(el).to.be.instanceOf(HTMLElement)
    expect(customElements.get('hydra-editor')).to.exist
  })

  it('renders the editor surface with the expected a11y attributes', async () => {
    const el = await fixture('<hydra-editor aria-label="My sketch"></hydra-editor>')
    const surface = el.shadowRoot.querySelector('.editor')
    expect(surface.getAttribute('role'), 'role=textbox').to.equal('textbox')
    expect(surface.getAttribute('aria-multiline')).to.equal('true')
    expect(surface.getAttribute('aria-label')).to.equal('My sketch')
  })

  it('falls back to the default aria-label when the consumer does not set one', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    const surface = el.shadowRoot.querySelector('.editor')
    expect(surface.getAttribute('aria-label')).to.equal('Hydra code editor')
  })

  it('value set/get round-trips', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    el.value = 'osc(10).out()'
    expect(el.value).to.equal('osc(10).out()')
  })

  it('programmatic value set does NOT dispatch code-apply', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    let fired = false
    el.addEventListener('code-apply', () => {
      fired = true
    })
    el.value = 'osc(10).out()'
    // Give any pending microtask a chance to run.
    await Promise.resolve()
    await Promise.resolve()
    expect(fired, 'programmatic value set is silent').to.equal(false)
  })

  it('Ctrl+Enter dispatches code-apply with { code }', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    el.value = 'osc(10).out()'
    setTimeout(() => {
      const surface = el.shadowRoot.querySelector('.editor')
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          ctrlKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      )
    })
    const ev = await oneEvent(el, 'code-apply')
    expect(ev.detail.code).to.equal('osc(10).out()')
    expect(ev.bubbles, 'event bubbles').to.equal(true)
    expect(ev.composed, 'event is composed (crosses shadow boundaries)').to.equal(true)
  })

  it('Cmd+Enter (metaKey) also dispatches code-apply', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    el.value = 'noise().out()'
    setTimeout(() => {
      const surface = el.shadowRoot.querySelector('.editor')
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          metaKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      )
    })
    const ev = await oneEvent(el, 'code-apply')
    expect(ev.detail.code).to.equal('noise().out()')
  })

  it('addWords extends the completion wordlist (idempotent)', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    const baseline = el.completion.wordlist.size
    el.addWords(['foo', 'bar'])
    expect(el.completion.wordlist.size).to.equal(baseline + 2)
    expect(el.completion.wordlist.has('foo')).to.equal(true)
    expect(el.completion.wordlist.has('bar')).to.equal(true)
    // Adding 'foo' again must not grow the set.
    el.addWords(['foo', 'baz'])
    expect(el.completion.wordlist.size).to.equal(baseline + 3)
    expect(el.completion.wordlist.has('baz')).to.equal(true)
  })

  it('addWords accepts a space-separated string', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    const baseline = el.completion.wordlist.size
    el.addWords('alpha beta  gamma')
    expect(el.completion.wordlist.size).to.equal(baseline + 3)
    expect(el.completion.wordlist.has('alpha')).to.equal(true)
    expect(el.completion.wordlist.has('beta')).to.equal(true)
    expect(el.completion.wordlist.has('gamma')).to.equal(true)
  })

  it('destroy() is idempotent and does not throw', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    el.destroy()
    expect(() => el.destroy()).to.not.throw()
  })

  it('value set after destroy() does not throw', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    el.destroy()
    expect(() => {
      el.value = 'after destroy'
    }).to.not.throw()
    expect(el.value).to.equal('after destroy')
  })

  it('placeholder attribute reflects via getter', async () => {
    const el = await fixture('<hydra-editor placeholder="osc(10, 0.2, 0.5).out()"></hydra-editor>')
    expect(el.placeholder).to.equal('osc(10, 0.2, 0.5).out()')
  })

  it('input event bubbles + is composed', async () => {
    const el = await fixture('<hydra-editor></hydra-editor>')
    el.value = 'osc().out()'
    // CodeJar emits `input` via the host's onUpdate. The host re-dispatches
    // a CustomEvent(input, { bubbles, composed }) — assert that.
    setTimeout(() => {
      const surface = el.shadowRoot.querySelector('.editor')
      surface.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
    })
    const ev = await oneEvent(el, 'input')
    expect(ev.bubbles, 'input event bubbles').to.equal(true)
    expect(ev.composed, 'input event is composed').to.equal(true)
  })
})
