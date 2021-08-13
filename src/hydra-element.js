import HydraSynth from 'hydra-synth';

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
    this.hydra = new HydraSynth({
      ...this.options,
      canvas: this.canvas,
    });
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

  updateHydraSynth(option) {
    this.hydra = new HydraSynth({
      ...this.options,
      ...option,
      canvas: this.canvas,
    });
  }
}
