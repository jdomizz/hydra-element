/**
 * Structural contracts shared by the headless core. Nothing here touches the
 * DOM at runtime — `canvas` is typed so the factory can receive it, the core
 * itself never reads it.
 */

import type { Scheduler } from './loop'

/** The synth DSL surface the core requires from an engine. */
export interface SynthLike {
  setResolution(width: number, height: number): unknown
  speed?: number
  bpm?: number
  time?: number
  fps?: number
  [key: string]: unknown
}

/** The raw hydra-synth instance (the object a factory builds). */
export interface HydraLike {
  synth: SynthLike
  s?: Array<{ clear?: () => void }>
  o?: unknown[]
  loadScript?(url: string): Promise<unknown>
  tick?(dt: number): void
  getAudio?(): { stop?: () => void } | undefined
}

/** Builds an engine instance from the runtime options. */
export type HydraFactory = (opts: EngineOptions) => HydraLike

/** Options handed to the factory — the hydra-synth constructor surface. */
export interface EngineOptions {
  canvas: HTMLCanvasElement
  makeGlobal?: boolean
  detectAudio?: boolean
  precision?: string | null
  numSources?: number
  numOutputs?: number
}

/** Options accepted by `createHydraCore` (factory + scheduler are injectable seams). */
export interface CreateHydraCoreOptions extends EngineOptions {
  hydraFactory?: HydraFactory
  scheduler?: Scheduler
}
