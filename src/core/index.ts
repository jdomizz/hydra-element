/**
 * The headless core entry — the `hydra-element/core` subpath.
 * Consumable from Node: orchestration is testable against an injected engine
 * factory and scheduler.
 */
export { HydraCore, createHydraCore, setDefaultHydraFactory } from './core'
export { createSession, hydraEval, userCodeLine, type Session } from './eval'
export { EvalQueue } from './queue'
export { Loop, type RafScheduler, type Scheduler } from './loop'
export type {
  CreateHydraCoreOptions,
  EngineOptions,
  HydraFactory,
  HydraLike,
  SynthLike,
} from './types'
