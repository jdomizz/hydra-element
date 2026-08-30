/**
 * <log-panel> — append-only event log fed by `<hydra-element>` lifecycle
 * events plus filtered `console.warn` capture.
 *
 * Attributes:
 *   target — selector for the `<hydra-element>` to observe
 *   limit  — max rendered lines (default 50, oldest dropped first)
 *
 * Subscribes via `target.addEventListener` AND resolves `target.ready`
 * to handle the race where `hydra-ready` already fired before the
 * listener attached (mirrors the contract used in the old playground.js).
 */
const PAGE_LOAD = performance.now()
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
  .name {
    font-weight: 700;
    margin: 0 var(--hydra-space-xs);
  }
  .name--success { color: var(--hydra-log-success); }
  .name--error   { color: var(--hydra-log-error); }
  .name--warn    { color: var(--hydra-log-warn); }
  .name--info    { color: var(--hydra-log-info); }
`)

function fmtMs(ms) {
  return ms.toFixed(0).padStart(6, ' ')
}

function truncateSynth(synth) {
  if (!synth) return '{}'
  const { time = 0, bpm = 0, stats = {} } = synth
  return `{ time: ${time.toFixed(2)}, bpm: ${bpm}, fps: ${(stats.fps || 0).toFixed(1)} }`
}

class LogPanel extends HTMLElement {
  #target = null
  #list
  #empty
  #limit = DEFAULT_LIMIT
  #warnCaptureInstalled = false
  #onReady = null
  #onEval = null
  #onResize = null
  #onContextLost = null

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
    this.#empty.textContent = 'waiting for hydra-ready …'
    this.#list.append(this.#empty)
    this.shadowRoot.querySelector('[data-clear]').addEventListener('click', () => this.clear())
  }

  connectedCallback() {
    const limitAttr = parseInt(this.getAttribute('limit') || '', 10)
    if (Number.isFinite(limitAttr) && limitAttr > 0) this.#limit = limitAttr

    const target = this.#resolveTarget()
    if (!target) return
    this.#target = target

    this.#installWarnCapture()
    this.#bindHydraEvents()
  }

  disconnectedCallback() {
    const t = this.#target
    if (t) {
      t.removeEventListener('hydra-ready', this.#onReady)
      t.removeEventListener('hydra-eval', this.#onEval)
      t.removeEventListener('hydra-element-resize', this.#onResize)
      t.removeEventListener('hydra-context-lost', this.#onContextLost)
    }
    this.#target = null
  }

  clear() {
    this.#list.replaceChildren()
    const empty = document.createElement('span')
    empty.className = 'empty'
    empty.textContent = 'log cleared'
    this.#list.append(empty)
  }

  #resolveTarget() {
    const sel = this.getAttribute('target')
    if (!sel) return null
    return document.querySelector(sel)
  }

  #bindHydraEvents() {
    this.#onReady = (e) => this.#append('success', 'hydra-ready', truncateSynth(e.detail?.synth))
    this.#onEval = (e) => {
      if (e.detail?.success) {
        this.#append('success', 'hydra-eval', 'success=true')
      } else {
        const msg = e.detail?.error?.message || String(e.detail?.error || 'unknown')
        this.#append('error', 'hydra-eval', `success=false ${msg}`)
      }
    }
    this.#onResize = (e) => {
      const { width, height } = e.detail || {}
      this.#append('info', 'hydra-element-resize', `{ width: ${width}, height: ${height} }`)
    }
    this.#onContextLost = () => this.#append('warn', 'hydra-context-lost', '(recovered)')

    const t = this.#target
    t.addEventListener('hydra-ready', this.#onReady)
    t.addEventListener('hydra-eval', this.#onEval)
    t.addEventListener('hydra-element-resize', this.#onResize)
    t.addEventListener('hydra-context-lost', this.#onContextLost)

    if (t.ready) {
      t.ready.then(({ synth }) => {
        this.#append('success', 'hydra-ready', truncateSynth(synth))
      })
    }
  }

  #installWarnCapture() {
    if (this.#warnCaptureInstalled) return
    this.#warnCaptureInstalled = true
    const original = console.warn.bind(console)
    console.warn = (...args) => {
      original(...args)
      const text = args
        .map((a) => (typeof a === 'string' ? a : a?.message || String(a)))
        .join(' ')
      if (text.includes('[hydra-element]')) {
        this.#append('warn', '[eval warn]', text)
      }
    }
  }

  #append(kind, name, detail) {
    if (this.#empty && this.#empty.parentNode === this.#list) {
      this.#empty.remove()
      this.#empty = null
    }
    const ts = document.createElement('span')
    ts.className = 'ts'
    ts.textContent = `[${fmtMs(performance.now() - PAGE_LOAD)}ms]`

    const ev = document.createElement('span')
    ev.className = `name name--${kind}`
    ev.textContent = name

    const body = document.createElement('span')
    body.textContent = detail

    const line = document.createElement('span')
    line.className = 'line'
    line.append(ts, ev, body)

    this.#list.append(line)

    while (this.#list.childElementCount > this.#limit) {
      this.#list.firstElementChild?.remove()
    }
    this.#list.scrollTop = this.#list.scrollHeight
  }
}

customElements.define('log-panel', LogPanel)
