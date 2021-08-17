import HydraSynth from 'hydra-synth';

/**
 * Custom element with a global instance of `hydra-synth` embedded.
 */
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
    /**
     * Width of the canvas element to render to
     * @attr
     * @type {number}
     */
    this.width = window.innerWidth;
    /**
     * Height of the canvas element to render to
     * @attr
     * @type {number}
     */
    this.height = window.innerHeight;
    /**
     * Autodetect audio (ask for microphone)
     * @attr
     * @type {Boolean}
     */
    this.audio = false;
    /**
     * Number of source buffers to use
     * @attr
     * @type {number}
     */
    this.sources = 4;
    /**
     * Number of output buffers to use
     * @attr
     * @type {number}
     */
    this.outputs = 4;
    /**
     * Precision of the shaders
     * @attr
     * @type {"highp" | "mediump" | "lowp"}
     */
    this.precision = 'highp';
    this.attachShadow({ mode: 'open' });
    this.initCanvas();
    this.initHydraSynth();
  }

  connectedCallback() {
    this.shadowRoot.appendChild(this.canvas);
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    switch (attrName) {
      case 'width':
        this.canvas.width = parseInt(newValue);
        break;
      case 'height': 
        this.canvas.height = parseInt(newValue);
        break;
      case 'audio':
        this.updateHydraSynth({ detectAudio: JSON.parse(newValue) });
        break;
      case 'sources': 
        this.updateHydraSynth({ numSources: parseInt(newValue) });
        break;
      case 'outputs':
        this.updateHydraSynth({ numOutputs: parseInt(newValue) });
        break;
      case 'precision':
        this.updateHydraSynth({ precision: newValue }); 
        break; 
    }
  }

  /**
   * Initialize the canvas element to render to.
   */
  initCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvas = canvas;
  }

  /**
   * Initialize the `hydra-synth` engine.
   */
  initHydraSynth() {
    this.options = {
      detectAudio: this.audio,
      numSources: this.sources,
      numOutputs: this.outputs,
      precision: this.precision,
    }
    this.hydra = new HydraSynth({
      canvas: this.canvas,
      ...this.options,
    });
  }

  /**
   * Update the `hydra-synth` engine with the new option value.
   * @param {*} option Partial of the `hydra-synth` options
   */
  updateHydraSynth(option) {
    this.hydra = new HydraSynth({
      canvas: this.canvas,
      ...this.options,
      ...option,
    });
  }
}
