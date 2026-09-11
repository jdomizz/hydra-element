/**
 * Publishes a hydra-synth instance to `window` so extension scripts that
 * assume globals (bare `setFunction`, `window._hydra`, `window.synth`,
 * `window.hydraSynth`, ...) can self-register. Returns a `restore()`
 * closure that puts the prior `window` state back — restoring pre-existing
 * values and deleting keys that were absent. Used both for the persistent
 * global-mode exposure and for the transient `loadScript` bridge.
 *
 * The published names — `_hydra`, `hydraSynth`, `synth`, plus every
 * enumerable key on `hydra.synth` (DSL functions like `osc`, sources like
 * `s0`–`s3`, outputs like `o0`–`o3`) — cover every `window.*` read the
 * community extensions catalog surveys. The hyper-hydra `getHydra()` probe
 * finds `_hydra`; `window.hydraSynth` is an alias for the same instance.
 */

import type { HydraLike } from '../core'

export function publishHydraGlobals(hydra: HydraLike): () => void {
  const snapshot = new Map<string, { own: boolean; value: unknown }>()
  const win = window as unknown as Record<string, unknown>
  const keys = ['_hydra', 'hydraSynth', 'synth', ...Object.keys(hydra.synth)]
  for (const key of keys) {
    snapshot.set(key, {
      own: Object.prototype.hasOwnProperty.call(win, key),
      value: win[key],
    })
  }
  for (const key of snapshot.keys()) {
    const value = hydra.synth[key]
    if (key === '_hydra' || key === 'hydraSynth') {
      // Both names point at the same hydra-synth instance — extensions that
      // read either name get the same object.
      win[key] = hydra
    } else if (key === 'synth') {
      win[key] = hydra.synth
    } else if (typeof value === 'function') {
      win[key] = (value as (...args: unknown[]) => unknown).bind(hydra.synth)
    } else {
      win[key] = value
    }
  }
  return () => {
    for (const [key, entry] of snapshot) {
      if (entry.own) {
        win[key] = entry.value
      } else {
        delete win[key]
      }
    }
  }
}
