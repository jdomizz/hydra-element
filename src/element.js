import Hydra from 'hydra-synth'
import { CanvasManager } from './canvas'
import { bindLiveScope, bindScope, hydraEval, unbindScope, userCodeLine } from './eval'
import { publishHydraGlobals } from './globals'
import { Loop } from './loop'
import { parseJSON, parseNumber, parseOption } from './parser'
import { EvalQueue } from './queue'

/** Default options for creating a Hydra instance. */
const DEFAULT_OPTIONS = {
  canvas: null,
  autoLoop: true,
  makeGlobal: false,
  detectAudio: false,
  numSources: 4,
  numOutputs: 4,
  extendTransforms: [],
  precision: null,
  pb: null,
  dpr: 2,
}

/** Maps each `hydra-element` attribute to a function that parses it into options. */
const ATTR_PARSERS = {
  global: (options, value) => ({
    ...options,
    makeGlobal: parseJSON(value, DEFAULT_OPTIONS.makeGlobal),
  }),
  audio: (options, value) => ({
    ...options,
    detectAudio: parseJSON(value, DEFAULT_OPTIONS.detectAudio),
  }),
  sources: (options, value) => ({
    ...options,
    numSources: Math.floor(parseNumber(value, DEFAULT_OPTIONS.numSources, 0, 16)),
  }),
  outputs: (options, value) => ({
    ...options,
    numOutputs: Math.floor(parseNumber(value, DEFAULT_OPTIONS.numOutputs, 0, 16)),
  }),
  precision: (options, value) => ({
    ...options,
    precision: parseOption(value, DEFAULT_OPTIONS.precision, ['highp', 'mediump', 'lowp']),
  }),
  dpr: (options, value) => ({
    ...options,
    dpr: parseNumber(value, DEFAULT_OPTIONS.dpr, 1),
  }),
  loop: (options, value) => ({
    ...options,
    autoLoop: parseJSON(value, DEFAULT_OPTIONS.autoLoop),
  }),
}

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
    return ['width', 'height', 'global', 'audio', 'sources', 'outputs', 'precision', 'dpr', 'loop']
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
  #globalsRestore = null

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
    bindScope(this.#scope, name, value)
  }

  /** Binds a live getter into the eval scope, re-read on every access (read-only inside the sketch). */
  bindLive(name, provider) {
    bindLiveScope(this.#scope, name, provider)
  }

  /** Removes a previously bound value or provider from the eval scope. */
  unbind(name) {
    unbindScope(this.#scope, name)
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
      this.#options.extendTransforms.forEach(fn => this.#hydra.synth.setFunction(fn))
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
   * Loads an extension script into the element's eval scope, publishing the engine's surface on the global scope while it runs.
   * @param {string} url
   */
  async loadScript(url) {
    if (!this.#hydra) {
      throw new Error('[hydra-element] loadScript before the engine is initialized')
    }
    const restore = publishHydraGlobals(this.#hydra)
    try {
      const text = await this.#fetchText(url)
      if (text === null) {
        await this.#hydra.loadScript(url)
      } else {
        await hydraEval(text, this.#hydra.synth, this.#scope)
      }
    } finally {
      restore()
    }
  }

  /**
   * Fetches script text; `null` on non-OK (dead URL) or CORS failure, signalling a `script`-tag fallback.
   * @param {string} url
   * @returns {Promise<string | null>}
   */
  async #fetchText(url) {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.warn(`[hydra-element] loadScript failed: ${res.status} ${url}`)
        return null
      }
      return res.text()
    } catch {
      return null
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
    this.#loop?.stop()
    this.#loop = null
    this.#canvasManager.disconnect()
    this.#canvasManager.removeAnalyzerCanvases()
    this.#hydra?.s?.forEach(source => source.clear?.())
    this.#globalsRestore?.()
    this.#globalsRestore = null
    this.#hydra = null
  }

  /**
   * @param {string} attrName
   * @param {string|null} oldValue
   * @param {string|null} newValue
   */
  attributeChangedCallback(attrName, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return

    if (attrName === 'width' || attrName === 'height') {
      this.#canvasManager.refresh()
      return
    }
    if (attrName === 'dpr') {
      this.#options = this.#getNewOptions('dpr', newValue)
      this.#canvasManager.refresh(this.#options.dpr)
      return
    }

    this.#options = this.#getNewOptions(attrName, newValue)
    if (attrName === 'loop') {
      if (this.#options.autoLoop) this.#startLoop()
      else this.#stopLoop()
      return
    }

    this.#initHydra()
    this.#evalCode()
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

  /** Folds the present attributes into the options once. */
  #parseInitialAttrs() {
    for (const name of HydraElement.observedAttributes) {
      const value = this.getAttribute(name)
      if (value === null) continue
      this.#options = this.#getNewOptions(name, value)
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
    this.#hydra = HydraElement.hydraFactory({ ...this.#options })
    this.#options.extendTransforms.forEach(fn => this.#hydra.synth.setFunction(fn))
    this.#canvasManager.tagAnalyzerCanvases()
    this.#scope.loadScript = url => this.loadScript(url)
    this.#scope._hydra = this.#hydra
    this.#scope.hydraSynth = this.#hydra
    if (this.#options.makeGlobal) {
      this.#globalsRestore = publishHydraGlobals(this.#hydra)
    }
    this.#dispatch('hydra-ready', { synth: this.#hydra.synth })
    this.#resolveReady?.({ synth: this.#hydra.synth })
    if (this.#options.autoLoop) {
      this.#startLoop()
    }
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

  /** Evaluates the code and dispatches `hydra-eval` with the outcome. */
  #evalCode() {
    const code = this.#code
    this.#queue
      .submit(() => hydraEval(code, this.#hydra.synth, this.#scope))
      .then(() => this.#dispatch('hydra-eval', { success: true }))
      .catch(error => {
        this.#dispatch('hydra-eval', {
          success: false,
          error: error instanceof Error ? error.message : String(error),
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

  /**
   * @param {string} attrName
   * @param {string|null} newValue
   * @returns {Object}
   */
  #getNewOptions(attrName, newValue) {
    const parse = ATTR_PARSERS[attrName]
    return parse ? parse(this.#options, newValue) : this.#options
  }
}
