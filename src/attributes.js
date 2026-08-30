import { parseJSON, parseNumber, parseOption } from './parse'
import { DEFAULT_OPTIONS } from './defaults'

const ATTRS_REQUIRING_SYNTH_RESET = new Set(['global', 'audio', 'sources', 'outputs', 'precision'])

const PRECISION_VALUES = ['highp', 'mediump', 'lowp']

/**
 * Parses observed attributes into typed options and maintains the current
 * option set. Pure and DOM-free.
 */
export class AttributeHandler {
  /**
   * @param {Object} options - The initial options object.
   */
  constructor(options) {
    this.options = options
  }

  /**
   * Converts a raw attribute string into the option it maps to.
   * Falls back to the current (or default) value when parsing fails.
   * @param {string} attrName
   * @param {string} newValue
   * @returns {Object} The option updates, e.g. `{ width: 500 }`.
   */
  parse(attrName, newValue) {
    switch (attrName) {
      case 'width':
        return { width: parseNumber(newValue, this.options.width, 0) }
      case 'height':
        return { height: parseNumber(newValue, this.options.height, 0) }
      case 'global':
        return { makeGlobal: parseJSON(newValue, DEFAULT_OPTIONS.makeGlobal) }
      case 'audio':
        return { detectAudio: parseJSON(newValue, DEFAULT_OPTIONS.detectAudio) }
      case 'sources':
        return { numSources: parseNumber(newValue, DEFAULT_OPTIONS.numSources, 0, 16) }
      case 'outputs':
        return { numOutputs: parseNumber(newValue, DEFAULT_OPTIONS.numOutputs, 0, 16) }
      case 'precision':
        return { precision: parseOption(newValue, DEFAULT_OPTIONS.precision, PRECISION_VALUES) }
      case 'loop':
        return { autoLoop: parseJSON(newValue, DEFAULT_OPTIONS.autoLoop) }
    }
  }

  /**
   * Applies the parsed update to the current options, immutably.
   * @param {string} attrName
   * @param {string} newValue
   * @returns {Object} The updated options.
   */
  update(attrName, newValue) {
    this.options = { ...this.options, ...this.parse(attrName, newValue) }
    return this.options
  }

  /**
   * @returns {Object} The current options.
   */
  getOptions() {
    return this.options
  }

  /**
   * Whether the attribute requires resetting (recreating) the synth.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasSynthResettingAttribute(attrName) {
    return ATTRS_REQUIRING_SYNTH_RESET.has(attrName)
  }
}
