/**
 * Serializes code evaluations through a promise chain. Each task starts only
 * after the previous one settles — the historical `hydra.js#evalQueue`
 * semantics. The stored tail swallows rejections so one failed evaluation
 * never poisons the queue for later submissions.
 */
export class EvalQueue {
  #tail: Promise<unknown> = Promise.resolve()

  /**
   * Runs the task after every previously submitted task has settled.
   * @param task Returns a promise; resolved or rejected independently of the queue.
   * @returns The task's own result — the caller observes the failure.
   */
  submit(task: () => Promise<unknown>): Promise<unknown> {
    const result = this.#tail.then(task)
    this.#tail = result.catch(() => undefined)
    return result
  }
}
