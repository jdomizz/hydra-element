/**
 * Wordlist-based completion for the Hydra DSL.
 *
 * The wordlist is hand-mirrored from hydra-synth's surface until PR
 * hydra-synth#211 ships `global.d.ts` upstream — then the wordlist can be
 * derived from the declarations (one source of truth for both VS Code
 * autocomplete and the browser wordlist).
 *
 * The trailing-identifier regex `/[a-zA-Z_$][\w$]*$/` matches the last
 * identifier in the editor's text. Case-insensitive prefix filter narrows
 * the list; Tab/Enter accept the highlighted match (with `stopImmediatePropagation`
 * so CodeJar's default Tab/Enter handling does not run); Esc dismisses;
 * click-outside closes.
 *
 * Position is intentionally simple (below the editor, full width) — the
 * spec defers caret-positioned dropdowns to a v0.8 follow-up.
 */

const TRAILING_IDENT = /[a-zA-Z_$][\w$]*$/

const MAX_ITEMS = 10

/**
 * The default wordlist: 44 DSL functions + 35 globals (k0..k7, g0..g7,
 * gp0..gp7, time, o0..o3, a) + 17 common JS keywords. Exported so the
 * playground can diff the live `synth` keys against it for the
 * extension-aware `addWords` demo.
 */
export const DEFAULT_WORDLIST = new Set([
  // 44 DSL functions (mirror of sweep + the hydra-scene-authoring skill)
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
  // globals
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
  // common JS keywords
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

/**
 * Escape a string for safe insertion into innerHTML.
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Wordlist + dropdown UI. Owns its own DOM (a single `<div role="listbox">`
 * passed in by the host) and its keydown handling. Stateless beyond the
 * dropdown's current items + highlight index.
 */
export class Completion {
  #editorEl
  #dropdownEl
  #wordlist
  #items = []
  #highlight = -1
  #open = false
  #onAccept = null

  /**
   * @param {HTMLElement} editorEl - The contenteditable (host of the caret).
   * @param {HTMLElement} dropdownEl - The `<div role="listbox">` to render into.
   * @param {(word: string) => void} [onAccept] - Called with the accepted word.
   *   The host uses this to replace the trailing identifier via `jar.updateCode`.
   */
  constructor(editorEl, dropdownEl, onAccept = null) {
    this.#editorEl = editorEl
    this.#dropdownEl = dropdownEl
    this.#wordlist = new Set(DEFAULT_WORDLIST)
    this.#onAccept = onAccept
  }

  /**
   * Extend the wordlist. Accepts an array of words or a space-separated
   * string. Idempotent — duplicates are ignored.
   * @param {string[]|string} words
   */
  addWords(words) {
    const list =
      typeof words === 'string'
        ? words.trim().split(/\s+/).filter(Boolean)
        : Array.isArray(words)
          ? words
          : []
    for (const w of list) {
      if (typeof w === 'string' && w.length) this.#wordlist.add(w)
    }
  }

  /**
   * Read-only access to the current wordlist (test seam + extension demo).
   * @returns {Set<string>}
   */
  get wordlist() {
    return this.#wordlist
  }

  /**
   * Whether the dropdown is currently open.
   * @returns {boolean}
   */
  get isOpen() {
    return this.#open
  }

  /**
   * Open the dropdown with the current trailing-identifier filter.
   * Called by the element's keydown handler when the user types an
   * identifier character.
   */
  open() {
    const text = this.#editorEl.textContent ?? ''
    const prefix = (text.match(TRAILING_IDENT)?.[0] ?? '').toLowerCase()
    this.#items = []
    if (prefix.length === 0) {
      this.#close()
      return
    }
    for (const word of this.#wordlist) {
      if (word.toLowerCase().startsWith(prefix)) {
        this.#items.push(word)
        if (this.#items.length >= MAX_ITEMS) break
      }
    }
    if (this.#items.length === 0) {
      this.#close()
      return
    }
    this.#highlight = 0
    this.#render()
  }

  /**
   * Close the dropdown and clear its state.
   */
  close() {
    this.#close()
  }

  #close() {
    this.#open = false
    this.#items = []
    this.#highlight = -1
    this.#dropdownEl.hidden = true
    this.#dropdownEl.innerHTML = ''
    this.#editorEl.setAttribute('aria-expanded', 'false')
    this.#editorEl.setAttribute('aria-activedescendant', '')
  }

  #render() {
    this.#open = true
    this.#dropdownEl.hidden = false
    this.#dropdownEl.innerHTML = this.#items
      .map(
        (w, i) =>
          `<div class="completion-item" part="completion-item" role="option" id="hydra-editor-opt-${i}" data-index="${i}" aria-selected="${i === this.#highlight}">${escapeHtml(w)}</div>`
      )
      .join('')
    const active = this.#dropdownEl.querySelector(`[data-index="${this.#highlight}"]`)
    if (active) active.classList.add('is-highlighted')
    this.#editorEl.setAttribute('aria-expanded', 'true')
    this.#editorEl.setAttribute('aria-activedescendant', `hydra-editor-opt-${this.#highlight}`)
  }

  #moveHighlight(delta) {
    if (!this.#open || this.#items.length === 0) return
    const next = (this.#highlight + delta + this.#items.length) % this.#items.length
    this.#highlight = next
    this.#render()
  }

  #accept() {
    if (!this.#open || this.#highlight < 0) return false
    const word = this.#items[this.#highlight]
    this.#close()
    if (this.#onAccept) this.#onAccept(word)
    return true
  }

  /**
   * Handle a keydown event. Returns `true` if the event was consumed
   * (caller should `preventDefault` + `stopImmediatePropagation` to
   * suppress CodeJar's default handling).
   * @param {KeyboardEvent} e
   * @returns {boolean}
   */
  onKeydown(e) {
    // Esc / click-outside-equivalent closes regardless of open state.
    if (e.key === 'Escape' && this.#open) {
      e.preventDefault()
      this.#close()
      return true
    }
    if (!this.#open) return false

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      return this.#accept()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.#moveHighlight(1)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.#moveHighlight(-1)
      return true
    }
    if (e.key === 'Backspace' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Defer to the next tick so the editor's textContent reflects the
      // edit, then re-evaluate the filter.
      queueMicrotask(() => this.open())
      return false
    }
    // Any other character: re-filter.
    queueMicrotask(() => this.open())
    return false
  }
}
