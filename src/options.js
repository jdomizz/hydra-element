import { parseJSON, parseNumber, parseOption } from './parser'

/** Default options for creating a Hydra instance. */
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

/** Maps each `hydra-element` attribute to a function that parses it into options. */
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
 * @param {Object} options
 * @param {string} attrName
 * @param {string|null} newValue
 * @returns {Object}
 */
export function foldOptions(options, attrName, newValue) {
  const parse = ATTR_PARSERS[attrName]
  return parse ? parse(options, newValue) : options
}
