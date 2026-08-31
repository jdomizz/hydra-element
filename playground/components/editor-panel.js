/**
 * <editor-panel> — textarea + Cmd/Ctrl+Enter + eval button, with
 * `localStorage` persistence per slot.
 *
 * Attributes:
 *   storage-key-prefix — `localStorage` key prefix (default
 *                        `hydra-element:editor`). Final key is
 *                        `${prefix}:<slot>`. Four slots = four keys.
 *
 * Property:
 *   target — the `<hydra-element>` reference for the active slot. Must be
 *            set by the orchestrator (`playground/main.js`), not via a
 *            global selector.
 *   slot   — 0..3, the active slot index. Setting it switches the
 *            textarea + storage key to that slot's code.
 *
 * Event handling:
 *   - Listens for `target-change` (bubbling + composed) on `document` and
 *     updates `target` + `slot` when a different cell is picked.
 *   - Listens for `preset-change` (bubbling + composed) and applies the
 *     preset's code to the active slot.
 *
 * Persistence model:
 *   - On connect, restore from `localStorage` if the slot's key is set.
 *   - On every input, save to `localStorage` under the slot's key.
 *   - Programmatic `value` setters (including URL hydration and
 *     `<preset-selector>` events) also persist.
 *
 * Eval flow:
 *   - Cmd/Ctrl+Enter OR clicking the eval button → `target.code = value`.
 */
const styles = new CSSStyleSheet()
styles.replaceSync(`
  :host {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hydra-space-s);
    margin-bottom: var(--hydra-space-s);
  }
  h2 {
    margin: 0;
    font-size: var(--hydra-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--hydra-fg-muted);
  }
  .hint {
    font-size: var(--hydra-text-xs);
    color: var(--hydra-fg-muted);
  }
  textarea {
    flex: 1 1 auto;
    width: 100%;
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    resize: none;
    padding: var(--hydra-space-s);
    font-family: inherit;
    font-size: var(--hydra-text-base);
    color: var(--hydra-fg);
    background: var(--hydra-bg-input);
    min-height: 0;
    line-height: 1.5;
    transition: border-color var(--hydra-duration-fast) var(--hydra-easing);
  }
  textarea:hover {
    border-color: var(--hydra-border-strong);
  }
  .btn {
    font-family: inherit;
    font-size: var(--hydra-text-s);
    color: var(--hydra-fg);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    padding: var(--hydra-space-xs) var(--hydra-space-s);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    line-height: 1.2;
    transition:
      border-color var(--hydra-duration-fast) var(--hydra-easing),
      background-color var(--hydra-duration-fast) var(--hydra-easing),
      color var(--hydra-duration-fast) var(--hydra-easing);
  }
  .btn:hover {
    border-color: var(--hydra-accent);
    background: var(--hydra-bg-hover);
  }
  .btn:active {
    transform: translateY(1px);
  }
  .btn[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn--primary {
    background: var(--hydra-accent);
    color: var(--hydra-accent-fg);
    border-color: var(--hydra-accent);
    font-weight: 700;
  }
  .btn--primary:hover {
    background: color-mix(in oklab, var(--hydra-accent) 88%, white);
    border-color: color-mix(in oklab, var(--hydra-accent) 88%, white);
  }
`)

const DEFAULT_STORAGE_KEY_PREFIX = 'hydra-element:editor'

class EditorPanel extends HTMLElement {
  #target = null
  #textarea
  #storageKeyPrefix = DEFAULT_STORAGE_KEY_PREFIX
  #slot = 0
  #allSlots = new Map() // slot index → current code (kept in sync for slot switching)

  #onTargetChange = e => {
    const { index, element } = e.detail || {}
    if (typeof index !== 'number' || !element) return
    this.#allSlots.set(this.#slot, this.#textarea.value)
    // Update the target BEFORE the slot setter runs `hydrateFromStorage`,
    // so the `target.code` fallback sees the new element.
    this.#target = element
    this.slot = index
  }

  #onPresetChange = e => {
    const { slot, code } = e.detail || {}
    if (typeof slot !== 'number' || typeof code !== 'string') return
    this.#allSlots.set(slot, code)
    if (slot === this.#slot) {
      this.value = code
    } else {
      this.#persistSlot(slot, code)
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <header>
        <h2>Editor</h2>
        <span class="hint" data-hint>Cmd / Ctrl + Enter</span>
        <button type="button" class="btn btn--primary" data-eval>eval</button>
      </header>
      <textarea
        spellcheck="false"
        placeholder="osc(10, 0.2, 0.5).out()"
        aria-label="Hydra code editor"
      ></textarea>
    `
    this.#textarea = this.shadowRoot.querySelector('textarea')
    this.#textarea.addEventListener('input', () => this.#onInput())
    this.#textarea.addEventListener('keydown', e => this.#onKeydown(e))
    this.shadowRoot.querySelector('[data-eval]').addEventListener('click', () => this.#eval())
  }

  connectedCallback() {
    const prefixAttr = this.getAttribute('storage-key-prefix')
    if (prefixAttr) this.#storageKeyPrefix = prefixAttr

    this.#hydrateFromStorage()
    document.addEventListener('target-change', this.#onTargetChange)
    document.addEventListener('preset-change', this.#onPresetChange)
  }

  disconnectedCallback() {
    document.removeEventListener('target-change', this.#onTargetChange)
    document.removeEventListener('preset-change', this.#onPresetChange)
    this.#target = null
  }

  get value() {
    return this.#textarea.value
  }

  set value(v) {
    this.#textarea.value = String(v)
    this.#allSlots.set(this.#slot, String(v))
    this.#persist()
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
    this.#allSlots.set(this.#slot, this.#textarea.value)
    this.#slot = next
    this.#hydrateFromStorage()
  }

  #storageKey(slot = this.#slot) {
    return `${this.#storageKeyPrefix}:${slot}`
  }

  #hydrateFromStorage() {
    let saved = null
    try {
      saved = localStorage.getItem(this.#storageKey())
    } catch {}

    if (saved !== null) {
      this.#textarea.value = saved
    } else if (this.#target && this.#target.code) {
      // First visit (or cleared localStorage): seed from the element's
      // current code (typically the `textContent` default set in
      // `playground/index.html`). Persist so subsequent visits read from
      // localStorage directly and don't re-derive.
      this.#textarea.value = this.#target.code
      this.#persistSlot(this.#slot, this.#target.code)
    } else {
      this.#textarea.value = ''
    }
    this.#allSlots.set(this.#slot, this.#textarea.value)
  }

  #onKeydown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      this.#eval()
    }
  }

  #onInput() {
    this.#allSlots.set(this.#slot, this.#textarea.value)
    this.#persist()
  }

  #eval() {
    if (!this.#target) return
    this.#target.code = this.#textarea.value
  }

  #persist() {
    this.#persistSlot(this.#slot, this.#textarea.value)
  }

  #persistSlot(slot, value) {
    try {
      localStorage.setItem(this.#storageKey(slot), value)
    } catch {}
  }
}

customElements.define('editor-panel', EditorPanel)
