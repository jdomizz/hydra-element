/**
 * <editor-panel> — textarea + Cmd/Ctrl+Enter + eval / share / open-in-ojack
 * buttons, with `localStorage` persistence.
 *
 * Attributes:
 *   storage-key — `localStorage` key (default `hydra-element:editor`)
 *
 * Property:
 *   target — the `<hydra-element>` reference. Must be set by the
 *            orchestrator (`playground/main.js`), not via a global
 *            selector.
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
 * Share flow:
 *   - Clicking share encodes the current textarea value as base64 of
 *     UTF-8 (inverse of `decodeUrlCode` in `playground/main.js:22-31`),
 *     copies `${origin}${pathname}?code=...` to the clipboard via
 *     `navigator.clipboard.writeText` (with a hidden-input +
 *     `execCommand('copy')` fallback), replaces the URL bar via
 *     `history.replaceState`, and briefly flashes "copied!" in the
 *     hint slot.
 *   - Share and eval are orthogonal — sharing does not eval.
 *
 * Open-in-ojack link:
 *   - Adjacent `<a target="_blank" rel="noopener">` whose href mirrors
 *     the share URL but routes to `https://hydra.ojack.xyz/?code=...`.
 *   - href updates on every textarea change so the link always
 *     reflects what the user is editing.
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
  .hint {
    font-size: var(--hydra-text-xs);
    color: var(--hydra-fg-muted);
  }
  .hint--copied {
    color: var(--hydra-accent);
    font-weight: 700;
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

const DEFAULT_STORAGE_KEY = 'hydra-element:editor'
const OJACK_BASE = 'https://hydra.ojack.xyz/'
const COPIED_HINT_MS = 1500

function encodeForUrl(value) {
  return btoa(unescape(encodeURIComponent(value)))
}

async function copyToClipboard(text) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  const input = document.createElement('input')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.append(input)
  input.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {}
  input.remove()
  return ok
}

class EditorPanel extends HTMLElement {
  #target = null
  #textarea
  #hint
  #ojackLink
  #shareButton
  #storageKey = DEFAULT_STORAGE_KEY
  #copiedTimer = null
  #onPresetChange = e => {
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
          <span class="hint" data-hint>Cmd / Ctrl + Enter</span>
          <button type="button" class="btn" data-share>share</button>
          <a
            class="btn"
            data-ojack
            target="_blank"
            rel="noopener"
            title="Open the same sketch in the ojack editor — most sketches round-trip 1:1"
            >open in ojack</a
          >
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
    this.#hint = this.shadowRoot.querySelector('[data-hint]')
    this.#ojackLink = this.shadowRoot.querySelector('[data-ojack]')
    this.#shareButton = this.shadowRoot.querySelector('[data-share]')
    this.#textarea.addEventListener('input', () => this.#onInput())
    this.#textarea.addEventListener('keydown', e => this.#onKeydown(e))
    this.shadowRoot.querySelector('[data-eval]').addEventListener('click', () => this.#eval())
    this.#shareButton.addEventListener('click', () => this.#share())
  }

  connectedCallback() {
    const key = this.getAttribute('storage-key')
    if (key) this.#storageKey = key

    try {
      const saved = localStorage.getItem(this.#storageKey)
      if (saved !== null) this.#textarea.value = saved
    } catch {}

    this.#syncShareLinks()
    document.addEventListener('preset-change', this.#onPresetChange)
  }

  disconnectedCallback() {
    document.removeEventListener('preset-change', this.#onPresetChange)
    if (this.#copiedTimer !== null) {
      clearTimeout(this.#copiedTimer)
      this.#copiedTimer = null
    }
    this.#target = null
  }

  get value() {
    return this.#textarea.value
  }

  set value(v) {
    this.#textarea.value = String(v)
    this.#persist()
    this.#syncShareLinks()
  }

  get target() {
    return this.#target
  }

  set target(el) {
    this.#target = el
  }

  #onKeydown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      this.#eval()
    }
  }

  #onInput() {
    this.#persist()
    this.#syncShareLinks()
  }

  #eval() {
    if (!this.#target) return
    this.#target.code = this.#textarea.value
  }

  async #share() {
    const payload = encodeForUrl(this.#textarea.value)
    const url = `${location.origin}${location.pathname}?code=${payload}`
    try {
      history.replaceState(null, '', `?code=${payload}`)
    } catch {}
    await copyToClipboard(url)
    this.#flashCopied()
  }

  #syncShareLinks() {
    const payload = encodeForUrl(this.#textarea.value)
    if (this.#ojackLink) this.#ojackLink.href = `${OJACK_BASE}?code=${payload}`
  }

  #flashCopied() {
    if (!this.#hint) return
    if (this.#copiedTimer !== null) clearTimeout(this.#copiedTimer)
    const original = this.#hint.dataset.original || this.#hint.textContent
    this.#hint.dataset.original = original
    this.#hint.textContent = 'copied!'
    this.#hint.classList.add('hint--copied')
    this.#copiedTimer = setTimeout(() => {
      this.#hint.textContent = original
      this.#hint.classList.remove('hint--copied')
      this.#copiedTimer = null
    }, COPIED_HINT_MS)
  }

  #persist() {
    try {
      localStorage.setItem(this.#storageKey, this.#textarea.value)
    } catch {}
  }
}

customElements.define('editor-panel', EditorPanel)
