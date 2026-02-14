import Hydra from 'hydra-synth'
import { parseJSON, parseNumber, parseOption } from './helper'
import { hydraEval } from './eval'

/**
 * Default options for Hydra Element.
 * @typedef {Object} DEFAULT_OPTIONS
 * @property {HTMLCanvasElement} canvas - The canvas element to render on.
 * @property {number} width - The width of the canvas.
 * @property {number} height - The height of the canvas.
 * @property {boolean} autoLoop - Whether to automatically loop the animation.
 * @property {boolean} makeGlobal - Whether to make the hydra instance global.
 * @property {boolean} detectAudio - Whether to detect audio input.
 * @property {number} numSources - The number of audio sources.
 * @property {number} numOutputs - The number of audio outputs.
 * @property {Array} extendTransforms - An array of custom transform functions.
 * @property {number} precision - The precision of the rendering.
 * @property {Object} pb - The instance of `rtc-patch-bay` for streaming.
 * @property {boolean} useAudioAnalyzer - Whether to use the Hydra audio analyzer UI.
 */
const DEFAULT_OPTIONS = {
  canvas: null,
  width: window.innerWidth,
  height: window.innerHeight,
  autoLoop: true,
  makeGlobal: false,
  detectAudio: false,
  numSources: 4,
  numOutputs: 4,
  extendTransforms: [],
  precision: null,
  pb: null,
  useAudioAnalyzer: true,
}

/**
 * A custom element that renders Hydra sketches.
 * @extends HTMLElement
 */
export class HydraElement extends HTMLElement {

  /**
   * An array of attribute names to observe on the custom element.
   * @returns {string[]}
   */
  static get observedAttributes() {
    return [
      'width',
      'height',
      'global',
      'analyzer',
      'audio',
      'sources',
      'outputs',
      'precision',
    ]
  }

  /**
   * Creates an instance of Element.
   * @constructor
   */
  constructor() {
    super()
    this._code = ''
    this._options = { ...DEFAULT_OPTIONS }
    this.attachShadow({ mode: 'open' })
  }

  /**
   * Returns the canvas element associated with this element.
   * @returns {HTMLCanvasElement} The canvas element.
   */
  get canvas() {
    return this._options.canvas;
  }

  /**
   * Setter for the canvas property.
   * @param {HTMLCanvasElement} value - The canvas element to set.
   */
  set canvas(value) {
    if (this._options.canvas) {
      this.shadowRoot?.getElementById('hydra-element-canvas')?.remove()
    }
    this._options.canvas = value;
    if (this._hydra) {
      this._initHydra()
    }
  }

  /**
   * Get the transforms of the element.
   * @returns {Array<Function>} The extended transforms.
   */
  get transforms() {
    return this._options.extendTransforms;
  }

  /**
   * Setter for the transforms property.
   * @param {Array<Function>} value - An array of functions to extend the transforms.
   */
  set transforms(value) {
    this._options.extendTransforms = value;
    if (this._hydra) {
      this._options.extendTransforms.forEach(fn => this._hydra.synth.setFunction(fn))
    }
  }

  /**
   * Gets the value of pb.
   *
   * @returns {Object} The value of pb.
   */
  get pb() {
    return this._options.pb;
  }

  /**
   * Sets the value of pb option.
   * @param {Object} value - The value to set for pb.
   */
  set pb(value) {
    this._options.pb = value;
    if (this._hydra) {
      this._initHydra()
    }
  }

  /**
   * Get the code of the element.
   * @returns {string} The code of the element.
   */
  get code() {
    return this._code;
  }

  /**
   * Setter for the code property.
   * @param {string} value - The code to be set.
   */
  set code(value) {
    this._code = value;
    if (this._hydra) {
      this._evalCode()
    }
  }

