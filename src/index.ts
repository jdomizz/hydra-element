/**
 * The `hydra-element` main entry — the side-effect import that registers the
 * default engine factory (the real `hydra-synth`), the default runtime
 * factory, and the `<hydra-element>` custom element.
 *
 * This is the only module that imports `hydra-synth`.
 */

import Hydra from 'hydra-synth'
import { setDefaultHydraFactory } from './core'
import { HydraElement } from './element/element'
import { setDefaultRuntimeFactory } from './element/runtime'
import { HydraRuntime } from './runtime/runtime'

// The core drives the loop (start/stop/tick); hydra-synth must not run its
// own internal rAF loop alongside it, or time advances twice per frame.
setDefaultHydraFactory(opts => new Hydra({ ...opts, autoLoop: false }))
setDefaultRuntimeFactory(() => new HydraRuntime())

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

export { HydraElement }
export type {
  HydraEvalDetail,
  HydraReadyDetail,
  HydraResizeDetail,
  HydraTransformFunction,
} from './types'
