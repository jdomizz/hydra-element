import Hydra from 'hydra-synth'
import { HydraContext, publishHydraGlobals, userCodeLine } from 'hydra-context'
import { EvalQueue } from './queue'
import { CanvasManager } from './canvas'
import { Loop } from './loop'
import { FrameCapture } from './capture'
import { loadScriptInto } from './script'
import { DEFAULT_OPTIONS, OBSERVED_ATTRIBUTES, foldOptions } from './options'

/**
 * A custom element that renders Hydra sketches.
 * @extends HTMLElement
 */
export class HydraElement extends HTMLElement {
  /**
   * Overridable engine factory (test seam).
   * @param {Object} options
   */
  static hydraFactory = options => new Hydra({ ...options, autoLoop: false })

  /** @returns {string[]} */
  static get observedAttributes() {
    return OBSERVED_ATTRIBUTES
  }

  #code = ''
  #options = { ...DEFAULT_OPTIONS }
  #scope = Object.create(null)
  #loop = null
  #hydra = null
  #initialized = false
  #readyPromise
  #resolveReady
  #canvasManager
  #queue = new EvalQueue()
  #context = new HydraContext(null, { scope: this.#scope })
  #globalsRestore = null
  #capture = new FrameCapture()

  /** Per-attribute side effects; attributes without an entry recreate the engine and re-evaluate. */
  #attrEffects = {
    width: () => this.#canvasManager.refresh(),
    height: () => this.#canvasManager.refresh(),
    dpr: () => this.#canvasManager.refresh(this.#options.dpr),
    loop: () => (this.#options.autoLoop ? this.#startLoop() : this.#stopLoop()),
  }

