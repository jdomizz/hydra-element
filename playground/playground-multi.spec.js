import { html, fixture, expect, oneEvent } from '@open-wc/testing'
import { HydraElement } from '../src/element.js'
import {
  encodeForUrl,
  decodeUrlCodes,
  decodeB64Url,
  NUM_SLOTS,
  STORAGE_KEY_PREFIX,
} from './main.js'
import './components/multi-log.js'
import './components/editor-panel.js'
import './components/preset-selector.js'
import './components/cfg-form.js'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

const SAMPLE = 'osc(10, 0.2, 0.5).out()'
const OTHER = 'noise(3, 0.1).color(0.5, 0.5, 0.5).out()'

// Each fixture creates a `<hydra-element>` which creates a WebGL
// context. Browsers cap WebGL contexts (~16 per process). Releasing
// every fixture at the end of its test frees the context for the
// next test, so the whole suite stays under the cap.
function cleanup(...els) {
  for (const el of els) {
    try {
      el.remove()
    } catch {}
  }
}

describe('playground multi-instance wiring', () => {
  describe('encodeForUrl / decodeB64Url', () => {
    it('round-trips ASCII', () => {
      expect(decodeB64Url(encodeForUrl('hello'))).to.equal('hello')
    })
    it('round-trips UTF-8 (emoji + accents)', () => {
      const s = 'ñoño 🎬 — osc(10, 0.2)'
      expect(decodeB64Url(encodeForUrl(s))).to.equal(s)
    })
    it('decodeB64Url returns null on garbage input', () => {
      expect(decodeB64Url('@@@not-base64@@@')).to.equal(null)
    })
  })

  describe('decodeUrlCodes', () => {
    it('returns 4 nulls for empty query', () => {
      expect(decodeUrlCodes('')).to.deep.equal([null, null, null, null])
    })

    it('decodes per-slot code0..3', () => {
      const search = `?code0=${encodeForUrl('a')}&code2=${encodeForUrl('c')}`
      const out = decodeUrlCodes(search)
      expect(out[0]).to.equal('a')
      expect(out[1]).to.equal(null)
      expect(out[2]).to.equal('c')
      expect(out[3]).to.equal(null)
    })

    it('mirrors legacy bare `?code=` to all 4 slots when no per-slot payload', () => {
      const search = `?code=${encodeForUrl(SAMPLE)}`
      const out = decodeUrlCodes(search)
      expect(out).to.deep.equal([SAMPLE, SAMPLE, SAMPLE, SAMPLE])
    })

    it('per-slot wins over legacy (no mirror when both present)', () => {
      const search = `?code=${encodeForUrl('legacy')}&code1=${encodeForUrl('slot1')}`
      const out = decodeUrlCodes(search)
      expect(out[0]).to.equal(null)
      expect(out[1]).to.equal('slot1')
      expect(out[2]).to.equal(null)
      expect(out[3]).to.equal(null)
    })
  })

  describe('cell click → target-change', () => {
    it('clicking a cell dispatches target-change with index + element', async () => {
      const els = await Promise.all([
        fixture(html`<hydra-element id="g-0"></hydra-element>`),
        fixture(html`<hydra-element id="g-1"></hydra-element>`),
      ])
      // Wrap in cell containers like the playground does
      const cells = els.map(el => {
        const cell = document.createElement('figure')
        cell.className = 'cell'
        cell.tabindex = 0
        cell.append(el)
        return cell
      })

      // Attach the same click handler as main.js (test the behavior, not
      // the wiring). Click on cell 1.
      cells.forEach((cell, i) => {
        cell.addEventListener('click', () => {
          document.dispatchEvent(
            new CustomEvent('target-change', {
              detail: { index: i, element: els[i], label: `#${i}` },
              bubbles: true,
              composed: true,
            })
          )
        })
      })
      document.body.append(...cells)

      setTimeout(() => cells[1].click())

      const ev = await oneEvent(document, 'target-change')
      expect(ev.detail.index).to.equal(1)
      expect(ev.detail.element).to.equal(els[1])
      expect(ev.detail.label).to.equal('#1')
      expect(ev.bubbles).to.equal(true)
      expect(ev.composed).to.equal(true)

      cleanup(...cells)
    })

    it('keyboard Enter on a focused cell triggers the same dispatch', async () => {
      const els = await Promise.all([
        fixture(html`<hydra-element id="g-0"></hydra-element>`),
        fixture(html`<hydra-element id="g-1"></hydra-element>`),
      ])
      const cells = els.map(el => {
        const cell = document.createElement('figure')
        cell.className = 'cell'
        cell.tabindex = 0
        cell.append(el)
        return cell
      })
      cells.forEach((cell, i) => {
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            document.dispatchEvent(
              new CustomEvent('target-change', {
                detail: { index: i, element: els[i], label: `#${i}` },
                bubbles: true,
                composed: true,
              })
            )
          }
        })
      })
      document.body.append(...cells)

      setTimeout(() => {
        cells[1].focus()
        cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      })

      const ev = await oneEvent(document, 'target-change')
      expect(ev.detail.index).to.equal(1)
      expect(ev.detail.element).to.equal(els[1])

      cleanup(...cells)
    })

    it('setActive toggles .is-active exactly on the active cell', () => {
      const cells = [
        document.createElement('figure'),
        document.createElement('figure'),
        document.createElement('figure'),
        document.createElement('figure'),
      ].map(cell => {
        cell.className = 'cell'
        document.body.append(cell)
        return cell
      })

      const setActive = index => {
        cells.forEach((cell, i) => {
          cell.classList.toggle('is-active', i === index)
        })
      }

      setActive(0)
      expect(cells[0].classList.contains('is-active')).to.equal(true)
      expect(cells[1].classList.contains('is-active')).to.equal(false)
      expect(cells[2].classList.contains('is-active')).to.equal(false)
      expect(cells[3].classList.contains('is-active')).to.equal(false)

      setActive(2)
      expect(cells[0].classList.contains('is-active')).to.equal(false)
      expect(cells[2].classList.contains('is-active')).to.equal(true)

      cleanup(...cells)
    })
  })

  describe('editor-panel per-slot persistence', () => {
    beforeEach(() => {
      try {
        for (let i = 0; i < NUM_SLOTS; i++) {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${i}`)
        }
      } catch {}
    })

    it('writes to slot-specific localStorage key on `value` set', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      await el.ready
      const editor = await fixture(html`<editor-panel target-slot="0"></editor-panel>`)
      editor.target = el
      editor.slot = 0
      editor.value = SAMPLE

      try {
        expect(localStorage.getItem(`${STORAGE_KEY_PREFIX}:0`)).to.equal(SAMPLE)
      } catch {}
      expect(editor.value).to.equal(SAMPLE)

      cleanup(el, editor)
    })

    it("switching slot changes the textarea to that slot's storage", async () => {
      const el0 = await fixture(html`<hydra-element id="g-0"></hydra-element>`)
      const el1 = await fixture(html`<hydra-element id="g-1"></hydra-element>`)
      await Promise.all([el0.ready, el1.ready])

      const editor = await fixture(html`<editor-panel></editor-panel>`)
      editor.target = el0
      editor.slot = 0
      editor.value = SAMPLE

      // Switch to slot 1 — textarea should reflect slot 1's storage
      // (currently empty), target should rebind to el1.
      editor.target = el1
      editor.slot = 1
      expect(editor.value).to.equal('')
      expect(editor.target).to.equal(el1)

      // Switch back — slot 0's value is preserved.
      editor.target = el0
      editor.slot = 0
      expect(editor.value).to.equal(SAMPLE)

      cleanup(el0, el1, editor)
    })

    it('listens for target-change on document and rebinds', async () => {
      const el0 = await fixture(html`<hydra-element id="g-0"></hydra-element>`)
      const el1 = await fixture(html`<hydra-element id="g-1"></hydra-element>`)
      await Promise.all([el0.ready, el1.ready])

      const editor = await fixture(html`<editor-panel></editor-panel>`)
      editor.target = el0
      editor.slot = 0

      document.dispatchEvent(
        new CustomEvent('target-change', {
          detail: { index: 1, element: el1, label: '#1' },
          bubbles: true,
          composed: true,
        })
      )

      // Allow microtask queue to flush
      await new Promise(r => setTimeout(r, 0))

      expect(editor.target).to.equal(el1)
      expect(editor.slot).to.equal(1)

      cleanup(el0, el1, editor)
    })

    it('falls back to target.code when localStorage is empty (first visit)', async () => {
      // User-reported: switching cells on first visit showed an empty
      // textarea even when the element had default code (via
      // `textContent`). Root cause: editor-panel's `hydrateFromStorage`
      // ran in `connectedCallback`, before the orchestrator bound the
      // target, so the fallback saw no target. Now both the orchestrator
      // re-primes the editor on initial bind AND `hydrateFromStorage`
      // itself falls back to `target.code` whenever localStorage is
      // empty for the active slot.
      const el = await fixture(html`<hydra-element>default sketch code</hydra-element>`)
      await el.ready
      expect(el.code).to.equal('default sketch code')

      const editor = await fixture(html`<editor-panel></editor-panel>`)
      editor.target = el
      editor.slot = 0

      expect(editor.value, 'empty localStorage → textarea must mirror target.code').to.equal(
        'default sketch code'
      )

      try {
        expect(
          localStorage.getItem(`${STORAGE_KEY_PREFIX}:0`),
          'fallback must seed localStorage so subsequent visits are stable'
        ).to.equal('default sketch code')
      } catch {}

      cleanup(el, editor)
    })
  })

  describe('preset-selector with slot', () => {
    it('includes slot in preset-change event detail', async () => {
      const el = await fixture(html`<hydra-element></hydra-element>`)
      await el.ready
      const selector = await fixture(html`<preset-selector></preset-selector>`)
      selector.target = el
      selector.slot = 2
      selector.presets = [{ title: 'osc', description: '', code: SAMPLE }]

      const select = selector.shadowRoot.querySelector('select')

      setTimeout(() => {
        select.selectedIndex = 1
        select.dispatchEvent(new Event('change'))
      })

      const ev = await oneEvent(selector, 'preset-change')
      expect(ev.detail.slot).to.equal(2)
      expect(ev.detail.code).to.equal(SAMPLE)
      expect(ev.detail.title).to.equal('osc')
      expect(ev.bubbles).to.equal(true)
      expect(ev.composed).to.equal(true)

      cleanup(el, selector)
    })

    it('updates internal slot + target on target-change; preset follows', async () => {
      // Combines two concerns to keep fixture count down (each
      // `<hydra-element>` opens a WebGL context — the suite is close to
      // the browser cap). Covers the user-reported bug where picking a
      // preset always applied to element #0 even after clicking a
      // different cell: root cause was preset-selector's
      // `target-change` listener only updating `#slot`, never `#target`.
      const el0 = await fixture(html`<hydra-element id="g-0"></hydra-element>`)
      const el3 = await fixture(html`<hydra-element id="g-3"></hydra-element>`)
      await Promise.all([el0.ready, el3.ready])

      const selector = await fixture(html`<preset-selector></preset-selector>`)
      selector.target = el0
      selector.slot = 0
      selector.presets = [
        { title: 'osc', description: 'basic', code: SAMPLE },
        { title: 'noise', description: 'colored', code: OTHER },
      ]

      // 1. User clicks cell #3 — target-change fires.
      document.dispatchEvent(
        new CustomEvent('target-change', {
          detail: { index: 3, element: el3, label: '#3' },
          bubbles: true,
          composed: true,
        })
      )
      await new Promise(r => setTimeout(r, 0))

      expect(selector.slot, 'slot must reflect target-change index').to.equal(3)
      expect(
        selector.target,
        'target must rebind on target-change (was stuck on #0 before fix)'
      ).to.equal(el3)

      // 2. User picks the noise preset from the dropdown.
      const select = selector.shadowRoot.querySelector('select')
      select.selectedIndex = 2 // the noise option
      select.dispatchEvent(new Event('change'))

      expect(el3.code, 'preset must apply to the selected cell').to.equal(OTHER)
      expect(el0.code, 'unselected cells must not be touched').to.equal('')

      cleanup(el0, el3, selector)
    })
  })

  describe('multi-log follows the selected cell', () => {
    it('rebinds to the new target on target-change; ignores events from the old one', async () => {
      // User-reported: the log reflected nothing and should reflect the
      // selected cell. Root cause was twofold:
      //   1. The previous multi-log subscribed to all 4 cells but never
      //      filtered — every eval/resize from any cell spammed the log.
      //   2. The `data-log-cells` ancestor lived on `.app__center`, so
      //      `multi-log.closest(...)` (in `.app__right`) couldn't find it.
      // Now multi-log follows the active cell via `target-change` —
      // single-target subscription, like editor-panel and cfg-form.
      const el0 = await fixture(html`<hydra-element id="g-0"></hydra-element>`)
      const el1 = await fixture(html`<hydra-element id="g-1"></hydra-element>`)
      await Promise.all([el0.ready, el1.ready])

      const log = await fixture(html`<multi-log limit="50"></multi-log>`)

      // Initial selection: cell #0
      document.dispatchEvent(
        new CustomEvent('target-change', {
          detail: { index: 0, element: el0, label: '#0' },
          bubbles: true,
          composed: true,
        })
      )
      await new Promise(r => setTimeout(r, 0))
      expect(log.target, 'log must bind to slot 0 on initial target-change').to.equal(el0)

      // Wait for the initial hydra-ready line (resolved promise) to flush.
      await new Promise(r => setTimeout(r, 0))
      const pre = log.shadowRoot.querySelector('pre')
      const baseline = pre.querySelectorAll('.line').length

      // Fire a hydra-eval on el1 (not the active target) — log must ignore it.
      el1.dispatchEvent(new CustomEvent('hydra-eval', { detail: { success: true } }))
      await new Promise(r => setTimeout(r, 0))
      expect(
        pre.querySelectorAll('.line').length,
        'inactive cell events must NOT appear in the log'
      ).to.equal(baseline)

      // Fire a hydra-eval on el0 (the active target) — log must show it.
      el0.dispatchEvent(new CustomEvent('hydra-eval', { detail: { success: true } }))
      await new Promise(r => setTimeout(r, 0))
      const afterEval = pre.querySelectorAll('.line').length
      expect(afterEval, 'active cell events must appear in the log').to.be.greaterThan(baseline)
      expect(pre.textContent).to.include('hydra-eval')

      // Switch target to el1 — log must rebind and ignore future el0 events.
      document.dispatchEvent(
        new CustomEvent('target-change', {
          detail: { index: 1, element: el1, label: '#1' },
          bubbles: true,
          composed: true,
        })
      )
      await new Promise(r => setTimeout(r, 0))
      expect(log.target, 'log must rebind on target-change').to.equal(el1)

      const afterSwitch = pre.querySelectorAll('.line').length
      el0.dispatchEvent(new CustomEvent('hydra-eval', { detail: { success: true } }))
      await new Promise(r => setTimeout(r, 0))
      expect(
        pre.querySelectorAll('.line').length,
        'switched-away cell events must NOT appear'
      ).to.equal(afterSwitch)

      cleanup(el0, el1, log)
    })
  })

  describe('4-element hydration via decodeUrlCodes + assignment', () => {
    it('per-slot URL populates only the listed slots', async () => {
      const search = `?code0=${encodeForUrl(SAMPLE)}&code3=${encodeForUrl(OTHER)}`
      const codes = decodeUrlCodes(search)

      const els = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          fixture(html`<hydra-element id="g-${i}"></hydra-element>`)
        )
      )
      await Promise.all(els.map(el => el.ready))

      for (let i = 0; i < els.length; i++) {
        if (codes[i] !== null) els[i].code = codes[i]
      }

      expect(els[0].code).to.equal(SAMPLE)
      expect(els[1].code).to.equal('')
      expect(els[2].code).to.equal('')
      expect(els[3].code).to.equal(OTHER)

      cleanup(...els)
    })

    it('legacy URL populates all 4 slots identically', async () => {
      const search = `?code=${encodeForUrl(SAMPLE)}`
      const codes = decodeUrlCodes(search)

      const els = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          fixture(html`<hydra-element id="g-${i}"></hydra-element>`)
        )
      )
      await Promise.all(els.map(el => el.ready))

      for (let i = 0; i < els.length; i++) {
        if (codes[i] !== null) els[i].code = codes[i]
      }

      for (let i = 0; i < els.length; i++) {
        expect(els[i].code).to.equal(SAMPLE)
      }

      cleanup(...els)
    })
  })

  describe('cfg-form loop toggle (default-true asymmetry)', () => {
    // User-reported: clicking the loop checkbox didn't stop the loop.
    // Root cause: `<hydra-element>`'s default for `loop` is
    // `autoLoop: true` (see `src/defaults.js`), so an absent attribute
    // means "loop is on" — opposite of `audio`/`global` (default false).
    // The old cfg-form initialized the checkbox from `hasAttribute('loop')`
    // (false) and on uncheck applied `removeAttribute('loop')` (which
    // fell back to the same default `true`). Net effect: the toggle
    // did nothing the user could observe.
    it('default-on, explicit-off/on, and rebind across cells (one flow)', async () => {
      // One test covering the full toggle + rebind sequence to keep
      // WebGL context pressure down — each `<hydra-element>` opens a
      // context, and this suite is already close to the browser cap.
      // Lives at the end of the file so it runs after the heavier
      // 4-element hydration tests.
      const el0 = await fixture(html`<hydra-element id="g-0"></hydra-element>`)
      const el1 = await fixture(html`<hydra-element id="g-1" loop="false"></hydra-element>`)
      await Promise.all([el0.ready, el1.ready])

      const cfg = await fixture(html`<cfg-form></cfg-form>`)
      cfg.target = el0
      const loopInput = cfg.shadowRoot.querySelector('[data-toggle="loop"]')

      // 1. el0 default (no `loop` attribute) — checkbox must start checked.
      expect(loopInput.checked, 'default autoLoop=true means checkbox must start checked').to.equal(
        true
      )
      expect(el0.hasAttribute('loop')).to.equal(false)

      // 2. Uncheck → must write `loop="false"` (NOT removeAttribute).
      loopInput.checked = false
      loopInput.dispatchEvent(new Event('change', { bubbles: true }))
      expect(el0.getAttribute('loop')).to.equal('false')
      expect(el0.hasAttribute('loop')).to.equal(true)

      // 3. Re-check → must write `loop="true"`.
      loopInput.checked = true
      loopInput.dispatchEvent(new Event('change', { bubbles: true }))
      expect(el0.getAttribute('loop')).to.equal('true')

      // 4. Rebind to el1 (which has loop="false") — checkbox must
      //    reflect the new cell's effective state, not stick on el0's.
      document.dispatchEvent(
        new CustomEvent('target-change', {
          detail: { index: 1, element: el1, label: '#1' },
          bubbles: true,
          composed: true,
        })
      )
      await new Promise(r => setTimeout(r, 0))
      expect(cfg.target).to.equal(el1)
      expect(loopInput.checked, 'el1 loop="false" must show unchecked').to.equal(false)

      cleanup(el0, el1, cfg)
    })
  })
})
