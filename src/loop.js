/** Animation loop owned by the element. dt is in milliseconds. */
export class Loop {
  #onTick
  #rafId = null
  #lastTime = 0

  /** @param {{ onTick: (dt: number) => void }} options */
  constructor(options) {
    this.#onTick = options.onTick
  }

  /** Starts the loop. No-op when already running. */
  start() {
    if (this.#rafId !== null) return
    this.#lastTime = performance.now()
    const step = now => {
      this.tick(now)
      this.#rafId = globalThis.requestAnimationFrame(step)
    }
    this.#rafId = globalThis.requestAnimationFrame(step)
  }

  /** Stops the loop. No-op when not running. */
  stop() {
    if (this.#rafId !== null) {
      globalThis.cancelAnimationFrame(this.#rafId)
      this.#rafId = null
    }
  }

  /**
   * Computes delta time from the frame timestamp and calls the tick function.
   * @param {number} now A timestamp
   * @returns {number} The delta time in milliseconds
   */
  tick(now) {
    const dt = now - this.#lastTime
    this.#lastTime = now
    this.#onTick(dt)
    return dt
  }

  /** @returns {boolean} Whether the loop is running */
  get isRunning() {
    return this.#rafId !== null
  }
}
