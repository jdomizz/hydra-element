/**
 * <preset-selector> — `<select>` populated from `presets` property. Each
 * option shows `title — description`. On change, dispatches
 * `preset-change` with `slot` (active slot, 0..3 by default) and the
 * preset's code, then sets `target.code` on the corresponding element.
 *
 * Property:
 *   presets — array of `{ title, description, code }`. Reassigning
 *             rebuilds the option list (current selection is lost).
 *   target  — the active slot's `<hydra-element>`. Setting `target` does
 *             not change which slot the event reports; see `slot`.
 *   slot    — current slot index (0..3). Setter updates the internal
 *             default; `target-change` events on `document` keep it in sync.
 *
 * Events:
 *   preset-change — detail: `{ title, code, slot }`. Bubbling + composed
 *                   so it crosses shadow boundaries if used nested.
 *
 * After a selection, the `<select>` resets to its placeholder so the
 * same preset can be re-picked (and dispatched) without UI gymnastics.
 *
 * `requires` data on a preset is informational — the consumer decides
 * whether to bump `sources` / `outputs` before evaluating.
 */
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
  select {
    width: 100%;
    font-family: inherit;
    font-size: var(--hydra-text-s);
    color: var(--hydra-fg);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    padding: var(--hydra-space-xs) var(--hydra-space-s);
    cursor: pointer;
    transition: border-color var(--hydra-duration-fast) var(--hydra-easing);
  }
  select:hover,
  select:focus {
    border-color: var(--hydra-accent);
    outline: none;
  }
  option {
    background: var(--hydra-bg-input);
    color: var(--hydra-fg);
  }
`)

class PresetSelector extends HTMLElement {
  #target = null
  #select
  #presets = []
  #slot = 0

  #onTargetChange = e => {
    const { index, element } = e.detail || {}
    if (typeof index === 'number') this.#slot = index
    if (element) this.#target = element
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <h2>Presets</h2>
      <select aria-label="Select a preset sketch">
        <option value="" disabled selected>— pick a preset —</option>
      </select>
    `
    this.#select = this.shadowRoot.querySelector('select')
    this.#select.addEventListener('change', () => this.#onChange())
  }

  connectedCallback() {
    document.addEventListener('target-change', this.#onTargetChange)
  }

  disconnectedCallback() {
    document.removeEventListener('target-change', this.#onTargetChange)
    this.#target = null
  }

  get presets() {
    return this.#presets
  }

  set presets(list) {
    this.#presets = Array.isArray(list) ? list : []
    this.#rebuildOptions()
  }

  get target() {
    return this.#target
  }

  set target(el) {
    this.#target = el
  }

  get slot() {
    return this.#slot
  }

  set slot(n) {
    const next = Math.max(0, Math.floor(Number(n)) || 0)
    this.#slot = next
  }

  #rebuildOptions() {
    const select = this.#select
    while (select.options.length > 1) select.remove(1)
    for (const preset of this.#presets) {
      const opt = document.createElement('option')
      opt.value = preset.code
      opt.textContent = `${preset.title} — ${preset.description}`
      opt.dataset.title = preset.title
      select.append(opt)
    }
  }

  #onChange() {
    const { value } = this.#select
    if (!value) return
    const title = this.#select.options[this.#select.selectedIndex]?.dataset?.title || ''
    const detail = { title, code: value, slot: this.#slot }

    if (this.#target) this.#target.code = value

    this.#select.value = ''

    this.dispatchEvent(
      new CustomEvent('preset-change', {
        detail,
        bubbles: true,
        composed: true,
      })
    )
  }
}

customElements.define('preset-selector', PresetSelector)
