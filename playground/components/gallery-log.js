/**
 * <gallery-log> — append-only event aggregator that subscribes to a *list* of
 * `<hydra-element>` targets via the `.targets` property. Each line is prefixed
 * with the target's `id` (or `target-<index>`) so listeners can see which
 * instance produced which event. This is the money-shot log: four instances
 * dispatching `hydra-ready`, `hydra-eval`, and `hydra-element-resize`
 * independently — proof that non-global isolation holds.
 *
 * Attribute:
 *   limit — max rendered lines (default 50, oldest dropped first)
 *
 * Property:
 *   targets — array of `<hydra-element>` references. Set once by the
 *             orchestrator (`playground/gallery.js`).
 */
const DEFAULT_LIMIT = 50

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

const PAGE_LOAD = performance.now()

function fmtMs(ms) {
  return ms.toFixed(0).padStart(6, ' ')
}

function truncateSynth(synth) {
  if (!synth) return '{}'
  const { time = 0, bpm = 0, stats = {} } = synth
  return `{ time: ${time.toFixed(2)}, bpm: ${bpm}, fps: ${(stats.fps || 0).toFixed(1)} }`
}

class GalleryLog extends HTMLElement {
  #targets = []
  #list
  #empty
  #limit = DEFAULT_LIMIT
  #handlers = new Map()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <header>
        <h2>Multi-instance log</h2>
        <button type="button" class="btn btn--ghost" data-clear>clear</button>
      </header>
      <pre data-list aria-live="polite"></pre>
    `
    this.#list = this.shadowRoot.querySelector('[data-list]')
    this.#empty = document.createElement('span')
    this.#empty.className = 'empty'
    this.#empty.textContent = 'waiting for hydra-ready events …'
    this.#list.append(this.#empty)
    this.shadowRoot.querySelector('[data-clear]').addEventListener('click', () => this.#clear())
  }

  connectedCallback() {
    const limitAttr = parseInt(this.getAttribute('limit') || '', 10)
    if (Number.isFinite(limitAttr) && limitAttr > 0) this.#limit = limitAttr

    if (this.#targets.length) this.#bindAll()
  }

  disconnectedCallback() {
    this.#unbindAll()
  }

  get targets() {
    return [...this.#targets]
  }

  set targets(els) {
    if (this.isConnected) this.#unbindAll()
    this.#targets = Array.isArray(els) ? els.filter(Boolean) : []
    if (this.isConnected) this.#bindAll()
  }

  #bindAll() {
    for (const t of this.#targets) this.#bindOne(t)
  }

  #bindOne(t) {
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
    this.#handlers.set(t, { onReady, onEval, onResize, onContextLost })

    if (t.ready) {
      t.ready.then(({ synth }) => this.#append(t, 'success', 'hydra-ready', truncateSynth(synth)))
    }
  }

  #unbindAll() {
    for (const [t, h] of this.#handlers) {
      t.removeEventListener('hydra-ready', h.onReady)
      t.removeEventListener('hydra-eval', h.onEval)
      t.removeEventListener('hydra-element-resize', h.onResize)
      t.removeEventListener('hydra-context-lost', h.onContextLost)
    }
    this.#handlers.clear()
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
    ts.textContent = `[${fmtMs(performance.now() - PAGE_LOAD)}ms]`

    const src = document.createElement('span')
    src.className = 'src'
    src.textContent = target.id || `target-${this.#targets.indexOf(target)}`

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

customElements.define('gallery-log', GalleryLog)
