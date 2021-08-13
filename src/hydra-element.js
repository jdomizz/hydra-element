import HydraSynth from 'hydra-synth';

export class HydraElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'width',
      'height',
      'auto',
      'audio',
      'sources',
      'outputs',
      'transforms',
      'precision',
      'pb',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.initElement();
    this.createCanvas();
    new HydraSynth({
      ...this.opts,
      canvas: this.canvas,
      extendTransforms: this.transforms,
      pb: this.pb,
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
      case 'auto':
        this.updateHydraSynth({ autoLoop: JSON.parse(newValue) });
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
      // TODO: case 'transforms':  
      case 'precision':
        this.updateHydraSynth({ precision: newValue }); 
        break; 
      // TODO: case 'pb':  
    }
  }

  initElement() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.auto = true;
    this.audio = false;
    this.sources = 4;
    this.outputs = 4;
    this.transforms = [];
    this.precision = 'highp';
    this.pb = null;
    this.opts = {
      makeGlobal: true,
      autoLoop: this.auto,
      detectAudio: this.audio,
      numSources: this.sources,
      numOutputs: this.outputs,
      precision: this.precision,
    }
  }

  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvas = canvas;
  }

  updateHydraSynth(option) {
    new HydraSynth({
      ...this.opts,
      ...option,
      canvas: this.canvas,
      extendTransforms: this.transforms,
      pb: this.pb,
    });
  }
}
