/**
 * Evaluates code using a hydra-synth instance as scope.
 * Uses `new Function` + `with(proxy)` where proxy prioritizes synth properties
 * and falls back to window for globals (Math, console, etc.).
 * This provides better isolation than raw `with(synth)` while maintaining
 * compatibility with existing Hydra code.
 * @param {string} code The code to eval
 * @param {*} synth The instance of the hydra-synth
 */
export function hydraEval(code, synth) {
  const proxy = new Proxy(synth, {
    has(_target, _prop) {
      return true
    },
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      return window[prop]
    },
  })
  const fn = new Function('ctx', `with(ctx){return ${code}}`)
  return fn(proxy)
}
