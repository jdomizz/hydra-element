/**
 * Evaluates code using a hydra-synth instance as scope.
 *
 * SECURITY NOTE: This is NOT a sandbox. The Proxy fallback to `window[prop]`
 * means user code has full access to browser globals (document, localStorage,
 * fetch, etc.). Only use this with trusted code. If you need isolation, use
 * a proper sandbox like an iframe with separate origin.
 *
 * The `has` trap always returns true so that `with(ctx)` doesn't throw
 * ReferenceError for unknown identifiers — it lets the `get` trap decide
 * whether to return a synth property or fall back to window.
 *
 * @param {string} code The code to eval (should be an expression or IIFE)
 * @param {Object} synth The hydra-synth instance to use as scope
 */
export function hydraEval(code, synth) {
  const proxy = new Proxy(synth, {
    has(_target, _prop) {
      return true
    },
    get(target, prop, receiver) {
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver)
        if (typeof value === 'function' && !isGlobalFunction(value)) {
          return value.bind(target)
        }
        return value
      }
      return window[prop]
    },
  })
  const fn = new Function('ctx', `with(ctx){return ${code}}`)
  return fn(proxy)
}

function isGlobalFunction(fn) {
  const globals = [Promise, setTimeout, setInterval, requestAnimationFrame, cancelAnimationFrame]
  return globals.some(g => fn === g)
}
