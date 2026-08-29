/**
 * Evaluates code using a hydra-synth instance as scope.
 * Uses `new Function` + `with(synth)` so that primitive properties
 * (time, speed, bpm, width, height) are resolved dynamically on every access,
 * matching the behaviour of makeGlobal = true.
 * @param {string} code The code to eval
 * @param {*} synth The instance of the hydra-synth
 */
export function hydraEval(code, synth) {
    const fn = new Function('synth', `with(synth){${code}}`)
    fn(synth)
}
