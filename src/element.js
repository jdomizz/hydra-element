import Hydra from 'hydra-synth'
import { parseJSON, parseNumber, parseOption } from './helper'

const DEFAULT_OPTIONS = {
  canvas: null,
  width: window.innerWidth,
  height: window.innerHeight,
  autoLoop: true,
  makeGlobal: true,
  detectAudio: false,
  numSources: 4,
  numOutputs: 4,
  extendTransforms: [],
  precision: null,
  pb: null
}

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
    ]
  }

  constructor() {
    super()
    this._code = ''
    this._options = DEFAULT_OPTIONS
    this.attachShadow({ mode: 'open' })
  }

  get canvas() {
    return this._options.canvas;
  }

  set canvas(value) {
    if (this._options.canvas) {
      this.shadowRoot?.querySelector('canvas')?.remove()
    }
    this._options.canvas = value;
    if (this._hydra) {
      this._initHydra()
    }
  }

  get transforms() {
    return this._options.extendTransforms;
  }

  set transforms(value) {
    this._options.extendTransforms = value;
    if (this._hydra) {
      this._options.extendTransforms.forEach(fn => this._hydra.synth.setFunction(fn))
    }
  }

  get pb() {
    return this._options.pb;
  }

  set pb(value) {
    this._options.pb = value;
    if (this._hydra) {
      this._initHydra()
    }
  }

  get code() {
    return this._code;
  }

  set code(value) {
    this._code = value;
    if (this._hydra) {
      this._evalCode()
    }
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    if (newValue !== oldValue) {
      this._options = this._getNewOptions(attrName, newValue)
      this._initCanvas()
      this._initHydra()
      this._evalCode()
    }
  }

  connectedCallback() {
    if (this._code === '' && this.textContent) {
      this._code = this.textContent
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

  tick(dt) {
    if (this._hydra) {
      this._hydra.tick(dt)
    }
  }

  _initCanvas() {
    this.shadowRoot?.querySelector('canvas')?.remove()
    this._options.canvas = document.createElement('canvas')
    this._options.canvas.width = this._options.width
    this._options.canvas.height = this._options.height
    this._options.canvas.style.width = "100%"
    this._options.canvas.style.height = "100%"
    this.shadowRoot?.appendChild(this._options.canvas)
  }

  _initHydra() {
    this._hydra = new Hydra({ ...this._options })
    this._options.extendTransforms.forEach(fn => this._hydra.synth.setFunction(fn))
  }

  _evalCode() {
    const code = `(async () => { ${this._code} })()`
    if (this._options.makeGlobal) {
      this._hydra.sandbox.eval(code)
    } else {
      new Function('synth', code)(this._hydra.synth)
    }
  }

  _getNewOptions(attrName, newValue) {
    switch (attrName) {
      case 'width': return { ...this._options, width: parseNumber(newValue, DEFAULT_OPTIONS.width, 0) }
      case 'height': return { ...this._options, height: parseNumber(newValue, DEFAULT_OPTIONS.height, 0) }
      case 'global': return { ...this._options, makeGlobal: parseJSON(newValue, DEFAULT_OPTIONS.makeGlobal) }
      case 'audio': return { ...this._options, detectAudio: parseJSON(newValue, DEFAULT_OPTIONS.detectAudio) }
      case 'sources': return { ...this._options, numSources: parseNumber(newValue, DEFAULT_OPTIONS.numSources, 0) }
      case 'outputs': return { ...this._options, numOutputs: parseNumber(newValue, DEFAULT_OPTIONS.numOutputs, 0) }
      case 'precision': return { ...this._options, precision: parseOption(newValue, DEFAULT_OPTIONS.precision, ['highp', 'mediump', 'lowp']) }
      default: return { ...this._options }
    }
  }

}
