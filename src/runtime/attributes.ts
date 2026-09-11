/**
 * Pure hydra-attribute parsing. Maps the engine's observed attributes
 * (`global`, `audio`, `sources`, `outputs`, `precision`, `loop`) to typed
 * runtime options. DOM-free — the runtime drives it from `parseHydraAttrs`
 * at attach and from a MutationObserver for live changes.
 */

import { parseJSON, parseNumber, parseOption } from '../parse'

/** The runtime's effective option set, derived from the observed attributes. */
export interface HydraRuntimeOptions {
  makeGlobal: boolean
  detectAudio: boolean
  numSources: number
  numOutputs: number
  precision: string | null
  autoLoop: boolean
}

/** The attributes the runtime adapter observes on the host. */
export const HYDRA_ATTRS = ['global', 'audio', 'sources', 'outputs', 'precision', 'loop']

/** The subset whose change requires recreating the engine (a synth reset). */
export const RESET_ATTRS = ['global', 'audio', 'sources', 'outputs', 'precision']

const PRECISION_VALUES = ['highp', 'mediump', 'lowp']

export const DEFAULT_RUNTIME_OPTIONS: HydraRuntimeOptions = {
  makeGlobal: false,
  detectAudio: false,
  numSources: 4,
  numOutputs: 4,
  precision: null,
  autoLoop: true,
}

/**
 * Reads every observed attribute from the host and folds them into the
 * default runtime options. Absent attributes keep their default — `null` is
 * NOT parsed (`parseNumber(null)` is `0`, which would clobber `numSources`/
 * `numOutputs` back to zero).
 */
export function parseHydraAttrs(host: {
  getAttribute(name: string): string | null
}): HydraRuntimeOptions {
  let options: HydraRuntimeOptions = { ...DEFAULT_RUNTIME_OPTIONS }
  for (const name of HYDRA_ATTRS) {
    const value = host.getAttribute(name)
    if (value === null) continue
    options = parseHydraAttr(name, value, options)
  }
  return options
}

/**
 * Parses a single attribute value into an updated option set. Falls back to
 * the current (or default) value when parsing fails; `sources`/`outputs` are
 * clamped to 0..16 via the default-on-out-of-range semantics.
 */
export function parseHydraAttr(
  name: string,
  value: string | null,
  prev: HydraRuntimeOptions
): HydraRuntimeOptions {
  switch (name) {
    case 'global':
      return { ...prev, makeGlobal: parseJSON(value, DEFAULT_RUNTIME_OPTIONS.makeGlobal) }
    case 'audio':
      return { ...prev, detectAudio: parseJSON(value, DEFAULT_RUNTIME_OPTIONS.detectAudio) }
    case 'sources':
      return { ...prev, numSources: parseNumber(value, DEFAULT_RUNTIME_OPTIONS.numSources, 0, 16) }
    case 'outputs':
      return { ...prev, numOutputs: parseNumber(value, DEFAULT_RUNTIME_OPTIONS.numOutputs, 0, 16) }
    case 'precision':
      return {
        ...prev,
        precision: parseOption(value, DEFAULT_RUNTIME_OPTIONS.precision, PRECISION_VALUES),
      }
    case 'loop':
      return { ...prev, autoLoop: parseJSON(value, DEFAULT_RUNTIME_OPTIONS.autoLoop) }
    default:
      return prev
  }
}

/**
 * Parses a reset attribute (the non-`loop` subset). Non-reset names return
 * the previous options untouched.
 */
export function parseResetAttr(
  name: string,
  value: string | null,
  prev: HydraRuntimeOptions
): HydraRuntimeOptions {
  return RESET_ATTRS.includes(name) ? parseHydraAttr(name, value, prev) : prev
}

/** Whether the given attribute name is one the runtime adapter observes. */
export function isHydraRuntimeAttr(name: string): boolean {
  return HYDRA_ATTRS.includes(name)
}
