/** Serializes evaluation tasks so they run one after another. */
export class EvalQueue {
  /** @type {Promise<unknown>} */
  #tail = Promise.resolve()

  /**
   * Queues a task to run after the previous one settles.
   * @param {() => Promise<unknown>} task
   * @returns {Promise<unknown>}
   */
  submit(task) {
    const result = this.#tail.then(task)
    this.#tail = result.catch(() => undefined)
    return result
  }
}
