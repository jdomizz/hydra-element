/* Per-frame values and user props are state, not interface — publishing them tangles with extension `window.update`/`window.speed` chains (recursion). */
const EXCLUDED = new Set([
  'time',
  'speed',
  'bpm',
  'fps',
  'update',
  'afterUpdate',
  'mouse',
  'width',
  'height',
  'stats',
])

/** Publishes a hydra-synth instance to the global scope so extension scripts can self-register. */
export function publishHydraGlobals(hydra) {
  const snapshot = new Map()
  const win = globalThis
  const keys = [
    '_hydra',
    'hydraSynth',
    'synth',
    ...Object.keys(hydra.synth).filter(key => !EXCLUDED.has(key)),
  ]
  for (const key of keys) {
    snapshot.set(key, {
      own: Object.prototype.hasOwnProperty.call(win, key),
      value: win[key],
    })
  }
  for (const key of snapshot.keys()) {
    const value = hydra.synth[key]
    if (key === '_hydra' || key === 'hydraSynth') {
      win[key] = hydra
    } else if (key === 'synth') {
      win[key] = hydra.synth
    } else if (typeof value === 'function') {
      win[key] = value.bind(hydra.synth)
    } else {
      win[key] = value
    }
  }
  return () => {
    for (const [key, entry] of snapshot) {
      if (entry.own) win[key] = entry.value
      else delete win[key]
    }
  }
}
