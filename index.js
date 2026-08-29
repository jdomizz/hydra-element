import { HydraElement } from './src/element.js'
import { hydraEval } from './src/eval.js'

window.customElements.define('hydra-element', HydraElement)

export { HydraElement, hydraEval }
