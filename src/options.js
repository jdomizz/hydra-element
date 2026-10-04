import { parseJSON, parseNumber, parseOption } from './parser.js'

/**
 * Options for creating a Hydra instance, as folded from element attributes.
 * @typedef {Object} HydraOptions
 * @property {HTMLCanvasElement | null} canvas The canvas to render into.
 * @property {boolean} autoLoop Whether the engine runs its own loop (the element overrides it).
 * @property {boolean} makeGlobal Whether to publish Hydra globals on `window`.
 * @property {boolean} detectAudio Whether to enable audio analysis.
 * @property {number} numSources Number of source buffers.
 * @property {number} numOutputs Number of output buffers.
 * @property {Array<Function>} extendTransforms Custom GLSL transforms.
 * @property {'highp'|'mediump'|'lowp'|null} precision Shader precision.
 * @property {any} pb An `rtc-patch-bay` instance.
 * @property {number} dpr Device-pixel-ratio cap.
 */

/** @type {HydraOptions} Default options for creating a Hydra instance. */
export const DEFAULT_OPTIONS = {
  canvas: null,
  autoLoop: true,
  makeGlobal: false,
  detectAudio: false,
  numSources: 4,
  numOutputs: 4,
  extendTransforms: [],
  precision: null,
  pb: null,
  dpr: 2,
}

/** @typedef {(options: HydraOptions, value: string | null) => HydraOptions} AttrParser */

/**
 * Maps each `hydra-element` attribute to a function that parses it into options.
 * @type {Record<string, AttrParser>}
 */
const ATTR_PARSERS = {
  global: (options, value) => ({
    ...options,
    makeGlobal: parseJSON(value, DEFAULT_OPTIONS.makeGlobal),
  }),
  audio: (options, value) => ({
    ...options,
    detectAudio: parseJSON(value, DEFAULT_OPTIONS.detectAudio),
  }),
  sources: (options, value) => ({
    ...options,
    numSources: Math.floor(parseNumber(value, DEFAULT_OPTIONS.numSources, 0, 16)),
  }),
  outputs: (options, value) => ({
    ...options,
    numOutputs: Math.floor(parseNumber(value, DEFAULT_OPTIONS.numOutputs, 0, 16)),
  }),
  precision: (options, value) => ({
    ...options,
    precision: parseOption(value, DEFAULT_OPTIONS.precision, ['highp', 'mediump', 'lowp']),
  }),
  dpr: (options, value) => ({
    ...options,
    dpr: parseNumber(value, DEFAULT_OPTIONS.dpr, 1),
  }),
  loop: (options, value) => ({
    ...options,
    autoLoop: parseJSON(value, DEFAULT_OPTIONS.autoLoop),
  }),
}

/** Attributes observed by the element: layout attrs plus the parsed ones. */
export const OBSERVED_ATTRIBUTES = ['width', 'height', ...Object.keys(ATTR_PARSERS)]

/**
 * Folds the parsed attribute value into the options.
 * @param {HydraOptions} options
 * @param {string} attrName
 * @param {string|null} newValue
 * @returns {HydraOptions}
 */
export function foldOptions(options, attrName, newValue) {
  const parse = ATTR_PARSERS[attrName]
  return parse ? parse(options, newValue) : options
}
