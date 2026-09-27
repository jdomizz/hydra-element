/** Reads frames through the engine's `getScreenImage` latch. */
export class FrameCapture {
  #hydra = null
  #reject = null

  /** Attaches the engine whose frames are captured. */
  attach(hydra) {
    this.#hydra = hydra
  }

  /** Detaches the engine, rejecting any in-flight capture. */
  detach() {
    this.#reject?.(new Error('capture: the engine was torn down'))
    this.#reject = null
    this.#hydra = null
  }

  /**
   * Captures the next rendered frame as a PNG blob.
   * @param {() => boolean} isLoopRunning
   * @returns {Promise<Blob>}
   */
  capture(isLoopRunning) {
    if (this.#reject !== null) {
      return Promise.reject(new Error('capture: another capture is in flight'))
    }
    const hydra = this.#hydra
    if (!hydra || typeof hydra.getScreenImage !== 'function') {
      return Promise.reject(new Error('capture: the engine is not initialized'))
    }
    if (!isLoopRunning()) {
      return Promise.reject(new Error('capture: the render loop is not running'))
    }
    return new Promise((resolve, reject) => {
      this.#reject = reject
      hydra.getScreenImage(blob => {
        this.#reject = null
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('capture: no frame was produced'))
        }
      })
    })
  }
}
