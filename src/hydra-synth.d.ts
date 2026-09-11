/**
 * Ambient minimal types for the `hydra-synth` dependency (the package ships
 * no declaration file of its own).
 *
 * This module exists to let the browser entries compile against the real
 * import (`import Hydra from 'hydra-synth'`). It is typed loosely against the
 * structural core types (`src/core/types.ts` — the constructor options mirror
 * `EngineOptions`; relative imports are not allowed inside ambient module
 * declarations, so the shape is duplicated) and is NEVER re-exported from a
 * public entry — consumers keep the hand-typed public surface
 * (`HydraReadyDetail.synth: unknown`, `el.synth: unknown`).
 */
declare module 'hydra-synth' {
  /** Structural engine options accepted by the constructor (mirrors `EngineOptions`). */
  interface HydraSynthOptions {
    canvas?: HTMLCanvasElement
    makeGlobal?: boolean
    detectAudio?: boolean
    precision?: string | null
    numSources?: number
    numOutputs?: number
    /** Whether hydra-synth runs its own rAF loop. The core owns the loop, so
     *  the browser entry always passes `false`. */
    autoLoop?: boolean
    [key: string]: unknown
  }

  export default class Hydra {
    synth: any
    s: any[]
    o: any[]
    loadScript(url: string): Promise<unknown>
    tick(dt: number): void
    getAudio(): { stop?: () => void } | undefined
    constructor(options?: Partial<HydraSynthOptions>)
  }
}
