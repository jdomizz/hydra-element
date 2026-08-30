/**
 * <stats-strip> — renders `synth.time` and `synth.stats.fps` from a
 * `<hydra-element>` target. Single responsibility: read + display.
 *
 * Attributes:
 *   target — selector for the `<hydra-element>` to observe
 *
 * Cleans up the rAF loop in `disconnectedCallback`. Throttled to ~4 Hz
 * to keep main-thread pressure low; sub-frame updates are noise.
 */
const styles = new CSSStyleSheet()
styles.replaceSync(`
  :host {
    display: inline-flex;
    align-items: baseline;
    gap: var(--hydra-space-m);
    font-size: var(--hydra-text-xs);
    color: var(--hydra-fg-muted);
  }
  .cell {
    display: inline-flex;
    align-items: baseline;
    gap: var(--hydra-space-xs);
  }
  .label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .value {
    color: var(--hydra-fg);
    font-variant-numeric: tabular-nums;
  }
`)

const TICK_MS = 250

class StatsStrip extends HTMLElement {
  #target = null
  #timeEl
  #fpsEl
  #timer = null
  #lastTick = 0

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <span class="cell">
        <span class="label">time</span>
        <span class="value" data-time>–</span>
      </span>
      <span class="cell">
        <span class="label">fps</span>
        <span class="value" data-fps>–</span>
      </span>
    `
    this.#timeEl = this.shadowRoot.querySelector('[data-time]')
    this.#fpsEl = this.shadowRoot.querySelector('[data-fps]')
  }

  connectedCallback() {
    const target = this.#resolveTarget()
    if (!target) return
    this.#target = target
    const tick = () => {
      const now = performance.now()
      if (now - this.#lastTick >= TICK_MS) {
        this.#lastTick = now
        this.#render()
      }
      this.#timer = requestAnimationFrame(tick)
    }
    this.#timer = requestAnimationFrame(tick)
  }

  disconnectedCallback() {
    if (this.#timer !== null) {
      cancelAnimationFrame(this.#timer)
      this.#timer = null
    }
    this.#target = null
  }

  #resolveTarget() {
    const sel = this.getAttribute('target')
    if (!sel) return null
    return document.querySelector(sel)
  }

  #render() {
    const synth = this.#target?.synth
    if (synth) {
      this.#timeEl.textContent = (synth.time || 0).toFixed(2)
      const fps = synth.stats?.fps
      this.#fpsEl.textContent = fps === undefined ? '–' : fps.toFixed(1)
    } else {
      this.#timeEl.textContent = '–'
      this.#fpsEl.textContent = '–'
    }
  }
}

customElements.define('stats-strip', StatsStrip)
