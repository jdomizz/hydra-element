/**
 * <multi-log> — append-only event log that follows the currently
 * selected `<hydra-element>`. Subscribes to `target-change` on
 * `document` and re-binds to whichever cell the user clicks; only the
 * active cell's events are shown.
 *
 * Attribute:
 *   limit — max rendered lines (default 80, oldest dropped first)
 *
 * Property:
 *   targets — array of `<hydra-element>` references. Optional; used
 *             only to discover the page's elements for `data-targets`
 *             reporting. The actual binding is driven by `target-change`
 *             events dispatched by the orchestrator.
 *
 * Replaces the earlier `<gallery-log>` (single-target, used before
 * `playground-multi-instance-mode.md`). The header now reads "Log" —
 * the multi-instance-ness is obvious from the page itself.
 */
const DEFAULT_LIMIT = 80

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
  /* The clear button uses the global .btn classes, but its shadow root
     doesn't inherit global CSS — define them here. Kept in sync with
     playground/css/components.css (the .btn and .btn--ghost rules).
     Future refactor would share via adoptedStyleSheets once the build
     supports it. */
  .btn {
    font-family: inherit;
    font-size: var(--hydra-text-s);
    color: var(--hydra-fg);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    padding: var(--hydra-space-xs) var(--hydra-space-s);
    cursor: pointer;
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
  .btn--ghost {
    background: transparent;
    border-color: transparent;
    color: var(--hydra-fg-muted);
  }
  .btn--ghost:hover {
    color: var(--hydra-fg);
    background: var(--hydra-bg-hover);
    border-color: var(--hydra-border);
  }
  button:focus-visible,
  pre:focus-visible {
    outline: 2px solid var(--hydra-accent);
    outline-offset: 2px;
  }
  h2 {
    margin: 0;
    font-size: var(--hydra-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--hydra-fg-muted);
  }
  pre {
    flex: 1 1 auto;
    margin: 0;
    padding: var(--hydra-space-s);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    color: var(--hydra-fg);
    font-size: var(--hydra-text-xs);
    line-height: 1.45;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 0;
    contain: layout style paint;
    max-height: 22rem;
  }
  .empty {
    color: var(--hydra-fg-muted);
    font-style: italic;
  }
  .line {
    display: block;
    animation: fade-in var(--hydra-duration-fast) var(--hydra-easing);
  }
  .ts {
    color: var(--hydra-fg-subtle);
  }
  .src {
    color: var(--hydra-accent);
    font-weight: 700;
    margin: 0 var(--hydra-space-xs);
  }
  .name {
    font-weight: 700;
    margin: 0 var(--hydra-space-xs);
  }
  .name--success { color: var(--hydra-log-success); }
  .name--error   { color: var(--hydra-log-error); }
  .name--warn    { color: var(--hydra-log-warn); }
  .name--info    { color: var(--hydra-log-info); }
`)

function truncateSynth(synth) {
  if (!synth) return '{}'
  const { time = 0, bpm = 0, stats = {} } = synth
  return `{ time: ${time.toFixed(2)}, bpm: ${bpm}, fps: ${(stats.fps || 0).toFixed(1)} }`
}

function fmtTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
    2,
    '0'
  )}:${String(d.getSeconds()).padStart(2, '0')}`
}

function cellLabel(el) {
  if (!el) return '?'
  const m = el.id?.match(/(\d+)$/)
  return m ? `#${m[1]}` : el.id || '?'
}

class MultiLog extends HTMLElement {
  #target = null
  #list
  #empty
  #limit = DEFAULT_LIMIT
  #handlers = null // { target, onReady, onEval, onResize, onContextLost } | null

  #onTargetChange = e => {
    const { element } = e.detail || {}
    if (!element || element === this.#target) return
    this.#unbind()
    this.#bind(element)
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <header>
        <h2>Log</h2>
        <slot name="stats"></slot>
        <button type="button" class="btn btn--ghost" data-clear>clear</button>
      </header>
      <pre data-list aria-live="polite"></pre>
    `
    this.#list = this.shadowRoot.querySelector('[data-list]')
    this.#empty = document.createElement('span')
    this.#empty.className = 'empty'
    this.#empty.textContent = 'no target selected'
    this.#list.append(this.#empty)
    this.shadowRoot.querySelector('[data-clear]').addEventListener('click', () => this.#clear())
  }

  connectedCallback() {
    const limitAttr = parseInt(this.getAttribute('limit') || '', 10)
    if (Number.isFinite(limitAttr) && limitAttr > 0) this.#limit = limitAttr

    document.addEventListener('target-change', this.#onTargetChange)
  }

  disconnectedCallback() {
    document.removeEventListener('target-change', this.#onTargetChange)
    this.#unbind()
  }

  get target() {
    return this.#target
  }

  set target(el) {
    if (el === this.#target) return
    this.#unbind()
    if (el) this.#bind(el)
  }

  #bind(t) {
    const onReady = e => this.#append(t, 'success', 'hydra-ready', truncateSynth(e.detail?.synth))
    const onEval = e => {
      if (e.detail?.success) {
        this.#append(t, 'success', 'hydra-eval', 'success=true')
      } else {
        const msg = e.detail?.error?.message || String(e.detail?.error || 'unknown')
        this.#append(t, 'error', 'hydra-eval', `success=false ${msg}`)
      }
    }
    const onResize = e => {
      const { width, height } = e.detail || {}
      this.#append(t, 'info', 'hydra-element-resize', `{ width: ${width}, height: ${height} }`)
    }
    const onContextLost = () => this.#append(t, 'warn', 'hydra-context-lost', '(recovered)')

    t.addEventListener('hydra-ready', onReady)
    t.addEventListener('hydra-eval', onEval)
    t.addEventListener('hydra-element-resize', onResize)
    t.addEventListener('hydra-context-lost', onContextLost)
    this.#handlers = { target: t, onReady, onEval, onResize, onContextLost }
    this.#target = t

    if (t.ready) {
      t.ready.then(({ synth }) => this.#append(t, 'success', 'hydra-ready', truncateSynth(synth)))
    }
  }

  #unbind() {
    if (!this.#handlers) {
      this.#target = null
      return
    }
    const { target: t, onReady, onEval, onResize, onContextLost } = this.#handlers
    t.removeEventListener('hydra-ready', onReady)
    t.removeEventListener('hydra-eval', onEval)
    t.removeEventListener('hydra-element-resize', onResize)
    t.removeEventListener('hydra-context-lost', onContextLost)
    this.#handlers = null
    this.#target = null
  }

  #clear() {
    this.#list.replaceChildren()
    const empty = document.createElement('span')
    empty.className = 'empty'
    empty.textContent = 'log cleared'
    this.#list.append(empty)
    this.#empty = empty
  }

  #append(target, kind, name, detail) {
    if (this.#empty && this.#empty.parentNode === this.#list) {
      this.#empty.remove()
      this.#empty = null
    }

    const ts = document.createElement('span')
    ts.className = 'ts'
    ts.textContent = `[${fmtTime()}]`

    const src = document.createElement('span')
    src.className = 'src'
    src.textContent = cellLabel(target)

    const ev = document.createElement('span')
    ev.className = `name name--${kind}`
    ev.textContent = name

    const body = document.createElement('span')
    body.textContent = detail

    const line = document.createElement('span')
    line.className = 'line'
    line.append(ts, src, ev, body)

    this.#list.append(line)

    while (this.#list.childElementCount > this.#limit) {
      this.#list.firstElementChild?.remove()
    }
    this.#list.scrollTop = this.#list.scrollHeight
  }
}

customElements.define('multi-log', MultiLog)
