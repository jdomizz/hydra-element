/**
 * Manages the <canvas> element used to render a Hydra sketch.
 *
 * Owns the internal canvas lifecycle: creation, resizing, and preservation of
 * an externally supplied custom canvas. Tracks the element's CSS size via a
 * ResizeObserver so the canvas backing-store resolution follows the layout,
 * unless an explicit `width`/`height` attribute is present (that takes
 * precedence). It knows nothing about Hydra or the animation loop.
 */

const FALLBACK_WIDTH = 1280
const FALLBACK_HEIGHT = 720

const warnedMessages = new Set()

function warnOnce(msg) {
  if (!warnedMessages.has(msg)) {
    warnedMessages.add(msg)
    console.warn(msg)
  }
}

export class CanvasManager {
  #shadowRoot
  #canvas
  #width
  #height
  #resizeObserver

  /**
   * @param {ShadowRoot} shadowRoot - The shadow root to append the internal canvas to.
   */
  constructor(shadowRoot) {
    this.#shadowRoot = shadowRoot
    this.#canvas = null
    this.#width = null
    this.#height = null
    this.#resizeObserver = null
  }

  /**
   * Creates an internal canvas with the given dimensions (falling back to
   * 1280×720 when the size is zero, e.g. before layout), unless a custom
   * canvas has already been supplied — in which case it is left untouched.
   * Starts observing the canvas for CSS size changes.
   * @param {number} width
   * @param {number} height
   */
  init(width, height) {
    this.#width = width || FALLBACK_WIDTH
    this.#height = height || FALLBACK_HEIGHT
    if (this.#canvas && this.#canvas.id !== 'hydra-element-canvas') return
    this.removeInternalCanvas()
    this.#canvas = document.createElement('canvas')
    this.#canvas.id = 'hydra-element-canvas'
    this.#canvas.setAttribute('part', 'canvas')
    this.#canvas.setAttribute('role', 'img')
    this.#canvas.setAttribute('aria-label', 'Hydra visual')
    this.#canvas.width = this.#width
    this.#canvas.height = this.#height
    this.#canvas.style.width = '100%'
    this.#canvas.style.height = '100%'
    this.#shadowRoot.append(this.#canvas)
    this.#observeResize()
    this.#attachContextLossHandler()
  }

  /**
   * Updates the canvas backing-store dimensions.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.#width = width
    this.#height = height
    if (this.#canvas) {
      this.#canvas.width = width
      this.#canvas.height = height
    }
  }

  /**
   * Replaces the current canvas with an externally supplied one, removing any
   * internal canvas. The custom canvas is adopted into the shadow root,
   * marked with part="canvas", and observed for CSS size changes unless it
   * has explicit width/height attributes.
   * @param {HTMLCanvasElement} canvas
   */
  preserveCustomCanvas(canvas) {
    this.removeInternalCanvas()
    this.#canvas = canvas
    if (!this.#shadowRoot.contains(canvas)) {
      this.#shadowRoot.append(canvas)
    }
    canvas.setAttribute('part', 'canvas')
    if (!canvas.hasAttribute('width') && !canvas.hasAttribute('height')) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      this.#observeResize()
    }
  }

  /**
   * Removes any internally created canvases from the shadow root.
   */
  removeInternalCanvas() {
    this.#shadowRoot
      ?.querySelectorAll('canvas#hydra-element-canvas')
      .forEach(canvas => canvas.remove())
  }

  /**
   * Removes any non-internal canvases from the shadow root.
   * These are canvases created by Hydra's analyzer sources (e.g. audio FFT).
   */
  removeAnalyzerCanvases() {
    this.#shadowRoot
      ?.querySelectorAll('canvas:not(#hydra-element-canvas)')
      .forEach(canvas => canvas.remove())
  }

