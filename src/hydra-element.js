import REGL from 'regl';
import { Hydra } from 'hydra-ts';
import arrayUtils from 'hydra-ts/src/lib/array-utils';

const defaultOptions = {
  width: window.innerWidth,
  height: window.innerHeight,
  numOutputs: 4,
  numSources: 4,
  precision: 'mediump',
};

export class HydraElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'width',
      'height',
      'num-outputs',
      'num-sources',
      'precision',
    ];
  }

  static #parseInt(value, defaultValue) {
    const result = parseInt(value);
    return Number.isNaN(result) || result < 0 ? defaultValue : result;
  }

  static #parsePrecision(value) {
    return ['highp', 'mediump', 'lowp'].includes(value) ? value : defaultOptions.precision;
  }

  options = defaultOptions;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.style.display = 'flex';
  }

  get eventName() {
    const idSufix = this.hasAttribute('id') ? `:${this.getAttribute('id')}` : '';
    return `hydra-element${idSufix}`;
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    this.#updateOption(attrName, newValue);
    if (this.hydra) {
      this.#initHydra();
    }
  }

  connectedCallback() {
    this.#createCanvas();
    this.#initHydra();
  }

  #createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    if (this.canvas.width === defaultOptions.width) {
      this.canvas.style.width = "100%";
    }
    if (this.canvas.height === defaultOptions.height) {
      this.canvas.style.height = "100%";
    }
    this.shadowRoot.appendChild(this.canvas);
  }

  #initHydra() {
    arrayUtils.init();
    const options = { regl: REGL(this.canvas), ...this.options };
    this.hydra = new Hydra(options);
    const { sources, outputs, hush, loop, render } = this.hydra;
    this.dispatchEvent(new CustomEvent(this.eventName, {
      detail: { sources, outputs, hush, loop, render },
      bubbles: true,
      composed: true
    }));
    console.info(this.eventName, this.hydra);
  }

  #updateOption(attrName, newValue) {
    switch (attrName) {
      case 'width':
        const width = HydraElement.#parseInt(newValue, defaultOptions.width);
        this.options = { ...this.options, width };
        // TODO: this.canvas.width = width;
        break;
      case 'height':
        const height = HydraElement.#parseInt(newValue, defaultOptions.height);
        this.options = { ...this.options, height };
        // TODO: this.canvas.height = height;
        break;
      case 'num-sources':
        const numSources = HydraElement.#parseInt(newValue, defaultOptions.numSources);
        this.options = { ...this.options, numSources };
        break;
      case 'num-outputs':
        const numOutputs = HydraElement.#parseInt(newValue, defaultOptions.numOutputs);
        this.options = { ...this.options, numOutputs };
        break;
      case 'precision':
        const precision = HydraElement.#parsePrecision(newValue);
        this.options = { ...this.options, precision };
        break;
    }
  }
}