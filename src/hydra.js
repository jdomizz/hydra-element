import Hydra from 'hydra-synth'
import { hydraEval } from './eval'

/**
 * Wraps a hydra-synth instance: creation, code evaluation, and teardown.
 *
 * Holds the raw Hydra instance, a persistent user scope, and dispatches
 * `hydra-ready` / `hydra-eval` events on the host element. It knows nothing
 * about the canvas or the animation loop.
 */
export class HydraManager {
  /**
   * @param {Object} config
   * @param {HTMLElement} config.host - The element that owns this manager (event target).
   * @param {Object} config.options - Options passed to the Hydra constructor.
   * @param {Object} [config.scope] - Persistent scope for user code.
   */
  constructor({ host, options, scope }) {
    this.host = host
    this.options = options
    this.scope = scope || Object.create(null)
    this.hydra = null
  }

  /**
   * Creates the Hydra instance and dispatches `hydra-ready`.
   */
  init() {
    this.hydra = new Hydra({ ...this.options, autoLoop: false })
    if (this.hydra.loadScript) {
      this.scope.loadScript = this.hydra.loadScript.bind(this.hydra)
    }
    this.dispatchEvent('hydra-ready', { synth: this.hydra.synth })
  }

  /**
   * Clears all sources, stops audio, and drops the Hydra instance.
   */
  destroy() {
    if (this.hydra) {
      this.hydra.s?.forEach(source => source.clear?.())
      try {
        this.hydra.getAudio?.().stop?.()
      } catch {
        // Audio may not be started or already stopped
      }
      this.hydra = null
    }
  }

  /**
   * Evaluates user code, dispatching `hydra-eval` with the outcome.
   * @param {string} code
   */
  evaluate(code) {
    try {
      const result = this._evaluate(code)
      this._handleEvalResult(result)
    } catch (error) {
      this._dispatchEvalError(error)
    }
  }

  /**
   * Evaluates user code and returns the result.
   * Global mode runs through the sandbox; otherwise `hydraEval` is used.
   * @param {string} code
   * @returns {Promise|undefined} The evaluation result (always a Promise via hydraEval).
   * @private
   */
  _evaluate(code) {
    if (this.options.makeGlobal) {
      const wrapped = `(async () => { ${code} })()`
      return this.hydra.sandbox.eval(wrapped)
    }
    return hydraEval(code, this.hydra.synth, this.scope)
  }

  /**
   * Resolves the evaluation result, handling both promise and non-promise.
   * @param {Promise|*} result
   * @private
   */
  _handleEvalResult(result) {
    if (result && typeof result.catch === 'function') {
      result.then(() => this._dispatchEvalSuccess()).catch(error => this._dispatchEvalError(error))
    } else {
      this._dispatchEvalSuccess()
    }
  }

  /**
   * Dispatches the `hydra-eval` success event.
   * @private
   */
  _dispatchEvalSuccess() {
    this.dispatchEvent('hydra-eval', { success: true })
  }

  /**
   * Logs and dispatches the `hydra-eval` error event.
   * @param {Error} error
   * @private
   */
  _dispatchEvalError(error) {
    console.warn('[hydra-element] eval error:', error)
    this.dispatchEvent('hydra-eval', { success: false, error })
  }

  /**
   * Advances the Hydra render loop by the given delta time.
   * @param {number} dt
   */
  tick(dt) {
    this.hydra?.tick(dt)
  }

  /**
   * Updates the synth render resolution.
   * @param {number} width
   * @param {number} height
   */
  setResolution(width, height) {
    this.hydra?.synth.setResolution(width, height)
  }

  /**
   * The underlying hydra-synth instance (read-only).
   * @returns {Object|undefined} The synth object.
   */
  get synth() {
    return this.hydra?.synth
  }

  /**
   * Dispatches a bubbling CustomEvent on the host element.
   * @param {string} name
   * @param {Object} detail
   */
  dispatchEvent(name, detail) {
    this.host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
  }
}
