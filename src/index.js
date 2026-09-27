import { HydraElement } from './element.js'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

export { HydraElement }
