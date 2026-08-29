const USER_PROPS = ['speed', 'bpm', 'update', 'afterUpdate', 'fps']

/**
 * Evaluates code using a hydra-synth instance as scope.
 *
 * The code runs inside an async function, so `await` works (e.g. for
 * `s0.initImage(await ...)` or `loadScript`) and the returned promise always
 * resolves to the code's return value (usually `undefined` for DSL statements).
 * Sync code runs unchanged; simply `await` the result.
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
 * VARIABLE PERSISTENCE:
 * - Bare assignments (`x = 5`) and `var` declarations persist across evals when
 *   a shared scope is provided (for live coding workflows like ojack editor).
 * - `let` and `const` declarations are block-scoped to the eval by design and
 *   do NOT persist. This is intentional JavaScript behavior.
 *
 * @param {string} code The code to eval (should be an expression or IIFE)
 * @param {Object} synth The hydra-synth instance to use as scope
 * @param {Object} [scope] Optional persistent scope for variable storage between evals
 * @returns {Promise<*>} A promise that resolves when evaluation completes
 */
export function hydraEval(code, synth, scope) {
  const proxy = createScopeProxy(synth, scope || Object.create(null))
  try {
    const fn = new Function('__scope', `return (async function(){with(__scope){${code}}})()`)
    return fn(proxy)
  } catch (e) {
    return Promise.reject(e)
  }
}

function createScopeProxy(synth, scopeObj) {
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