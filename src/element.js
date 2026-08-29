import { CanvasManager } from './canvas'
import { HydraManager } from './hydra'
import { LoopController } from './loop'
import { AttributeHandler, DEFAULT_OPTIONS } from './attributes'

/**
 * A custom element that renders Hydra sketches.
 *
 * Thin facade that wires together the CanvasManager, HydraManager,
 * LoopController, and AttributeHandler.
 * @extends HTMLElement
 */
export class HydraElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'width',
      'height',
      'global',
      'audio',
      'sources',
      'outputs',
      'precision',
      'loop',
    ]
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
  }

  /**
   * Resolves with `{ synth }` once Hydra has been initialized.
   * Always resolvable, even when accessed after the element is connected.
   * @returns {Promise<{synth: Object}>} A promise that resolves when Hydra is ready.
   */
  get ready() {
    return this._readyPromise
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
      this._handleSynthResetAttribute(attrName, newValue)
    }
  }

  connectedCallback() {
    this._connected = true
    this.addEventListener('hydra-element-resize', this._onResize)
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
    if (this._code !== '') {
      this.hydraManager.evaluate(this._code)
    }
  }

  disconnectedCallback() {
    this._connected = false
    this._initialized = false
    this.removeEventListener('hydra-element-resize', this._onResize)
    this._stopLoop()
    this.canvasManager.disconnect()
    if (this.hydraManager) {
      this.hydraManager.destroy()
      this.hydraManager = null
    }
  }

  /**
   * Initializes the Hydra instance (via HydraManager) and restarts the loop.
   * @private
   */
  _initHydra() {
    this._stopLoop()
    this.hydraManager = new HydraManager({
      host: this,
      options: this.attributeHandler.getOptions(),
      scope: this._scope,
    })
    this.hydraManager.init()
    if (this._connected && this.attributeHandler.getOptions().autoLoop) {
      this._startLoop()
    }
    this._resolveReady({ synth: this.hydraManager.synth })
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
    const options = this.attributeHandler.update(attrName, newValue)
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
   * Handles attribute changes that require resetting (recreating) the synth.
   * @private
   */
  _handleSynthResetAttribute(attrName, newValue) {
    const options = this.attributeHandler.update(attrName, newValue)
    this.canvasManager.init(options.width, options.height)
    this._initHydra()
    this.hydraManager.evaluate(this._code)
  }
}
