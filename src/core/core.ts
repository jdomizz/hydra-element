/**
 * The HydraCore orchestrator: wires the injected engine factory, the
 * persistent user scope, the serialized eval queue, and the scheduler-driven
 * loop into one headless adapter. No events, no DOM, no hooks — the runtime
 * adapter owns all of those.
 */

import { hydraEval, userCodeLine } from './eval'
import { EvalQueue } from './queue'
import { Loop } from './loop'
import type { CreateHydraCoreOptions, HydraFactory, HydraLike, SynthLike } from './types'

/**
 * Attaches a best-effort 1-based user-code line to an eval error (the
 * `hydra.js#dispatchEvalError` line computation, kept on the error object so
 * the runtime can read it back).
 */
function attachEvalLine(error: unknown, code: string): unknown {
  if (error instanceof Error) {
    const line = userCodeLine(error, code)
    if (typeof line === 'number') {
      ;(error as Error & { line?: number }).line = line
    }
  }
  return error
}

export class HydraCore {
  #options: CreateHydraCoreOptions
  #factory: HydraFactory
  #hydra: HydraLike | null = null
  /** The persistent user scope — survives engine (re)initialization. */
  #scope: Record<string, unknown>
  #queue = new EvalQueue()
  #loop: Loop | null = null

  constructor(options: CreateHydraCoreOptions, factory: HydraFactory) {
    this.#options = options
    this.#factory = factory
    this.#scope = options.scope ?? (Object.create(null) as Record<string, unknown>)
  }

  /**
   * Builds the engine through the factory and wires the `s`/`o` arrays on the
   * synth (non-enumerable, the historical `defineProperty` shape). When an
   * engine already exists it is destroyed and recreated (synth reset
   * semantics — `#initCore` on the runtime invokes this for every reset).
   */
  init(): void {
    if (this.#hydra) this.destroy()
    const hydra = this.#factory(this.#options)
    this.#hydra = hydra
    if (hydra.synth) {
      Object.defineProperty(hydra.synth, 's', {
        value: hydra.s,
        enumerable: false,
        configurable: true,
      })
      Object.defineProperty(hydra.synth, 'o', {
        value: hydra.o,
        enumerable: false,
        configurable: true,
      })
    }
  }

  // -- engine access -------------------------------------------------------

  /** The synth DSL instance, or `undefined` before init / after destroy. */
  get synth(): SynthLike | undefined {
    return this.#hydra?.synth
  }

  /** The raw engine instance (the object the factory built). */
  get hydra(): HydraLike | null {
    return this.#hydra
  }

  /** The persistent user scope object (survives engine resets). */
  get scope(): Record<string, unknown> {
    return this.#scope
  }

  /** Writes a value into the persistent user scope (plain object write). */
  addToEvalScope(name: string, value: unknown): void {
    this.#scope[name] = value
  }

  // -- eval ----------------------------------------------------------------

  /**
   * Evaluates user code, serialized through the eval queue. Rejects with an
   * error carrying `.line` (best-effort) when the code fails.
   */
  evalAsync(code: string): Promise<unknown> {
    return this.#queue
      .submit(() => {
        const hydra = this.#hydra
        if (!hydra) return Promise.reject(new Error('[hydra-element] evalAsync before init'))
        return hydraEval(code, hydra.synth, this.#scope)
      })
      .catch(error => {
        throw attachEvalLine(error, code)
      })
  }

  // -- loop ----------------------------------------------------------------

  /** Starts the engine loop (RAF by default; the injected scheduler in tests). */
  start(): void {
    this.#ensureLoop()
    this.#loop?.start()
  }

  /** Stops the engine loop. Safe to call when not running (no-op). */
  stop(): void {
    this.#loop?.stop()
  }

  /** Manual tick — forwards dt to the engine (no-op after destroy). */
  tick(dt: number): void {
    this.#hydra?.tick?.(dt)
  }

  /** Updates the synth render resolution. */
  setResolution(width: number, height: number): void {
    this.#hydra?.synth.setResolution(width, height)
  }

  // -- loadScript ----------------------------------------------------------

  /**
   * Loads an extension script through the raw engine `loadScript`. The
   * transient `window` globals bridge stays runtime-side.
   */
  loadScript(url: string): Promise<unknown> {
    const hydra = this.#hydra
    if (!hydra?.loadScript)
      return Promise.reject(new Error('[hydra-element] loadScript before init'))
    return hydra.loadScript(url)
  }

  // -- teardown ------------------------------------------------------------

  /**
   * Destroys the engine and stops the loop. Safe to call twice; the core can
   * be re-initialized afterwards (re-created engine). Sources clear + audio
   * stop in the exact historical order (`hydra.js#destroy`).
   */
  destroy(): void {
    this.stop()
    const hydra = this.#hydra
    if (!hydra) return
    hydra.s?.forEach(source => source.clear?.())
    try {
      hydra.getAudio?.()?.stop?.()
    } catch {
      // audio not started or already stopped
    }
    this.#hydra = null
  }

  #ensureLoop(): void {
    if (this.#loop) return
    this.#loop = new Loop({
      onTick: dt => this.tick(dt),
      scheduler: this.#options.scheduler,
    })
  }
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

let defaultHydraFactory: HydraFactory | null = null

/**
 * Registers the browser-side default engine factory (the main entry calls
 * this with the real `hydra-synth` import). Pass `null` to clear.
 */
export function setDefaultHydraFactory(factory: HydraFactory | null): void {
  defaultHydraFactory = factory
}

/**
 * Creates a HydraCore. The engine comes from `options.hydraFactory` (test
 * seam) or the default registered by the browser entry. Throws when neither
 * is available — importing the package entry wires the default.
 */
export function createHydraCore(options: CreateHydraCoreOptions): HydraCore {
  const factory = options.hydraFactory ?? defaultHydraFactory
  if (!factory) {
    throw new Error(
      '[hydra-element] createHydraCore requires a hydraFactory — import from "hydra-element" (browser entry) or pass one in tests'
    )
  }
  const core = new HydraCore(options, factory)
  core.init()
  return core
}
