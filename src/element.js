import { CanvasManager } from './canvas'
import { HydraManager } from './hydra'
import { LoopController } from './loop'
import { AttributeHandler } from './attributes'
import { DEFAULT_OPTIONS } from './defaults'
import { publishHydraGlobals } from './globals'

/**
 * A custom element that renders Hydra sketches.
 *
 * Thin facade that wires together the CanvasManager, HydraManager,
 * LoopController, and AttributeHandler.
 * @extends HTMLElement
 */
export class HydraElement extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height', 'global', 'audio', 'sources', 'outputs', 'precision', 'loop']
  }

  constructor() {
    super()
    this._code = ''
    this._connected = false
    this._scope = Object.create(null)
    this.attachShadow({ mode: 'open' })
    this.canvasManager = new CanvasManager(this.shadowRoot)
    this.attributeHandler = new AttributeHandler({
      ...DEFAULT_OPTIONS,
      width: 0,
      height: 0,
    })
    this.hydraManager = null
    this.loopController = null
    this._readyPromise = new Promise(resolve => {
      this._resolveReady = resolve
    })
    this._onResize = e => this.hydraManager?.setResolution(e.detail.width, e.detail.height)
    this._onContextLost = () => {
      if (this._connected && this.hydraManager) {
        this._initHydra()
      }
    }
    this._pendingResetAttrs = null
  }

  /**
   * Resolves with `{ synth }` once Hydra has been initialized.
   * Always resolvable, even when accessed after the element is connected.
   * Returns the live synth when the manager is active.
   * @returns {Promise<{synth: Object}>} A promise that resolves when Hydra is ready.
   */
  get ready() {
    return this.hydraManager ? Promise.resolve({ synth: this.synth }) : this._readyPromise
  }

  /**
   * Returns the canvas element associated with this element.
   * @returns {HTMLCanvasElement} The canvas element.
   */
  get canvas() {
    return this.canvasManager.canvas
  }

  /**
   * Setter for the canvas property.
   * @param {HTMLCanvasElement} value - The canvas element to set.
   */
  set canvas(value) {
    this.canvasManager.preserveCustomCanvas(value)
    if (this.hydraManager) {
      this.hydraManager.destroy()
      this._initHydra()
      if (this._code !== '') {
        this.hydraManager.evaluate(this._code)
      }
    }
  }

  /**
   * The hydra-synth instance (read-only)
   * Provides access to DSL functions, sources, outputs for advanced use cases
   * @returns {Object|undefined} The synth object
   */
  get synth() {
    return this.hydraManager?.synth
  }

  /**
   * Loads an extension script scoped to this element. While the script
   * loads, the element's Hydra surface is transiently published on
   * `window` so scripts that assume globals (bare `setFunction`,
   * `window._hydra`, `window.synth`) can self-register. The prior
   * `window` state is restored once the script promise settles.
   * @param {string} url
   * @returns {Promise<void>}
   */
  loadScript(url) {
    return this.hydraManager?.loadScript(url)
  }

  /**
   * Get the code of the element.
   * @returns {string} The code of the element.
   */
  get code() {
    return this._code
  }

  /**
   * Setter for the code property.
   * @param {string} value - The code to be set.
   */
  set code(value) {
    this._code = value
    if (this.hydraManager) {
      this.hydraManager.evaluate(value)
    }
  }

  /**
   * Called when an observed attribute has been added, removed, updated, or replaced.
   * @param {string} attrName - The name of the attribute that was changed.
   * @param {string|null} oldValue - The previous value of the attribute, or null if it didn't exist before.
   * @param {string|null} newValue - The new value of the attribute, or null if it was removed.
   */
  attributeChangedCallback(attrName, oldValue, newValue) {
    if (newValue === oldValue) return

    if (attrName === 'width' || attrName === 'height') {
      this._handleSizeChange(attrName, newValue)
    } else if (attrName === 'loop') {
      this._handleLoopChange(newValue)
    } else if (this.attributeHandler.hasSynthResettingAttribute(attrName)) {
      this._pendingResetAttrs = this._pendingResetAttrs || new Map()
      this._pendingResetAttrs.set(attrName, newValue)
      queueMicrotask(() => this._flushSynthReset())
    }
  }

  connectedCallback() {
    this._connected = true
    this.addEventListener('hydra-element-resize', this._onResize)
    this.addEventListener('hydra-context-lost', this._onContextLost)
    if (!this._initialized) {
      this._initialized = true
      if (this._code === '' && this.textContent.trim()) {
        this._code = this.textContent
        this.textContent = ''
      }
      const options = this.attributeHandler.getOptions()
      if (!this.canvasManager.canvas) {
        this.canvasManager.init(options.width, options.height)
      }
      if (!this.hydraManager) {
        this._initHydra()
      }
    }
    if (this.attributeHandler.getOptions().autoLoop) {
      this._startLoop()
    }
  }

  disconnectedCallback() {
    this._connected = false
    this.removeEventListener('hydra-element-resize', this._onResize)
    this.removeEventListener('hydra-context-lost', this._onContextLost)
    this._stopLoop()
    this.canvasManager.disconnect()
  }

  /**
   * Initializes the Hydra instance (via HydraManager) and restarts the loop.
   * @private
   */
  _initHydra() {
    this._stopLoop()
    this.hydraManager?.destroy()
    this.hydraManager = new HydraManager({
      host: this,
      options: this.attributeHandler.getOptions(),
      scope: this._scope,
    })
    this.hydraManager.init()
    this.canvasManager.tagAnalyzerCanvases()

    // Persistent exposure is opt-in via global="true". Non-global elements
    // never bind _hydra/synth/DSL on window — use loadScript or
    // el.loadScript for extension scripts that assume globals.
    if (this.hydraManager.hydra && this.attributeHandler.getOptions().makeGlobal) {
      publishHydraGlobals(this.hydraManager.hydra)
    }

    if (this._connected && this.attributeHandler.getOptions().autoLoop) {
      this._startLoop()
    }
    this._resolveReady({ synth: this.hydraManager.synth })
  }

  /**
   * Performs full teardown: stops the loop, destroys the HydraManager,
   * removes analyzer canvases, and resets initialization state so a later
   * reconnect initializes fresh.
   */
  destroy() {
    this._stopLoop()
    this.removeEventListener('hydra-element-resize', this._onResize)
    this.removeEventListener('hydra-context-lost', this._onContextLost)
    this.canvasManager.disconnect()
    this.canvasManager.removeAnalyzerCanvases()
    this.hydraManager?.destroy()
    this.hydraManager = null
    this._initialized = false
    this._readyPromise = new Promise(resolve => {
      this._resolveReady = resolve
    })
  }

  /**
   * Starts the animation loop.
   * @private
   */
  _startLoop() {
    if (!this.loopController) {
      this.loopController = new LoopController(dt => this.hydraManager.tick(dt))
    }
    this.loopController.start()
  }

  /**
   * Stops the animation loop.
   * @private
   */
  _stopLoop() {
    this.loopController?.stop()
  }

  /**
   * Handles width/height attribute changes.
   * @private
   */
  _handleSizeChange(attrName, newValue) {
    this.attributeHandler.update(attrName, newValue)
    if (newValue === null) {
      this.canvasManager.refreshFromCss()
      return
    }
    const options = this.attributeHandler.getOptions()
    this.canvasManager.resize(options.width, options.height)
    if (this.hydraManager) {
      this.hydraManager.setResolution(options.width, options.height)
    }
  }

  /**
   * Handles loop attribute changes.
   * @private
   */
  _handleLoopChange(newValue) {
    const options = this.attributeHandler.update('loop', newValue)
    if (this._connected && options.autoLoop) {
      this._startLoop()
    } else {
      this._stopLoop()
    }
  }

  /**
   * Flushes all pending synth-reset attribute changes in one batch.
   * Applies all option updates, then performs a single synth reset.
   * @private
   */
  _flushSynthReset() {
    if (!this._pendingResetAttrs) return
    const pending = this._pendingResetAttrs
    this._pendingResetAttrs = null

    for (const [attrName, newValue] of pending) {
      this.attributeHandler.update(attrName, newValue)
    }

    const options = this.attributeHandler.getOptions()
    this.canvasManager.init(options.width, options.height)
    this._initHydra()
    this.hydraManager.evaluate(this._code)
  }
}
