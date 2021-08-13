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
    this.attachShadow({ mode: 'open' });
    this.initElement();
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

  initElement() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.audio = false;
    this.sources = 4;
    this.outputs = 4;
    this.precision = 'highp';
    this.options = {
      detectAudio: this.audio,
      numSources: this.sources,
      numOutputs: this.outputs,
      precision: this.precision,
    }
  }

  initCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvas = canvas;
  }

  initHydraSynth() {
    this.hydra = new HydraSynth({
      canvas: this.canvas,
      ...this.options,
    });
  }

  updateHydraSynth(option) {
    this.hydra = new HydraSynth({
      canvas: this.canvas,
      ...this.options,
      ...option,
    });
  }
}
