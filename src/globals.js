/**
 * Publishes a hydra-synth instance to `window` so extension scripts that
 * assume globals (bare `setFunction`, `window._hydra`, `window.synth`,
 * `window.hydraSynth`, ...) can self-register. Returns a `restore()`
 * closure that puts the prior `window` state back — restoring
 * pre-existing values, deleting keys that were absent. Use the same
 * helper both for the persistent global-mode exposure and for the
 * transient `loadScript` bridge.
 *
 * The published names — `_hydra`, `hydraSynth`, `synth`, plus every
 * enumerable key on `hydra.synth` (DSL functions like `osc`, sources
 * like `s0`–`s3`, outputs like `o0`–`o3`) — cover every `window.*`
 * read the community extensions catalog surveys as of 2026-09-01
 * (see `.opencode/specs/hydra-element/active/playground-extensions-catalog.md`
 * §5). The hyper-hydra `getHydra()` probe finds `_hydra` (the
 * hydra-synth instance exposes `.regl`); `window.hydraSynth` is an
 * alias for the same instance, kept for compatibility with extensions
 * that pre-date `_hydra` (hydra-vertex, hydra-datamosh, the ojack
 * editor's shaderpark demo).
 */

/**
 * @param {Object} hydra - The hydra-synth instance whose surface to publish.
 * @returns {Function} A function that restores the prior `window` state.
 */
export function publishHydraGlobals(hydra) {
  const snapshot = new Map()
  // `hydraSynth` is published as an alias for `_hydra` for extensions
  // (hydra-vertex, hydra-datamosh) that read it directly; the
  // snapshot/restore below preserves any pre-existing `hydraSynth` on
  // `window` and deletes only what we introduced.
  const keys = ['_hydra', 'hydraSynth', 'synth', ...Object.keys(hydra.synth)]
  for (const key of keys) {
    snapshot.set(key, {
      own: Object.prototype.hasOwnProperty.call(window, key),
      value: window[key],
    })
  }
  for (const key of snapshot.keys()) {
    if (key === '_hydra' || key === 'hydraSynth') {
      // Both names point at the same hydra-synth instance — extensions
      // that read either name get the same object.
      window[key] = hydra
    } else if (key === 'synth') {
      window.synth = hydra.synth
    } else if (typeof hydra.synth[key] === 'function') {
      window[key] = hydra.synth[key].bind(hydra.synth)
    } else {
      window[key] = hydra.synth[key]
    }
  }
  return () => {
    for (const [key, entry] of snapshot) {
      if (entry.own) {
        window[key] = entry.value
      } else {
        delete window[key]
      }
    }
  }
}
