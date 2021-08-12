import HydraSynth from 'hydra-synth';

export class HydraElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'code',
      'width',
      'height',
      'audio',
      'sources',
      'outputs',
      'transforms',
      'pb',
    ];
  }

  constructor() {
    super();
    this.code = '';
    this.width = 1280;
    this.height = 720;
    this.audio = false;
    this.sources = 4;
    this.outputs = 4;
    this.transforms = [];
    this.pb = null;
    this.attachShadow({ mode: 'open' });
    this.createCanvas();
    new HydraSynth({
      canvas: this.canvas
      // TODO: inicializar!!!
    });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(this.canvas);
    this.evalCode();
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    switch (attrName) {
      case 'code': return this.updateCode(newValue);
      // TODO: esse
    }
  }

  updateCode(value) {
    this.code = value;
    this.evalCode();
  }

  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvas = canvas;
  }

  evalCode() {
    try {
      eval(this.code);
    } catch (e) {
      console.log(e)
    }
  }
}
