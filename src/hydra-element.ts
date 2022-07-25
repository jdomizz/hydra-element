import REGL from 'regl'
import { Hydra } from 'hydra-ts'
import arrayUtils from 'hydra-ts/src/lib/array-utils'

import { createHydraElementOptions, HydraElementOptions } from './hydra-element-options'
import { parseFloatAttribute, parseIntAttribute, parsePrecisionAttribute } from './hydra-element-helper'


export class HydraElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'width',
      'height',
      'num-sources',
      'num-outputs',
      'precision',
      'density',
    ]
  }

  #hydra?: Hydra
  #canvas?: HTMLCanvasElement
  #options: HydraElementOptions
  #defaults: HydraElementOptions

  constructor() {
    super()
    this.#defaults = createHydraElementOptions()
    this.#options = this.#defaults
    this.attachShadow({ mode: 'open' })
    this.style.display = 'flex'
  }

  connectedCallback() {
    this.#createCanvas()
    this.#initHydra()
    if (this.#hydra) {
      this.#dispatchEvent()
      this.#hydra.loop.start()
    }
  }

  attributeChangedCallback(attrName: string, _oldValue: string, newValue: string) {
    this.#updateOptions(attrName, newValue)
    this.#updateCanvas(attrName)
    this.#updateHydra()
  }

  #initHydra() {
    if (this.#canvas) {
      arrayUtils.init()
      this.#hydra = new Hydra({
        regl: REGL(this.#canvas),
        ...this.#options,
        width: this.#options.width * this.#options.density,
        height: this.#options.height * this.#options.density,
      })
    }
  }

  #createCanvas() {
    const canvas = document.createElement('canvas')
    canvas.width = this.#options.width
    canvas.height = this.#options.height
    if (this.#options.width === window.innerWidth) {
      canvas.style.width = "100%" // resizable
    }
    if (this.#options.height === window.innerHeight) {
      canvas.style.height = "100%"  // resizable
    }
    this.#canvas = canvas
    this.shadowRoot?.appendChild(this.#canvas)
  }

  #updateOptions(attrName: string, newValue: string) {
    if ('width' === attrName) {
      this.#options.width = parseIntAttribute(newValue, this.#defaults.width)
    }
    if ('height' === attrName) {
      this.#options.height = parseIntAttribute(newValue, this.#defaults.height)
    }
    if ('num-sources' === attrName) {
      this.#options.numSources = parseIntAttribute(newValue, this.#defaults.numSources)
    }
    if ('num-outputs' === attrName) {
      this.#options.numOutputs = parseIntAttribute(newValue, this.#defaults.numOutputs)
    }
    if ('precision' === attrName) {
      this.#options.precision = parsePrecisionAttribute(newValue, this.#defaults.precision)
    }
    if ('density' === attrName) {
      this.#options.density = parseFloatAttribute(newValue, this.#defaults.density)
    }
  }

  #updateCanvas(attrName: string) {
    if (['width', 'height'].includes(attrName)) {
      const canvas = this.shadowRoot?.querySelector('canvas')
      if (canvas) {
        canvas.remove()
        this.#createCanvas()
      }
    }
  }

  #updateHydra() {
    if (this.#hydra) {
      this.#initHydra()
      this.#dispatchEvent()
      this.#hydra.loop.start()
    }
  }

  #dispatchEvent() {
    this.dispatchEvent(new CustomEvent(this.#eventName, {
      detail: {
        hydra: this.#hydra,
        stream: this.#canvas?.captureStream(25),
      },
      bubbles: true,
      composed: true
    }))
  }

  get #eventName() {
    const tagName = this.tagName.toLowerCase()
    const idSufix = this.hasAttribute('id')
      ? `:${this.getAttribute('id')}`
      : ''
    return `${tagName}${idSufix}`
  }
}