  /**
   * Called when an observed attribute has been added, removed, updated, or replaced.
   * @param {string} attrName - The name of the attribute that was changed.
   * @param {string|null} oldValue - The previous value of the attribute, or null if it didn't exist before.
   * @param {string|null} newValue - The new value of the attribute, or null if it was removed.
   */
  attributeChangedCallback(attrName, oldValue, newValue) {
    if (newValue !== oldValue) {
      this._options = this._getNewOptions(attrName, newValue)
      this._initCanvas()
      this._initHydra()
      this._evalCode()
    }
  }

  /**
   * Invoked each time the custom element is appended into a document-connected element.
   * If the element has a code block in its textContent, it will be evaluated and rendered on the canvas.
   * If the canvas or hydra instance are not initialized, they will be initialized.
   * @returns {void}
   */
  connectedCallback() {
    if (this._code === '' && this.textContent) {
      this._code = this.textContent
      this.textContent = ''
    }
    if (!this._options.canvas) {
      this._initCanvas()
    }
    if (!this._hydra) {
      this._initHydra()
    }
    if (this._code !== '') {
      this._evalCode()
    }
  }

  /**
   * Updates the element's state based on the elapsed time since the last tick.
   * @param {number} dt - The elapsed time in seconds.
   */
  tick(dt) {
    if (this._hydra) {
      this._hydra.tick(dt)
    }
  }

  /**
   * Initializes the canvas element for the element.
   * @private
   */
  _initCanvas() {
    this.shadowRoot?.querySelectorAll('canvas').forEach(canvas => canvas.remove());
    this._options.canvas = document.createElement('canvas')
    this._options.canvas.id = 'hydra-element-canvas'
    this._options.canvas.width = this._options.width
    this._options.canvas.height = this._options.height
    this._options.canvas.style.width = "100%"
    this._options.canvas.style.height = "100%"
    this.shadowRoot?.appendChild(this._options.canvas)
  }

  /**
   * Initializes the Hydra instance with the provided options and extends the transforms with the provided functions.
   * @private
   */
  _initHydra() {
    this._hydra = new Hydra({ ...this._options })
    this._options.extendTransforms.forEach(fn => this._hydra.synth.setFunction(fn))    
    if (!this._options.useAudioAnalyzer) {
      this.shadowRoot?.querySelectorAll('canvas:not(#hydra-element-canvas)').forEach(canvas => canvas.remove());
    }
    globalThis._hydra = this._hydra
  }

  /**
   * Evaluates the code in a new async function and executes it.
   * @private
   */
  _evalCode() {
    const code = `(async () => { ${this._code} })()`
    if (this._options.makeGlobal) {
      this._hydra.sandbox.eval(code)
    } else {
      hydraEval(code, this._hydra.synth)
    }
  }

  /**
   * Returns a new options object with the updated value for the specified attribute.
   * @param {string} attrName - The name of the attribute to update.
   * @param {any} newValue - The new value for the attribute.
   * @returns {Object} - A new options object with the updated attribute value.
   * @private
   */
  _getNewOptions(attrName, newValue) {    
    switch (attrName) {
      case 'width': return { ...this._options, width: parseNumber(newValue, DEFAULT_OPTIONS.width, 0) }
      case 'height': return { ...this._options, height: parseNumber(newValue, DEFAULT_OPTIONS.height, 0) }
      case 'global': return { ...this._options, makeGlobal: parseJSON(newValue, DEFAULT_OPTIONS.makeGlobal) }
      case 'analyzer': return { ...this._options, useAudioAnalyzer: parseJSON(newValue, DEFAULT_OPTIONS.useAudioAnalyzer) }
      case 'audio': return { ...this._options, detectAudio: parseJSON(newValue, DEFAULT_OPTIONS.detectAudio) }
      case 'sources': return { ...this._options, numSources: parseNumber(newValue, DEFAULT_OPTIONS.numSources, 0) }
      case 'outputs': return { ...this._options, numOutputs: parseNumber(newValue, DEFAULT_OPTIONS.numOutputs, 0) }
      case 'precision': return { ...this._options, precision: parseOption(newValue, DEFAULT_OPTIONS.precision, ['highp', 'mediump', 'lowp']) }
      default: return { ...this._options }
    }
  }

}
