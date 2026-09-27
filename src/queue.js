export class EvalQueue {
  #tail = Promise.resolve()

  submit(task) {
    const result = this.#tail.then(task)
    this.#tail = result.catch(() => undefined)
    return result
  }
}
