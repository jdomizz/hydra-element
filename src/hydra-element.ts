import { HydraElement } from './index.js'

/** Global typing for the `<hydra-element>` custom element. */
declare global {
  interface HTMLElementTagNameMap {
    'hydra-element': HydraElement
  }
}

export { HydraElement }
