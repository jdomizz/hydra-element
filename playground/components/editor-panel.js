/**
 * <editor-panel> — `<hydra-editor>` element + Cmd/Ctrl+Enter + eval button,
 * with `localStorage` persistence per slot. The element (CodeJar + Prism +
 * wordlist completion, registered via side-effect import) handles the input
 * surface, Cmd/Ctrl+Enter → `code-apply`, and a11y; this panel handles the
 * chrome (header, hint, eval button), the per-slot Map, localStorage, and
 * the host-side `target-change` / `preset-change` / `code-apply` wiring.
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
 *            editor + storage key to that slot's code.
 *
 * Event handling:
 *   - Listens for `target-change` (bubbling + composed) on `document` and
 *     updates `target` + `slot` when a different cell is picked.
 *   - Listens for `preset-change` (bubbling + composed) and applies the
 *     preset's code to the active slot (editor `value` is a silent setter,
 *     so the value is written without dispatching `code-apply` again).
 *   - Listens for `code-apply` from the element (Ctrl/Cmd+Enter) and
 *     pushes the code to `target.code`.
 *
 * Extension-aware completion: after every successful eval, the panel diffs
 * `Object.keys(target.synth.synth)` against the baseline wordlist and
 * calls `editor.addWords(newNames)` so the dropdown grows as extensions
 * load. This is the killer demo detail tying the element spec to the
 * extensions catalog (`active/playground-editor.md` §2.2).
 */
import 'hydra-editor'

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
  hydra-editor {
    flex: 1 1 auto;
    min-height: 0;
    display: block;
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
  .btn:focus-visible,
  hydra-editor:focus-visible {
    outline: 2px solid var(--hydra-accent);
    outline-offset: 2px;
  }
`)

const DEFAULT_STORAGE_KEY_PREFIX = 'hydra-element:editor'

// Mirror of `DEFAULT_WORDLIST` from `src/editor/completion.js` — 90
// entries (43 DSL + 30 globals + 17 JS keywords). Kept here as a
// separate constant because we don't import the editor module
// directly (it's a published subpath in production, the source in dev —
// the import shape differs). Once hydra-synth#211 lands and ships
// `global.d.ts`, the wordlist can be derived from the declarations and
// this duplicate disappears.
const KNOWN_WORDS = new Set([
  'osc',
  'src',
  'solid',
  'noise',
  'shape',
  'voronoi',
  'kaleid',
  'rotate',
  'scale',
  'hue',
  'saturate',
  'contrast',
  'add',
  'luma',
  'grain',
  'scanline',
  'dither',
  'chromatic',
  'vignette',
  'tri',
  'square',
  'saw',
  'invert',
  'colorama',
  'out',
  'diff',
  'layer',
  'mask',
  'blend',
  'modulate',
  'repeat',
  'scrollX',
  'scrollY',
  'pixelate',
  'posterize',
  'shift',
  'thresh',
  'modulateScrollX',
  'modulateScrollY',
  'modulateKaleid',
  'modulateRepeat',
  'modulateRepeatX',
  'modulateRepeatY',
  'k0',
  'k1',
  'k2',
  'k3',
  'k4',
  'k5',
  'k6',
  'k7',
  'g0',
  'g1',
  'g2',
  'g3',
  'g4',
  'g5',
  'g6',
  'g7',
  'gp0',
  'gp1',
  'gp2',
  'gp3',
  'gp4',
  'gp5',
  'gp6',
  'gp7',
  'time',
  'o0',
  'o1',
  'o2',
  'o3',
  'a',
  'const',
  'let',
  'var',
  'function',
  'return',
  'await',
  'async',
  'if',
  'else',
  'for',
  'while',
  'true',
  'false',
  'null',
  'undefined',
  'new',
  'class',
])

class EditorPanel extends HTMLElement {
  #target = null
  #editor
  #storageKeyPrefix = DEFAULT_STORAGE_KEY_PREFIX
  #slot = 0
  #allSlots = new Map() // slot index → current code (kept in sync for slot switching)

  #onTargetChange = e => {
    const { index, element } = e.detail || {}
    if (typeof index !== 'number' || !element) return
    this.#allSlots.set(this.#slot, this.#editor.value)
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

  #onCodeApply = _e => {
    if (!this.#target) return
    this.#target.code = this.#editor.value
    // After a successful eval, diff the live synth keys against the
    // baseline and feed new names into the completion dropdown. The
    // promise is fire-and-forget; eval errors don't block the wordlist
    // growth (some extensions register before the eval throws).
    this.#harvestExtensionWords()
  }

  #onInput = () => {
    this.#allSlots.set(this.#slot, this.#editor.value)
    this.#persist()
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
      <hydra-editor
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
        placeholder="osc(10, 0.2, 0.5).out()"
        aria-label="Hydra code editor"
      ></hydra-editor>
    `
    this.#editor = this.shadowRoot.querySelector('hydra-editor')
    this.#editor.addEventListener('input', this.#onInput)
    this.#editor.addEventListener('code-apply', this.#onCodeApply)
    this.shadowRoot.querySelector('[data-eval]').addEventListener('click', () => this.#eval())
    // The editor element handles Cmd/Ctrl+Enter internally and dispatches
    // `code-apply`; the panel listens for that and pushes the code to
    // `target.code`. We don't attach a separate `keydown` listener here.
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
    document.removeEventListener('code-apply', this.#onCodeApply)
    try {
      this.#editor?.destroy?.()
    } catch {}
    this.#target = null
  }

  get value() {
    return this.#editor.value
  }

  set value(v) {
    const text = String(v)
    this.#editor.value = text
    this.#allSlots.set(this.#slot, text)
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
    this.#allSlots.set(this.#slot, this.#editor.value)
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
      this.#editor.value = saved
    } else if (this.#target && this.#target.code) {
      // First visit (or cleared localStorage): seed from the element's
      // current code (typically the `textContent` default set in
      // `playground/index.html`). Persist so subsequent visits read from
      // localStorage directly and don't re-derive.
      const { code } = this.#target
      this.#editor.value = code
      this.#persistSlot(this.#slot, code)
    } else {
      this.#editor.value = ''
    }
    this.#allSlots.set(this.#slot, this.#editor.value)
  }

  #eval() {
    if (!this.#target) return
    this.#target.code = this.#editor.value
    this.#harvestExtensionWords()
  }

  #harvestExtensionWords() {
    const synth = this.#target?.synth?.synth
    if (!synth) return
    let names
    try {
      names = Object.keys(synth)
    } catch {
      return
    }
    const fresh = names.filter(k => typeof k === 'string' && !KNOWN_WORDS.has(k))
    if (fresh.length) this.#editor.addWords(fresh)
  }

  #persist() {
    this.#persistSlot(this.#slot, this.#editor.value)
  }

  #persistSlot(slot, value) {
    try {
      localStorage.setItem(this.#storageKey(slot), value)
    } catch {}
  }
}

customElements.define('editor-panel', EditorPanel)
