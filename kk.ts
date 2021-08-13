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
    new HydraSynth(this.options);
  }

  connectedCallback() {
    this.shadowRoot.appendChild(this.canvas);
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    this.updateHydraSynth(attrName, newValue);
  }

  initElement() {
    this.width = 1280;
    this.height = 720;
    this.auto = true;
    this.audio = false;
    this.sources = 4;
    this.outputs = 4;
    this.transforms = [];
    this.precision = 'highp';
    this.pb = null;
    this.options = {
      canvas: this.canvas,
      // width: this.width,
      // height: this.height,
      autoLoop: this.auto,
      makeGlobal: true,
      detectAudio: this.audio,
      numSources: this.sources,
      numOutputs: this.outputs,
      extendTransforms: this.transforms,
      precision: this.precision,
      pb: this.pb,
    };
  }

  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvas = canvas;
  }

  updateHydraSynth() {

  }
}
