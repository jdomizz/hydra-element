/**
 * The scheduler-injected animation loop — ported from the old `LoopController`
 * with the frame source extracted behind an injectable `Scheduler` so the Node
 * lane can drive frames manually. dt is in milliseconds; `start()` resets
 * `#lastTime` so the first frame never sees a dt spike. Knows nothing about
 * Hydra.
 */

/** The frame-source seam the loop drives. */
export interface RafScheduler {
  requestAnimationFrame(callback: (time: number) => void): number
  cancelAnimationFrame(id: number): void
}

/** `'raf'` selects the browser default frame source; an object injects one. */
export type Scheduler = 'raf' | RafScheduler

/**
 * The browser default frame source. Built lazily per `start()` call — the
 * module itself also loads in Node, where `requestAnimationFrame` does not
 * exist and `start()` is a no-op until a scheduler is injected.
 */
const defaultScheduler: RafScheduler | null =
  typeof globalThis.requestAnimationFrame === 'function'
    ? {
        requestAnimationFrame: callback => globalThis.requestAnimationFrame(callback),
        cancelAnimationFrame: id => globalThis.cancelAnimationFrame(id),
      }
    : null

export interface LoopOptions {
  onTick: (dt: number) => void
  scheduler?: Scheduler
}

export class Loop {
  #onTick: (dt: number) => void
  #scheduler: Scheduler
  #rafId: number | null = null
  #activeScheduler: RafScheduler | null = null
  #lastTime = 0

  constructor(options: LoopOptions) {
    this.#onTick = options.onTick
    this.#scheduler = options.scheduler ?? 'raf'
  }

  /**
   * Starts the loop. Safe to call when already running (no-op). A no-op when
   * no frame source is available (Node without an injected scheduler).
   */
  start(): void {
    if (this.#rafId !== null) return
    const scheduler = this.#resolveScheduler()
    if (!scheduler) return
    this.#activeScheduler = scheduler
    this.#lastTime = performance.now()
    const step = (now: number) => {
      this.tick(now)
      this.#rafId = scheduler.requestAnimationFrame(step)
    }
    this.#rafId = scheduler.requestAnimationFrame(step)
  }

  /** Stops the loop. Safe to call when not running (no-op). */
  stop(): void {
    if (this.#rafId !== null) {
      this.#activeScheduler?.cancelAnimationFrame(this.#rafId)
      this.#rafId = null
      this.#activeScheduler = null
    }
  }

  /**
   * Computes delta time from the frame timestamp and calls the tick function.
   * @param now A DOMHighResTimeStamp.
   * @returns The delta time in milliseconds.
   */
  tick(now: number): number {
    const dt = now - this.#lastTime
    this.#lastTime = now
    this.#onTick(dt)
    return dt
  }

  /** Whether the loop is currently running. */
  get isRunning(): boolean {
    return this.#rafId !== null
  }

  #resolveScheduler(): RafScheduler | null {
    if (this.#scheduler === 'raf') return defaultScheduler
    return this.#scheduler
  }
}
