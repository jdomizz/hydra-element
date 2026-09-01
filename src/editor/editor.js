import { createEditor } from '@jdomizz/truss-editor'
import { highlightHydra, DEFAULT_WORDLIST } from './hydra-config.js'

/**
 * `<hydra-editor>` — CodeJar + Prism (Hydra-extended JS grammar) +
 * wordlist completion. Public element, shipped via the `hydra-element/editor`
 * subpath so consumers who don't import it pay zero bundle cost.
 *
 * The generic editing core (CodeJar mount, completion state machine,
 * caret/aria binder) lives in `@jdomizz/truss-editor`; this element
 * provides the product surface (shadow DOM, styles, a11y, Hydra config).
 *
 * Public surface (see `src/hydra-editor.d.ts`):
 *   - `value` (string, get/set; setter is a silent programmatic write)
 *   - `placeholder` (inherited)
 *   - `addWords(words)` — idempotent
 *   - `destroy()` — idempotent, safe after disconnect
 *   - `code-apply` event (Ctrl/Cmd+Enter) with `{ code: string }`
 *
 * Styling hooks (CSS parts):
 *   - `::part(editor)` — the contenteditable surface
 *   - `::part(token-function)` — DSL verb color
 *   - `::part(token-global)` — global color
 *   - `::part(completion)` — dropdown container
 *   - `::part(completion-item)` — dropdown option row
 *
 * The Prism token theme ships as inline `:where(...)` rules inside the
 * shadow root — `:where()` resets specificity to 0 so `::part(...)` rules
 * in consumer stylesheets win without `!important`.
 */
const styles = new CSSStyleSheet()
styles.replaceSync(`
  :host {
    display: block;
    position: relative;
    contain: content;
  }
  .editor {
    display: block;
    min-height: 4em;
    padding: var(--hydra-space-s, 0.5em);
    border: 1px solid var(--hydra-border, #333);
    border-radius: var(--hydra-radius-s, 4px);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: var(--hydra-text-base, 0.9rem);
    line-height: 1.5;
    color: var(--hydra-fg, inherit);
    background: var(--hydra-bg-input, #1a1a1a);
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    tab-size: 2;
    transition: border-color var(--hydra-duration-fast, 120ms) ease;
    box-sizing: border-box;
    width: 100%;
  }
  .editor:focus {
    border-color: var(--hydra-accent, #fc6);
  }
  .editor.is-empty::before {
    content: attr(data-placeholder);
    color: var(--hydra-fg-muted, #888);
    pointer-events: none;
  }
  :where(.token.function) { color: var(--hydra-accent, #fc6); font-weight: 600; }
  :where(.token.global) { color: var(--hydra-accent, #fc6); }
  :where(.token.keyword) { color: var(--hydra-fg-muted, #888); }
  :where(.token.comment) { color: var(--hydra-fg-muted, #666); font-style: italic; }
  :where(.token.string) { color: var(--hydra-fg, inherit); }
  :where(.token.number) { color: var(--hydra-fg, inherit); }
  :where(.token.operator) { color: var(--hydra-fg-muted, #888); }
  :where(.token.punctuation) { color: var(--hydra-fg-muted, #888); }
  :where(.token.boolean) { color: var(--hydra-fg, inherit); }
  :where(.token.important),
  :where(.token.regex) { color: var(--hydra-fg, inherit); }
  .completion {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 10;
    max-height: 12em;
    overflow-y: auto;
    background: var(--hydra-bg-input, #1a1a1a);
    border: 1px solid var(--hydra-border, #333);
    border-top: none;
    border-radius: 0 0 var(--hydra-radius-s, 4px) var(--hydra-radius-s, 4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85rem;
  }
  .completion-item {
    padding: 0.25em 0.5em;
    cursor: pointer;
    color: var(--hydra-fg, inherit);
  }
  .completion-item.is-highlighted {
    background: var(--hydra-bg-hover, #333);
    color: var(--hydra-fg, #fff);
  }
`)

class HydraEditor extends HTMLElement {
  #handle
  #editorEl
  #dropdownEl
  #destroyed = false

