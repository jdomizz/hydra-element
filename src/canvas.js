const FALLBACK_WIDTH = 1280
const FALLBACK_HEIGHT = 720
const DEFAULT_DPR_CAP = 2

/** Manages the canvas: creates it, keeps its resolution in sync with the layout, exposes CSS parts. */
export class CanvasManager {
  #host
  #shadowRoot
  #canvas = null
  #width = 0
  #height = 0
  #dprCap = DEFAULT_DPR_CAP
  #resizeObserver = null

  /** Warn messages are tracked per manager instance, so each element warns on its own attributes. */
  #warnedValues = new Set()

  /**
   * @param {HTMLElement} host The element that owns the canvas
   * @param {ShadowRoot} shadowRoot The host's shadow root
   */
  constructor(host, shadowRoot) {
    this.#host = host
    this.#shadowRoot = shadowRoot
  }

  /**
   * Creates the internal canvas and starts observing the host size.
   * @param {{ dpr?: number }} [options]
   */
  init(options = {}) {
    this.#dprCap = options.dpr ?? DEFAULT_DPR_CAP
    if (this.#canvas && this.#canvas.id !== 'hydra-element-canvas') return
    this.removeInternalCanvas()
    this.#canvas = document.createElement('canvas')
    this.#canvas.id = 'hydra-element-canvas'
    this.#canvas.setAttribute('part', 'canvas')
    this.#canvas.setAttribute('role', 'img')
    this.#canvas.setAttribute('aria-label', 'Hydra visual')
    this.#canvas.style.width = '100%'
    this.#canvas.style.height = '100%'
    this.#shadowRoot.append(this.#canvas)
    this.#applySize(this.#computeSize())
    this.#observeResize()
  }

  /**
   * Adopts a custom canvas, removing any internal one.
   * @param {HTMLCanvasElement} canvas
   */
  preserveCustomCanvas(canvas) {
    this.removeInternalCanvas()
    this.#canvas = canvas
    canvas.setAttribute('part', 'canvas')
    if (!this.#shadowRoot.contains(canvas)) {
      this.#shadowRoot.append(canvas)
    }
  }

  /** Removes the internal canvas from the shadow root. */
  removeInternalCanvas() {
    this.#shadowRoot
      ?.querySelectorAll('canvas#hydra-element-canvas')
      .forEach(canvas => canvas.remove())
  }

  /** Tags non-internal canvases (e.g. the audio analyzer) as `part="analyzer"`. */
  tagAnalyzerCanvases() {
    this.#shadowRoot?.querySelectorAll('canvas:not(#hydra-element-canvas)').forEach(canvas => {
      canvas.setAttribute('part', 'analyzer')
      canvas.setAttribute('aria-hidden', 'true')
    })
  }

  /** Removes non-internal canvases from the shadow root. */
  removeAnalyzerCanvases() {
    this.#shadowRoot
      ?.querySelectorAll('canvas:not(#hydra-element-canvas)')
      .forEach(canvas => canvas.remove())
  }

  /** @returns {HTMLCanvasElement | null} The managed canvas */
  get canvas() {
    return this.#canvas
  }

  /** @returns {ResizeObserver | null} Test seam */
  get resizeObserver() {
    return this.#resizeObserver
  }

  /** Stops observing the host. */
  disconnect() {
    this.#resizeObserver?.disconnect()
    this.#resizeObserver = null
  }

  /**
   * Updates the backing-store dimensions.
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
   * Recomputes the size after `width`/`height`/`dpr` changes, without recreating the canvas.
   * @param {number} [dpr]
   */
  refresh(dpr) {
    if (dpr !== undefined) this.#dprCap = dpr
    this.#sync()
  }

  /**
   * Applies a size without dispatching an event.
   * @param {{ width: number, height: number }} size
   */
  #applySize(size) {
    if (size.width === this.#width && size.height === this.#height) return
    this.resize(size.width, size.height)
  }

  /** Recomputes the size and, if changed, resizes and dispatches `hydra-element-resize`. */
  #sync() {
    const size = this.#computeSize()
    if (size.width === this.#width && size.height === this.#height) return
    this.resize(size.width, size.height)
    this.#host.dispatchEvent(
      new CustomEvent('hydra-element-resize', {
        detail: { width: size.width, height: size.height },
        bubbles: true,
      })
    )
  }

  /** Starts observing the host CSS size. */
  #observeResize() {
    this.disconnect()
    if (typeof ResizeObserver === 'undefined') return
    this.#resizeObserver = new ResizeObserver(() => this.#sync())
    this.#resizeObserver.observe(this.#host)
  }

  /**
   * Resolves the backing-store size: explicit attributes, else CSS size × DPR, else fallback.
   * @returns {{ width: number, height: number }}
   */
  #computeSize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, this.#dprCap)
    const rect = this.#host.getBoundingClientRect?.() || { width: 0, height: 0 }
    const cssWidth = Math.round(rect.width || 0)
    const cssHeight = Math.round(rect.height || 0)

    const width = this.#host.hasAttribute('width')
      ? this.#resolveLength(this.#host.getAttribute('width'), 'width')
      : Math.round(cssWidth * dpr) || FALLBACK_WIDTH
    const height = this.#host.hasAttribute('height')
      ? this.#resolveLength(this.#host.getAttribute('height'), 'height')
      : Math.round(cssHeight * dpr) || FALLBACK_HEIGHT

    return { width, height }
  }

  /**
   * Coerces a `width`/`height` attribute into a number.
   * @param {string | null} raw
   * @param {'width' | 'height'} name
   * @returns {number}
   */
  #resolveLength(raw, name) {
    const fallback = name === 'width' ? FALLBACK_WIDTH : FALLBACK_HEIGHT
    if (raw === null || raw === undefined || raw === '') return fallback
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
      this.#warnOnce(
        `[hydra-element] invalid ${name} attribute: "${raw}" (expected a plain number)`
      )
      return fallback
    }
    return parsed
  }

  /**
   * Writes a warning once per instance.
   * @param {string} message
   */
  #warnOnce(message) {
    if (this.#warnedValues.has(message)) return
    this.#warnedValues.add(message)
    console.warn(message)
  }
}