  /**
   * Tags any non-internal canvases in the shadow root with `part="analyzer"`
   * and marks them hidden from the accessibility tree.
   * @private
   */
  tagAnalyzerCanvases() {
    this.#shadowRoot?.querySelectorAll('canvas:not(#hydra-element-canvas)').forEach(canvas => {
      canvas.setAttribute('part', 'analyzer')
      canvas.setAttribute('aria-hidden', 'true')
    })
  }

  /**
   * Re-evaluates the canvas size from the current CSS layout.
   * Used when width/height attributes are removed to hand control
   * back to the ResizeObserver.
   */
  refreshFromCss() {
    if (!this.#canvas || !this.host) return
    const rect = this.host.getBoundingClientRect?.() || { width: 0, height: 0 }
    const cssWidth = Math.round(rect.width || 0)
    const cssHeight = Math.round(rect.height || 0)
    const nextWidth = cssWidth || FALLBACK_WIDTH
    const nextHeight = cssHeight || FALLBACK_HEIGHT
    if (nextWidth === this.#width && nextHeight === this.#height) return
    this.resize(nextWidth, nextHeight)
    this.host.dispatchEvent(
      new CustomEvent('hydra-element-resize', {
        detail: { width: nextWidth, height: nextHeight },
      })
    )
  }

  /**
   * Stops observing the canvas for CSS size changes. Call on teardown.
   */
  disconnect() {
    this.#resizeObserver?.disconnect()
    this.#resizeObserver = null
  }

  /**
   * The canvas element managed by this instance.
   * @returns {HTMLCanvasElement|undefined}
   */
  get canvas() {
    return this.#canvas
  }

  /**
   * Test seam — exposes the underlying ResizeObserver so unit tests can
   * drive size-change callbacks without depending on a real layout engine.
   * Not part of the public API; do not call from production code.
   * @returns {ResizeObserver|null}
   */
  get resizeObserver() {
    return this.#resizeObserver
  }

  /**
   * The host element that owns the shadow root (used for attribute precedence
   * and as the resize-event target).
   * @returns {HTMLElement|undefined}
   */
  get host() {
    return this.#shadowRoot?.host
  }

  /**
   * Starts observing the internal canvas so that its CSS size is reflected in
   * the canvas backing-store resolution.
   * @private
   */
  #observeResize() {
    this.disconnect()
    if (typeof ResizeObserver === 'undefined') return
    this.#resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => this.#handleResize(entry))
    })
    this.#resizeObserver.observe(this.host)
  }

  /**
   * Attaches a one-shot webglcontextlost listener to the internal canvas.
   * Dispatches a hydra-context-lost event on the host so HydraElement can
   * re-initialize. Only for internal canvases — custom canvases are user-owned.
   * @private
   */
  #attachContextLossHandler() {
    if (!this.#canvas) return
    this.#canvas.addEventListener(
      'webglcontextlost',
      e => {
        e.preventDefault()
        this.host?.dispatchEvent(new CustomEvent('hydra-context-lost'))
      },
      { once: true }
    )
  }

  /**
   * Applies a ResizeObserver entry to the canvas resolution. Rounds to whole
   * pixels, skips hidden (zero) sizes and unchanged sizes, honors explicit
   * `width`/`height` attributes, and falls back to 1280×720 when size is 0.
   * Notifies the host so the synth resolution can follow the change.
   * @param {ResizeObserverEntry} entry
   * @private
   */
  #handleResize(entry) {
    const cssWidth = Math.round(entry.contentRect?.width || 0)
    const cssHeight = Math.round(entry.contentRect?.height || 0)

    const nextWidth = this.host?.hasAttribute('width')
      ? this.#resolveLength(this.host.getAttribute('width'), this.#width, 'width')
      : cssWidth || FALLBACK_WIDTH
    const nextHeight = this.host?.hasAttribute('height')
      ? this.#resolveLength(this.host.getAttribute('height'), this.#height, 'height')
      : cssHeight || FALLBACK_HEIGHT

    if (nextWidth === this.#width && nextHeight === this.#height) return
    this.resize(nextWidth, nextHeight)
    this.host?.dispatchEvent(
      new CustomEvent('hydra-element-resize', {
        detail: { width: nextWidth, height: nextHeight },
      })
    )
  }

  /**
   * Coerces a `width`/`height` attribute string into a number, falling back to
   * the previous resolution when the value is missing or non-numeric. Emits a
   * one-time `console.warn` per unique invalid value so typos are visible
   * instead of being silently masked by the fallback.
   * @param {string|null} raw
   * @param {number} fallback
   * @param {string} name
   * @returns {number}
   * @private
   */
  #resolveLength(raw, fallback, name) {
    if (raw === null || raw === undefined || raw === '') return fallback
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
      warnOnce(`[hydra-element] invalid ${name} attribute: "${raw}" (expected a plain number)`)
      return fallback
    }
    return parsed
  }
}
