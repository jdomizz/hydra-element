/**
 * <cfg-form> — checkbox + number controls bound to the
 * `<hydra-element>` attributes: `audio`, `global`, `loop`, `sources`,
 * `outputs`. Bidirectional sync: changing a control reflects onto the
 * element, and changing the element programmatically reflects here.
 *
 * Property:
 *   target — the `<hydra-element>` reference. Must be set by the
 *            orchestrator (`playground/main.js`), not via a global
 *            selector. A `MutationObserver` is attached when target
 *            is bound so attribute changes flow back into the form.
 *
 * Why hardcoded schema (not `schema` property): these are exactly the
 * attributes the playground exposes; there's no second consumer. Adding
 * a `schema` prop without a real consumer would violate
 * `engineering-principles` Rule 2 (no future-proofing).
 */
const BOOLEAN_ATTRS = ['audio', 'global', 'loop']
const NUMBER_ATTRS = [
  { name: 'sources', min: 1, max: 16 },
  { name: 'outputs', min: 1, max: 16 },
]

const styles = new CSSStyleSheet()
styles.replaceSync(`
  :host {
    display: block;
  }
  h2 {
    margin: 0 0 var(--hydra-space-s) 0;
    font-size: var(--hydra-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--hydra-fg-muted);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: var(--hydra-space-xs);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hydra-space-s);
    padding: var(--hydra-space-xs) var(--hydra-space-s);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    font-size: var(--hydra-text-s);
    transition: border-color var(--hydra-duration-fast) var(--hydra-easing);
  }
  .row:hover {
    border-color: var(--hydra-border-strong);
  }
  .row.is-disabled {
    opacity: 0.5;
  }
  label {
    display: flex;
    align-items: center;
    gap: var(--hydra-space-s);
    cursor: pointer;
    flex: 1 1 auto;
  }
  input[type='number'] {
    width: 4rem;
  }
  .hint {
    display: block;
    font-size: var(--hydra-text-xs);
    color: var(--hydra-fg-muted);
    margin-top: var(--hydra-space-xs);
  }
`)

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

class CfgForm extends HTMLElement {
  #target = null
  #observer = null
  #globalRow = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <h2>Config</h2>
      <form onsubmit="event.preventDefault()"></form>
      <span class="hint" data-global-hint>publish on window._hydra</span>
    `
    this.#render()
  }

  connectedCallback() {
    if (this.#target) this.#bindTarget()
  }

  disconnectedCallback() {
    this.#unbindTarget()
    this.#target = null
  }

  get target() {
    return this.#target
  }

  set target(el) {
    if (this.#target === el) return
    if (this.isConnected) this.#unbindTarget()
    this.#target = el
    if (this.isConnected) this.#bindTarget()
  }

  #render() {
    const form = this.shadowRoot.querySelector('form')

    for (const name of BOOLEAN_ATTRS) {
      const row = document.createElement('div')
      row.className = 'row'
      row.dataset.row = name
      row.innerHTML = `
        <label>
          <input type="checkbox" data-toggle="${name}" />
          <span>${name}</span>
        </label>
      `
      form.append(row)
      if (name === 'global') this.#globalRow = row
    }

    for (const { name, min, max } of NUMBER_ATTRS) {
      const row = document.createElement('div')
      row.className = 'row'
      row.innerHTML = `
        <label for="cfg-${name}">${name}</label>
        <input type="number" data-number="${name}" min="${min}" max="${max}" step="1" value="4" />
      `
      form.append(row)
    }

    form.addEventListener('change', (e) => this.#onChange(e))
  }

  #bindTarget() {
    this.#syncFromTarget()
    this.#updateGlobalAvailability()
    this.#observer = new MutationObserver(() => this.#syncFromTarget())
    this.#observer.observe(this.#target, {
      attributes: true,
      attributeFilter: ['audio', 'global', 'loop', 'sources', 'outputs'],
    })
  }

  #unbindTarget() {
    this.#observer?.disconnect()
    this.#observer = null
  }

  #onChange(e) {
    const t = this.#target
    if (!t) return
    const t2 = e.target
    const {toggle} = t2.dataset
    const {number} = t2.dataset
    if (toggle) {
      if (toggle === 'global' && t2.disabled) return
      this.#applyAttr(t, toggle, t2.checked ? 'true' : null)
    } else if (number) {
      const cfg = NUMBER_ATTRS.find((c) => c.name === number)
      const n = clamp(parseInt(t2.value, 10) || cfg.min, cfg.min, cfg.max)
      t2.value = String(n)
      this.#applyAttr(t, number, String(n))
    }
  }

  #applyAttr(el, name, value) {
    if (value === null || value === undefined || value === '') {
      el.removeAttribute(name)
    } else {
      el.setAttribute(name, value)
    }
  }

  #syncFromTarget() {
    const t = this.#target
    if (!t) return
    for (const name of BOOLEAN_ATTRS) {
      const input = this.shadowRoot.querySelector(`[data-toggle="${name}"]`)
      if (input) input.checked = t.hasAttribute(name)
    }
    for (const { name } of NUMBER_ATTRS) {
      const input = this.shadowRoot.querySelector(`[data-number="${name}"]`)
      if (input) input.value = t.getAttribute(name) || '4'
    }
  }

  #updateGlobalAvailability() {
    const total = document.querySelectorAll('hydra-element').length
    const toggle = this.shadowRoot.querySelector('[data-toggle="global"]')
    const hint = this.shadowRoot.querySelector('[data-global-hint]')
    if (!toggle || !this.#globalRow) return

    if (total > 1) {
      toggle.disabled = true
      this.#globalRow.classList.add('is-disabled')
      this.#globalRow.title = 'global is disabled: more than one <hydra-element> on the page'
      if (hint) hint.textContent = 'publish on window._hydra (disabled: multiple instances)'
    } else {
      this.#globalRow.title = 'publishes hydra on window._hydra when on'
      if (hint) hint.textContent = 'publish on window._hydra'
    }
  }
}

customElements.define('cfg-form', CfgForm)
