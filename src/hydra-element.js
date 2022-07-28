import HydraSynth from '../lib/hydra-synth'


export class HydraElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'width',
      'height',
      'audio',
      'sources',
      'outputs',
      'precision',
    ];
  }

  constructor() {
    super();
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.audio = false;
    this.sources = 4;
    this.outputs = 4;
    this.precision = 'highp'; /* @type {"highp" | "mediump" | "lowp"} */
    this.attachShadow({ mode: 'open' });
    this.#initCanvas();
    this.#initOptions();
  }

  connectedCallback() {
    if (this.shadowRoot && this.canvas) {
      this.shadowRoot.appendChild(this.canvas);
      this.#initHydraSynth();
    }
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    this.#setIfWidth(attrName, newValue)
    this.#setIfHeight(attrName, newValue)
    this.#setIfAudio(attrName, newValue)
    this.#setIfSources(attrName, newValue)
    this.#setIfOutputs(attrName, newValue)
    this.#setIfPrecision(attrName, newValue)
    this.#initHydraSynth();
  }

  #initOptions() {
    this.options = {
      detectAudio: this.audio,
      numSources: this.sources,
      numOutputs: this.outputs,
      precision: this.precision,
    };
  }

  #initCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvas = canvas;
  }

  #initHydraSynth(options) {
    if (options) {
      this.options = {
        ...this.options,
        ...options,
      };
    }
    this.hydra = new HydraSynth({
      canvas: this.canvas,
      ...this.options,
    });
  }

  #setIfWidth(attrName, newValue) {
    if ('width' === attrName && this.canvas) {
      this.canvas.width = parseInt(newValue);
    }
  }

  #setIfHeight(attrName, newValue) {
    if ('height' === attrName && this.canvas) {
      this.canvas.height = parseInt(newValue);
    }
  }

  #setIfAudio(attrName, newValue) {
    if ('audio' === attrName) {
      this.options = { ...this.options, detectAudio: JSON.parse(newValue) };
    }
  }

  #setIfSources(attrName, newValue) {
    if ('sources' === attrName) {
      this.options = { ...this.options, numSources: parseInt(newValue) };
    }
  }

  #setIfOutputs(attrName, newValue) {
    if ('outputs' === attrName) {
      this.options = { ...this.options, numOutputs: parseInt(newValue) };
    }
  }

  #setIfPrecision(attrName, newValue) {
    if ('precision' === attrName) {
      this.options = { ...this.options, precision: newValue };
    }
  }
}
