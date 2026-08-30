/**
 * <editor-panel> — textarea + Cmd/Ctrl+Enter + eval button, with
 * `localStorage` persistence.
 *
 * Attributes:
 *   target      — selector for the `<hydra-element>`
 *   storage-key — `localStorage` key (default `hydra-element:editor`)
 *
 * Persistence model:
 *   - On connect, restore from `localStorage` if the key is set.
 *   - On every input, save to `localStorage`.
 *   - Programmatic `value` setters (including `?code=` hydration and
 *     `<preset-selector>` events) also persist.
 *   - URL `?code=` hydration is performed by `playground/main.js`,
 *     which sets `editor.value` directly after connect.
 *
 * Eval flow:
 *   - Cmd/Ctrl+Enter OR clicking the eval button → `target.code = value`.
 *   - The hydra-element's own setter then dispatches `hydra-eval`.
 *
 * Reflects `preset-change` events (bubbling + composed) so that picking
 * a preset updates the textarea alongside evaluating the code.
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
  .actions {
    display: flex;
    align-items: center;
    gap: var(--hydra-space-s);
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
`)

const DEFAULT_STORAGE_KEY = 'hydra-element:editor'

class EditorPanel extends HTMLElement {
  #target = null
  #textarea
  #storageKey = DEFAULT_STORAGE_KEY
  #onPresetChange = (e) => {
    this.value = e.detail.code
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <header>
        <h2>Editor</h2>
        <div class="actions">
          <span class="hint">Cmd / Ctrl + Enter</span>
          <button type="button" class="btn btn--primary" data-eval>eval</button>
        </div>
      </header>
      <textarea
        spellcheck="false"
        placeholder="osc(10, 0.2, 0.5).out()"
        aria-label="Hydra code editor"
      ></textarea>
    `
    this.#textarea = this.shadowRoot.querySelector('textarea')
    this.#textarea.addEventListener('input', () => this.#persist())
    this.#textarea.addEventListener('keydown', (e) => this.#onKeydown(e))
    this.shadowRoot.querySelector('[data-eval]').addEventListener('click', () => this.#eval())
  }

  connectedCallback() {
    const key = this.getAttribute('storage-key')
    if (key) this.#storageKey = key

    try {
      const saved = localStorage.getItem(this.#storageKey)
      if (saved !== null) this.#textarea.value = saved
    } catch {}

    this.#target = this.#resolveTarget()
    document.addEventListener('preset-change', this.#onPresetChange)
  }

  disconnectedCallback() {
    document.removeEventListener('preset-change', this.#onPresetChange)
    this.#target = null
  }

  get value() {
    return this.#textarea.value
  }

  set value(v) {
    this.#textarea.value = String(v)
    this.#persist()
  }

  #resolveTarget() {
    const sel = this.getAttribute('target')
    if (!sel) return null
    return document.querySelector(sel)
  }

  #onKeydown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      this.#eval()
    }
  }

  #eval() {
    const target = this.#target
    if (!target) return
    target.code = this.#textarea.value
  }

  #persist() {
    try {
      localStorage.setItem(this.#storageKey, this.#textarea.value)
    } catch {}
  }
}

customElements.define('editor-panel', EditorPanel)
