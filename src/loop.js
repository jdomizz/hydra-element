/**
 * Drives a requestAnimationFrame loop, calculating delta time between frames
 * and feeding it to a tick function. Generic — knows nothing about Hydra.
 */
export class LoopController {
  #tickFn
  #rafId
  #lastTime

  /**
   * @param {(dt: number) => void} tickFn - Called each frame with the delta time.
   */
  constructor(tickFn) {
    this.#tickFn = tickFn
    this.#rafId = null
    this.#lastTime = 0
  }

  /**
   * Starts the loop. Safe to call when already running (no-op).
   */
  start() {
    if (this.#rafId !== null) return
    this.#lastTime = performance.now()
    const step = now => {
      this.tick(now)
      this.#rafId = requestAnimationFrame(step)
    }
    this.#rafId = requestAnimationFrame(step)
  }

  /**
   * Stops the loop. Safe to call when not running (no-op).
   */
  stop() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId)
      this.#rafId = null
    }
  }

  /**
   * Computes delta time from the frame timestamp and calls the tick function.
   * @param {number} now - A DOMHighResTimeStamp.
   * @returns {number} The delta time in milliseconds.
   */
  tick(now) {
    const dt = now - this.#lastTime
    this.#lastTime = now
    this.#tickFn(dt)
    return dt
  }

  /**
   * Whether the loop is currently running.
   * @returns {boolean}
   */
  get isRunning() {
    return this.#rafId !== null
  }
}
