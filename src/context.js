import { bindLiveScope, bindScope, hydraEval, unbindScope } from './eval'
import { publishHydraGlobals } from './globals'

export { hydraEval, userCodeLine } from './eval'

/**
 * Creates a Hydra evaluation context with a persistent scope.
 * @param {{ synth: unknown }} hydra A hydra-synth instance (anything with a `.synth`)
 * @param {Object} [options]
 * @param {Object} [options.scope] Existing scope to reuse instead of a fresh one
 * @param {boolean} [options.editorGlobals] Bind `_hydra`/`hydraSynth` into the scope (not the page's `window`). Default: true
 * @returns {{
 *   eval: (code: string) => Promise<unknown>,
 *   scope: Object,
 *   bind: (name: string, value: unknown) => void,
 *   bindLive: (name: string, provider: () => unknown) => void,
 *   unbind: (name: string) => void,
 * }}
 */
export function createContext(hydra, options = {}) {
  const { synth } = hydra
  const scope = options.scope ?? Object.create(null)
  const context = {
    eval: code => hydraEval(code, synth, scope),
    scope,
    bind(name, value) {
      bindScope(scope, name, value)
    },
    bindLive(name, provider) {
      bindLiveScope(scope, name, provider)
    },
    unbind(name) {
      unbindScope(scope, name)
    },
  }
  if (options.editorGlobals !== false) {
    context.bind('_hydra', hydra)
    context.bind('hydraSynth', hydra)
  }
  return context
}

/**
 * Loads an extension script into a Hydra evaluation context.
 * Exposes the engine globals on `window` for the duration of the script.
 * @param {string} url The script URL
 * @param {Object} target
 * @param {{ synth: unknown }} target.hydra A hydra-synth instance (used for the globals bridge)
 * @param {Object} [target.scope] The context scope the script evaluates against
 */
export async function loadScript(url, target = {}) {
  const { hydra, scope } = target
  if (!hydra) {
    throw new Error('[hydra-element] loadScript requires a hydra instance')
  }
  const restore = publishHydraGlobals(hydra)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`[hydra-element] loadScript failed: ${res.status} ${url}`)
    }
    const text = await res.text()
    return hydraEval(text, hydra.synth, scope)
  } finally {
    restore()
  }
}
