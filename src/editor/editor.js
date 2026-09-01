import { CodeJar } from 'codejar'
import { highlightHydra } from './hydra-grammar.js'
import { Completion } from './completion.js'

const TRAILING_IDENT = /[a-zA-Z_$][\w$]*$/

/**
 * `<hydra-editor>` — CodeJar + Prism (Hydra-extended JS grammar) +
 * wordlist completion. Public element, shipped via the `hydra-element/editor`
 * subpath so consumers who don't import it pay zero bundle cost.
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
  #jar
  #completion
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

    // Register the keydown listener BEFORE CodeJar so we can
    // `stopImmediatePropagation` on Tab/Enter when the completion
    // dropdown is open (or on Ctrl/Cmd+Enter for `code-apply`).
    this.#editorEl.addEventListener('keydown', this.#onKeydown)

    // CodeJar is a factory function (returns a CodeJar instance), not a
    // constructor — `new-cap` is a documented exception. (See codejar docs.)
    // eslint-disable-next-line new-cap
    this.#jar = CodeJar(this.#editorEl, highlightHydra, {
      tab: '  ',
      spellcheck: false,
      addClosing: false,
    })
    this.#jar.onUpdate(this.#onUpdate)

    this.#completion = new Completion(this.#editorEl, this.#dropdownEl, word =>
      this.#acceptCompletion(word)
    )

    this.#applyPlaceholder()
    this.#applyAriaLabel()
  }

  /**
   * Get/set the editor's code. Setting is a programmatic write — does NOT
   * fire `input` (CodeJar's `updateCode` without `callOnUpdate`) and does
   * NOT dispatch `code-apply`. The host uses `code-apply` to react to
   * user-initiated eval.
   */
  get value() {
    return this.#editorEl?.textContent ?? ''
  }

  set value(v) {
    const text = String(v ?? '')
    if (this.#jar && !this.#destroyed) {
      try {
        // `callOnUpdate = false` suppresses CodeJar's `onUpdate` callback
        // so the programmatic write doesn't dispatch `input` (the host
        // would otherwise persist via its `input` listener — spec:
        // programmatic setter is silent; only user typing fires `input`).
        this.#jar.updateCode(text, false)
      } catch {
        this.#editorEl.textContent = text
      }
      this.#updateEmptyClass(text)
    } else if (this.#editorEl) {
      // After `destroy()`: CodeJar is gone. Set the textContent directly
      // so the test suite can verify `value` is a no-throw after teardown.
      this.#editorEl.textContent = text
    }
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
    this.#completion?.addWords(words)
  }

  /**
   * Tear down CodeJar, the completion dropdown, and the document-level
   * click listener. Idempotent — safe to call from `disconnectedCallback`
   * and from external cleanup paths.
   */
  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true
    try {
      this.#jar?.destroy()
    } catch {
      // CodeJar may have already torn down internally; ignore.
    }
    this.#jar = null
    document.removeEventListener('click', this.#onDocClick, true)
    this.#completion?.close()
  }

  /**
   * Test seam — exposes the embedded Completion. Not part of the public
   * API; do not call from production code. Used by the playground's
   * extension-aware `addWords` test to verify the wordlist grew.
   */
  get completion() {
    return this.#completion
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
    this.#completion?.close()
  }

  #onUpdate = text => {
    this.#updateEmptyClass(text)
    this.dispatchEvent(new CustomEvent('input', { bubbles: true, composed: true }))
  }

  #onKeydown = e => {
    // Ctrl/Cmd+Enter dispatches `code-apply` regardless of completion state.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.dispatchEvent(
        new CustomEvent('code-apply', {
          detail: { code: this.value },
          bubbles: true,
          composed: true,
        })
      )
      this.#completion?.close()
      return
    }
    // Let the completion handle navigation / accept keys first.
    if (this.#completion?.onKeydown(e)) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }

  #acceptCompletion(word) {
    const text = this.#editorEl.textContent ?? ''
    const m = text.match(TRAILING_IDENT)
    if (!m) {
      // No trailing identifier — append the word at the end.
      const next = text + word
      this.#jar?.updateCode(next)
      return
    }
    const start = m.index
    const next = text.slice(0, start) + word
    this.#jar?.updateCode(next)
    // Restore the caret to the end of the inserted word.
    queueMicrotask(() => {
      const sel = this.#editorEl.ownerDocument.getSelection()
      if (!sel) return
      const range = this.#editorEl.ownerDocument.createRange()
      const target = this.#findTextNodeAt(next.length)
      if (target) {
        range.setStart(target, next.length)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    })
  }

  #findTextNodeAt(offset) {
    const walker = this.#editorEl.ownerDocument.createTreeWalker(
      this.#editorEl,
      4 /* NodeFilter.SHOW_TEXT */
    )
    let consumed = 0
    let node = walker.nextNode()
    while (node) {
      const len = node.nodeValue.length
      if (consumed + len >= offset) {
        return { nodeValue: node, node }
      }
      consumed += len
      node = walker.nextNode()
    }
    return null
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