  static get observedAttributes() {
    return ['placeholder', 'aria-label']
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <div
        class="editor"
        part="editor"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        aria-expanded="false"
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
      ></div>
      <div class="completion" part="completion" role="listbox" aria-label="Code completions" hidden></div>
    `
    this.#editorEl = this.shadowRoot.querySelector('.editor')
    this.#dropdownEl = this.shadowRoot.querySelector('.completion')

    // Mount the truss-editor core on the host-provided DOM.
    this.#handle = createEditor(
      { surface: this.#editorEl, dropdown: this.#dropdownEl },
      {
        highlight: highlightHydra,
        words: DEFAULT_WORDLIST,
        completionOptionIdPrefix: 'hydra-editor-opt',
        ariaLabel: this.getAttribute('aria-label') || 'Hydra code editor',
        onInput: () => {
          this.dispatchEvent(new CustomEvent('input', { bubbles: true, composed: true }))
          this.#updateEmptyClass(this.#editorEl.textContent ?? '')
        },
        onApply: code => {
          this.dispatchEvent(
            new CustomEvent('code-apply', {
              detail: { code },
              bubbles: true,
              composed: true,
            })
          )
        },
      }
    )

    this.#applyPlaceholder()
    this.#updateEmptyClass(this.#editorEl.textContent ?? '')
  }

  /**
   * Get/set the editor's code. Setting is a programmatic write — does NOT
   * fire `input` (CodeJar's `updateCode` without `callOnUpdate`) and does
   * NOT dispatch `code-apply`. The host uses `code-apply` to react to
   * user-initiated eval.
   */
  get value() {
    return this.#handle?.value ?? this.#editorEl?.textContent ?? ''
  }

  set value(v) {
    const text = String(v ?? '')
    if (this.#handle && !this.#destroyed) {
      this.#handle.value = text
    } else if (this.#editorEl) {
      // After `destroy()`: core is gone. Set the textContent directly
      // so the test suite can verify `value` is a no-throw after teardown.
      this.#editorEl.textContent = text
    }
    this.#updateEmptyClass(text)
  }

  /**
   * Inherited `placeholder` attribute — visible when the value is empty.
   */
  get placeholder() {
    return this.getAttribute('placeholder') ?? ''
  }

  set placeholder(v) {
    this.setAttribute('placeholder', v)
  }

  /**
   * Extend the completion wordlist. Idempotent. Accepts an array or a
   * space-separated string. The host (or any consumer) calls this after
   * loading an extension that adds new DSL functions, so the dropdown
   * grows with the live surface.
   * @param {string[]|string} words
   */
  addWords(words) {
    this.#handle?.addWords(words)
  }

  /**
   * Tear down the truss-editor core, the completion dropdown, and the
   * document-level click listener. Idempotent — safe to call from
   * `disconnectedCallback` and from external cleanup paths.
   */
  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#handle?.destroy()
    this.#handle = null
    document.removeEventListener('click', this.#onDocClick, true)
  }

  /**
   * Test seam — exposes the embedded Completion. Not part of the public
   * API; do not call from production code. Used by the playground's
   * extension-aware `addWords` test to verify the wordlist grew.
   */
  get completion() {
    return this.#handle?.completion
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return
    if (name === 'placeholder') this.#applyPlaceholder()
    if (name === 'aria-label') this.#applyAriaLabel()
  }

  connectedCallback() {
    document.addEventListener('click', this.#onDocClick, true)
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#onDocClick, true)
  }

  #onDocClick = e => {
    if (!this.isConnected) return
    if (e.composedPath().includes(this)) return
    this.#handle?.completion.close()
  }

  #applyPlaceholder() {
    if (!this.#editorEl) return
    const p = this.getAttribute('placeholder') ?? ''
    if (p) {
      this.#editorEl.dataset.placeholder = p
    } else {
      delete this.#editorEl.dataset.placeholder
    }
    this.#updateEmptyClass(this.#editorEl.textContent ?? '')
  }

  #applyAriaLabel() {
    if (!this.#editorEl) return
    const label = this.getAttribute('aria-label') || 'Hydra code editor'
    this.#editorEl.setAttribute('aria-label', label)
  }

  #updateEmptyClass(text) {
    if (!this.#editorEl) return
    this.#editorEl.classList.toggle('is-empty', !text.trim())
  }
}

if (!customElements.get('hydra-editor')) {
  customElements.define('hydra-editor', HydraEditor)
}

export { HydraEditor }
