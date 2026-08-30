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

export class CanvasManager {
  /**
   * @param {ShadowRoot} shadowRoot - The shadow root to append the internal canvas to.
   */
  constructor(shadowRoot) {
    this.shadowRoot = shadowRoot
    this.canvas = null
    this.width = null
    this.height = null
    this.resizeObserver = null
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
    this.width = width || FALLBACK_WIDTH
    this.height = height || FALLBACK_HEIGHT
    if (this.canvas && this.canvas.id !== 'hydra-element-canvas') return
    this.removeInternalCanvas()
    this.canvas = document.createElement('canvas')
    this.canvas.id = 'hydra-element-canvas'
    this.canvas.setAttribute('part', 'canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.shadowRoot.append(this.canvas)
    this._observeResize()
  }

  /**
   * Updates the canvas backing-store dimensions.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width
    this.height = height
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  /**
   * Replaces the current canvas with an externally supplied one, removing any
   * internal canvas. The custom canvas is adopted as-is.
   * @param {HTMLCanvasElement} canvas
   */
  preserveCustomCanvas(canvas) {
    this.removeInternalCanvas()
    this.canvas = canvas
  }

  /**
   * Removes any internally created canvases from the shadow root.
   */
  removeInternalCanvas() {
    this.shadowRoot
      ?.querySelectorAll('canvas#hydra-element-canvas')
      .forEach(canvas => canvas.remove())
  }

  /**
   * Tags any non-internal canvases in the shadow root with `part="analyzer"`.
   * These are canvases created by Hydra's analyzer sources (e.g. audio FFT).
   * @private
   */
  tagAnalyzerCanvases() {
    this.shadowRoot
      ?.querySelectorAll('canvas:not(#hydra-element-canvas)')
      .forEach(canvas => canvas.setAttribute('part', 'analyzer'))
  }

  /**
   * Stops observing the canvas for CSS size changes. Call on teardown.
   */
  disconnect() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  /**
   * Starts observing the internal canvas so that its CSS size is reflected in
   * the canvas backing-store resolution.
   * @private
   */
  _observeResize() {
    this.disconnect()
    if (typeof ResizeObserver === 'undefined') return
    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => this._handleResize(entry))
    })
    this.resizeObserver.observe(this.host)
  }

  /**
   * Applies a ResizeObserver entry to the canvas resolution. Rounds to whole
   * pixels, skips hidden (zero) sizes and unchanged sizes, honors explicit
   * `width`/`height` attributes, and falls back to 1280×720 when size is 0.
   * Notifies the host so the synth resolution can follow the change.
   * @param {ResizeObserverEntry} entry
   * @private
   */
  _handleResize(entry) {
    const cssWidth = Math.round(entry.contentRect?.width || 0)
    const cssHeight = Math.round(entry.contentRect?.height || 0)

    const nextWidth = this.host?.hasAttribute('width')
      ? parseInt(this.host.getAttribute('width'), 10) || this.width
      : cssWidth || FALLBACK_WIDTH
    const nextHeight = this.host?.hasAttribute('height')
      ? parseInt(this.host.getAttribute('height'), 10) || this.height
      : cssHeight || FALLBACK_HEIGHT

    if (nextWidth === this.width && nextHeight === this.height) return
    this.resize(nextWidth, nextHeight)
    this.host?.dispatchEvent(
      new CustomEvent('hydra-element-resize', {
        detail: { width: nextWidth, height: nextHeight },
      })
    )
  }

  /**
   * The host element that owns the shadow root (used for attribute precedence
   * and as the resize-event target).
   * @returns {HTMLElement|undefined}
   */
  get host() {
    return this.shadowRoot?.host
  }
}
