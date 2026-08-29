const USER_PROPS = ['speed', 'bpm', 'update', 'afterUpdate', 'fps']

/**
 * Evaluates code using a hydra-synth instance as scope.
 *
 * SECURITY NOTE: This is NOT a sandbox. The Proxy fallback to `globalThis[prop]`
 * means user code has full access to browser globals (document, localStorage,
 * fetch, etc.). Only use this with trusted code. If you need isolation, use
 * a proper sandbox like an iframe with separate origin.
 *
 * The `has` trap always returns true so that `with(ctx)` doesn't throw
 * ReferenceError for unknown identifiers — it lets the `get` trap decide
 * whether to return a scope variable, synth property, or fall back to globalThis.
 *
 * The `set` trap maintains a separate local scope for bare assignments (e.g. `x = 5`)
 * while syncing user props (speed, bpm, etc.) to the synth.
 *
 * @param {string} code The code to eval (should be an expression or IIFE)
 * @param {Object} synth The hydra-synth instance to use as scope
 */
export function hydraEval(code, synth) {
  const proxy = createScopeProxy(synth)
  const fn = new Function('__scope', `with(__scope){${code}}`)
  return fn(proxy)
}

/**
 * Evaluates async code using a hydra-synth instance as scope.
 * Supports await syntax inside the code.
 *
 * @param {string} code The code to eval (may contain await)
 * @param {Object} synth The hydra-synth instance to use as scope
 * @returns {Promise<*>} The result of the async evaluation
 */
export function hydraEvalAsync(code, synth) {
  const proxy = createScopeProxy(synth)
  try {
    const fn = new Function('__scope', `return (async function(){with(__scope){${code}}})()`)
    return fn(proxy)
  } catch (e) {
    return Promise.reject(e)
  }
}

function createScopeProxy(synth) {
  const scopeObj = Object.create(null)

  return new Proxy(scopeObj, {
    has(_target, _prop) {
      return true
    },
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'string' && prop in synth) return synth[prop]
      return globalThis[prop]
    },
    set(target, prop, value) {
      target[prop] = value
      if (USER_PROPS.includes(prop)) {
        synth[prop] = value
      }
      return true
    },
  })
}