  /**
   * Follows a canvas resolution change.
   * @param {CustomEvent} event
   */
  #onResize = event => {
    const synth = this.#hydra?.synth
    if (!synth) return
    synth.setResolution(event.detail.width, event.detail.height)
    synth.width = event.detail.width
    synth.height = event.detail.height
  }

  constructor() {
    super()
    this.#readyPromise = this.#createReadyPromise()
    this.attachShadow({ mode: 'open' })
    this.#canvasManager = new CanvasManager(this, this.shadowRoot)
    this.addEventListener('hydra-element-resize', this.#onResize)
  }

  /**
   * The hydra-synth DSL instance, or `undefined` before init / after destroy.
   * @returns {unknown}
   */
  get synth() {
    return this.#hydra?.synth
  }

  /**
   * Resolves once Hydra is initialized with `{ synth }`.
   * @returns {Promise<{ synth: unknown }>}
   */
  get ready() {
    return this.#readyPromise
  }

  /**
   * The persistent eval scope (bare assignments, bound values, and `loadScript` survive engine resets).
   * @returns {Object}
   */
  get scope() {
    return this.#scope
  }

  /** Binds a static value into the eval scope; the bound name wins over live engine-owned reads (`time`, `width`, `height`, `speed`, …). */
  bind(name, value) {
    this.#context.bind(name, value)
  }

  /** Binds a live getter into the eval scope, re-read on every access (a sketch assignment replaces it). */
  bindLive(name, provider) {
    this.#context.bindLive(name, provider)
  }

  /** Removes a previously bound value or provider from the eval scope. */
  unbind(name) {
    this.#context.unbind(name)
  }

  /**
   * Captures the next rendered frame as a PNG blob.
   * @returns {Promise<Blob>}
   */
  capture() {
    return this.#capture.capture(() => this.#loop?.isRunning)
  }

  /**
   * The canvas element backing the render.
   * @returns {HTMLCanvasElement}
   */
  get canvas() {
    return this.#options.canvas
  }

  /** @param {HTMLCanvasElement} value */
  set canvas(value) {
    this.#canvasManager.preserveCustomCanvas(value)
    this.#options.canvas = value
    if (this.#hydra) {
      this.#initHydra()
    }
  }

  /**
   * The custom GLSL transforms.
   * @returns {Array<Function>}
   */
  get transforms() {
    return this.#options.extendTransforms
  }

  /** @param {Array<Function>} value */
  set transforms(value) {
    this.#options.extendTransforms = value
    if (this.#hydra) {
      this.#applyTransforms()
    }
  }

  /**
   * The rtc-patch-bay instance for streaming.
   * @returns {Object}
   */
  get pb() {
    return this.#options.pb
  }

  /** @param {Object} value */
  set pb(value) {
    this.#options.pb = value
    if (this.#hydra) {
      this.#initHydra()
    }
  }

  /**
   * The scene code.
   * @returns {string}
   */
  get code() {
    return this.#code
  }

  /**
   * Sets the code and evaluates it.
   * @param {string} value
   */
  set code(value) {
    this.#code = value
    if (this.#hydra) {
      this.#evalCode()
    }
  }

  /** Tears the element down (loop, sources, engine) without removing it from the DOM. */
  destroy() {
    this.#teardown()
    this.#initialized = false
    this.#readyPromise = this.#createReadyPromise()
  }

  /**
   * Loads an extension script into the element's eval scope, dispatching `hydra-loadscript` and rethrowing on failure.
   * @param {string} url
   */
  async loadScript(url) {
    if (!this.#hydra) {
      throw new Error('[hydra-element] loadScript before the engine is initialized')
    }
    try {
      await loadScriptInto(this.#context, this.#hydra, url)
      this.#dispatch('hydra-loadscript', { success: true, url })
    } catch (error) {
      this.#dispatch('hydra-loadscript', {
        success: false,
        url,
        error: this.#errorMessage(error),
      })
      throw error
    }
  }

  /** @returns {Promise<{ synth: unknown }>} */
  #createReadyPromise() {
    return new Promise(resolve => {
      this.#resolveReady = resolve
    })
  }

  /** Stops the loop and drops the engine, without resetting the initialized flag. */
  #teardown() {
    this.#capture.detach()
    this.#loop?.stop()
    this.#loop = null
    this.#canvasManager.disconnect()
    this.#canvasManager.removeAnalyzerCanvases()
    this.#clearSources()
    this.#globalsRestore?.()
    this.#globalsRestore = null
    this.#hydra?.regl?.destroy?.()
    this.#hydra = null
  }

  /** Clears the engine's source buffers, if any. */
  #clearSources() {
    this.#hydra?.s?.forEach(source => source.clear?.())
  }

  /**
   * @param {string} attrName
   * @param {string|null} oldValue
   * @param {string|null} newValue
   */
  attributeChangedCallback(attrName, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return

    this.#options = foldOptions(this.#options, attrName, newValue)
    const effect = this.#attrEffects[attrName]
    if (effect) {
      effect()
    } else {
      this.#recreate()
    }
  }

  /** Initializes once on connect and evaluates the code. */
  connectedCallback() {
    if (this.#code === '' && this.textContent) {
      this.#code = this.textContent
      this.textContent = ''
    }
    if (!this.#initialized) {
      this.#initialized = true
      this.#parseInitialAttrs()
      this.#initCanvas()
      this.#initHydra()
    }
    if (this.#code !== '') {
      this.#evalCode()
    }
  }

  /** Tears the element down on removal; re-insertion re-initializes it. */
  disconnectedCallback() {
    this.destroy()
  }

  /** Folds the present attributes into the options once. */
  #parseInitialAttrs() {
    for (const name of HydraElement.observedAttributes) {
      const value = this.getAttribute(name)
      if (value === null) continue
      this.#options = foldOptions(this.#options, name, value)
    }
  }

  /**
   * Forwards a tick to the engine.
   * @param {number} dt
   */
  tick(dt) {
    if (this.#hydra) {
      this.#hydra.tick(dt)
    }
  }

  /** Creates the canvas. */
  #initCanvas() {
    this.#canvasManager.init(this.#options)
    this.#options.canvas = this.#canvasManager.canvas
  }

  /** Creates the engine, tearing down any previous one. */
  #initHydra() {
    this.#teardown()
    this.#hydra = this.constructor.hydraFactory({ ...this.#options })
    this.#applyTransforms()
    this.#canvasManager.tagAnalyzerCanvases()
    this.#context.attach(this.#hydra)
    this.#capture.attach(this.#hydra)
    this.#scope.loadScript = url => this.loadScript(url)
    if (this.#options.makeGlobal) {
      this.#globalsRestore = publishHydraGlobals(this.#hydra)
    }
    this.#dispatch('hydra-ready', { synth: this.#hydra.synth })
    this.#resolveReady?.({ synth: this.#hydra.synth })
    if (this.#options.autoLoop) {
      this.#startLoop()
    }
  }

  /** Applies the custom transforms to the engine. */
  #applyTransforms() {
    this.#options.extendTransforms.forEach(fn => this.#hydra.synth.setFunction(fn))
  }

  /** Starts the render loop, creating it lazily. */
  #startLoop() {
    if (!this.#loop) {
      this.#loop = new Loop({ onTick: dt => this.tick(dt) })
    }
    this.#loop.start()
  }

  /** Stops the render loop. */
  #stopLoop() {
    this.#loop?.stop()
  }

  /** Recreates the engine and re-evaluates the code after an attribute change. */
  #recreate() {
    this.#initHydra()
    this.#evalCode()
  }

  /** Evaluates the code and dispatches `hydra-eval` with the outcome. */
  #evalCode() {
    const code = this.#code
    this.#queue
      .submit(() => this.#context.eval(code))
      .then(() => this.#dispatch('hydra-eval', { success: true }))
      .catch(error => {
        this.#dispatch('hydra-eval', {
          success: false,
          error: this.#errorMessage(error),
          line: userCodeLine(error, code),
        })
      })
  }

  /**
   * Dispatches a bubbling event.
   * @param {string} name
   * @param {Object} detail
   */
  #dispatch(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
  }

  /** @param {unknown} error @returns {string} */
  #errorMessage(error) {
    return error instanceof Error ? error.message : String(error)
  }
}
