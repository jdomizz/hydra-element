/**
 * Publishes a hydra-synth instance to `window` so extension scripts that
 * assume globals (bare `setFunction`, `window._hydra`, `window.synth`, ...)
 * can self-register. Returns a `restore()` closure that puts the prior
 * `window` state back — restoring pre-existing values, deleting keys that
 * were absent. Use the same helper both for the persistent global-mode
 * exposure and for the transient `loadScript` bridge.
 */

/**
 * @param {Object} hydra - The hydra-synth instance whose surface to publish.
 * @returns {Function} A function that restores the prior `window` state.
 */
export function publishHydraGlobals(hydra) {
  const snapshot = new Map()
  const keys = ['_hydra', 'synth', ...Object.keys(hydra.synth)]
  for (const key of keys) {
    snapshot.set(key, {
      own: Object.prototype.hasOwnProperty.call(window, key),
      value: window[key],
    })
  }
  for (const key of snapshot.keys()) {
    if (key === '_hydra') {
      window._hydra = hydra
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
