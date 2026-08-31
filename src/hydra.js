import Hydra from 'hydra-synth'
import { hydraEval } from './eval'
import { publishHydraGlobals } from './globals'

/**
 * Wraps a hydra-synth instance: creation, code evaluation, and teardown.
 *
 * Holds the raw Hydra instance, a persistent user scope, and dispatches
 * `hydra-ready` / `hydra-eval` events on the host element. It knows nothing
 * about the canvas or the animation loop.
 */
export class HydraManager {
  #host
  #options
  #scope
  #hydra
  #evalQueue

  /**
   * @param {Object} config
   * @param {HTMLElement} config.host - The element that owns this manager (event target).
   * @param {Object} config.options - Options passed to the Hydra constructor.
   * @param {Object} [config.scope] - Persistent scope for user code.
   */
  constructor({ host, options, scope }) {
    this.#host = host
    this.#options = options
    this.#scope = scope || Object.create(null)
    this.#hydra = null
    this.#evalQueue = Promise.resolve()
  }

  /**
   * Creates the Hydra instance and dispatches `hydra-ready`.
   *
   * When the host exposes a `canvas` (the normal case for HydraElement),
   * that canvas is handed to hydra-synth so it renders there — without
   * it, hydra-synth appends a fresh `<canvas>` to `document.body`,
   * which puts the rendered output outside the element's layout.
   *
   * Also exposes the sources (`s`) and outputs (`o`) arrays on the synth
   * so user code can iterate them (`s.length`, `o[i].clear()`, ...) without
   * requiring `global="true"` — non-global mode otherwise hides them.
   */
  init() {
    const opts = { ...this.#options, autoLoop: false }
    if (this.#host?.canvas) {
      opts.canvas = this.#host.canvas
    }
    this.#hydra = new Hydra(opts)
    if (this.#hydra.synth) {
      Object.defineProperty(this.#hydra.synth, 's', {
        value: this.#hydra.s,
        enumerable: false,
        configurable: true,
      })
      Object.defineProperty(this.#hydra.synth, 'o', {
        value: this.#hydra.o,
        enumerable: false,
        configurable: true,
      })
    }
    this.#options.extendTransforms?.forEach(fn => this.#hydra.synth.setFunction(fn))
    if (this.#hydra.loadScript) {
      this.#scope.loadScript = url => this.loadScript(url)
    }
    this.dispatchEvent('hydra-ready', { synth: this.#hydra.synth })
  }

  /**
   * Loads an extension script while transiently publishing the element's
   * Hydra on `window` so scripts that assume globals (bare `setFunction`,
   * `window._hydra`, `window.synth`, ...) can self-register. The prior
   * `window` state is restored once the script promise settles.
   * @param {string} url
   * @returns {Promise<void>}
   */
  async loadScript(url) {
    const restore = publishHydraGlobals(this.#hydra)
    try {
      await this.#hydra.loadScript(url)
    } finally {
      restore()
    }
  }

  /**
   * Clears all sources, stops audio, and drops the Hydra instance.
   */
  destroy() {
    if (this.#hydra) {
      this.#hydra.s?.forEach(source => source.clear?.())
      try {
        this.#hydra.getAudio?.().stop?.()
      } catch {
        // Audio may not be started or already stopped
      }
      this.#hydra = null
    }
  }

  /**
   * Evaluates user code, dispatching `hydra-eval` with the outcome.
   * Evaluations are serialized: each runs after the previous one resolves.
   * @param {string} code
   */
  evaluate(code) {
    this.#evalQueue = this.#evalQueue
      .then(() => this.#evaluate(code))
      .then(
        result => this.#handleEvalResult(result),
        error => this.#dispatchEvalError(error)
      )
  }

  /**
   * Evaluates user code and returns the result.
   * Global mode runs through the sandbox; otherwise `hydraEval` is used.
   * @param {string} code
   * @returns {Promise|undefined} The evaluation result (always a Promise via hydraEval).
   * @private
   */
  #evaluate(code) {
    if (this.#options.makeGlobal) {
      const wrapped = `(async () => { ${code} })()`
      return this.#hydra.sandbox.eval(wrapped)
    }
    return hydraEval(code, this.#hydra.synth, this.#scope)
  }

  /**
   * Resolves the evaluation result, handling both promise and non-promise.
   * @param {Promise|*} result
   * @private
   */
  #handleEvalResult(result) {
    if (result && typeof result.catch === 'function') {
      result.then(() => this.#dispatchEvalSuccess()).catch(error => this.#dispatchEvalError(error))
    } else {
      this.#dispatchEvalSuccess()
    }
  }

  /**
   * Dispatches the `hydra-eval` success event.
   * @private
   */
  #dispatchEvalSuccess() {
    this.dispatchEvent('hydra-eval', { success: true })
  }

  /**
   * Logs and dispatches the `hydra-eval` error event.
   * @param {Error} error
   * @private
   */
  #dispatchEvalError(error) {
    console.warn('[hydra-element] eval error:', error)
    this.dispatchEvent('hydra-eval', { success: false, error })
  }

  /**
   * Advances the Hydra render loop by the given delta time.
   * @param {number} dt
   */
  tick(dt) {
    this.#hydra?.tick(dt)
  }

  /**
   * Updates the synth render resolution.
   * @param {number} width
   * @param {number} height
   */
  setResolution(width, height) {
    this.#hydra?.synth.setResolution(width, height)
  }

  /**
   * The underlying hydra-synth instance (read-only).
   * @returns {Object|undefined} The synth object.
   */
  get synth() {
    return this.#hydra?.synth
  }

  /**
   * The raw `hydra-synth` instance, before unwrapping to the synth DSL.
   * Exposed so the host element can publish it on `window` when
   * `global="true"`; also useful for tests that need to stub methods
   * on the underlying instance.
   * @returns {Object|undefined}
   */
  get hydra() {
    return this.#hydra
  }

  /**
   * The persistent eval scope for this manager. User code's bare
   * assignments and `var` declarations land here; `hydraEval` resolves
   * unknown identifiers against this scope.
   * @returns {Object}
   */
  get scope() {
    return this.#scope
  }

  /**
   * Dispatches a bubbling CustomEvent on the host element.
   * @param {string} name
   * @param {Object} detail
   */
  dispatchEvent(name, detail) {
    this.#host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
  }
}
