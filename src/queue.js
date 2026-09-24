/** Serializes code evaluations through a promise chain (one runs after the previous settles). */
export class EvalQueue {
  #tail = Promise.resolve()

  /**
   * @param {() => Promise} task
   * @returns {Promise}
   */
  submit(task) {
    const result = this.#tail.then(task)
    this.#tail = result.catch(() => undefined)
    return result
  }
}
