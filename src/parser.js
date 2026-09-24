/**
 * Parses a string into a number and returns it. If the parsed value is not a
 * number or is outside the [min, max] range, returns the default value.
 * @param {string | null} value - The string to be parsed.
 * @param {number} defaultValue - The default value returned if the parsed value is invalid.
 * @param {number} min - The minimum value allowed (inclusive).
 * @param {number} [max] - The maximum value allowed (inclusive). Defaults to Infinity.
 * @returns {number} - The parsed number or the default value.
 */
export function parseNumber(value, defaultValue, min, max = Infinity) {
  if (value === null || value === undefined || value === '') return defaultValue
  const parsed = Number(value)
  return Number.isNaN(parsed) || parsed < min || parsed > max ? defaultValue : parsed
}

/**
 * Parses a JSON string and returns the resulting JavaScript value.
 * @param {string | null} value - The JSON string to parse.
 * @param {*} defaultValue - The value to return if the input is empty or cannot be parsed.
 * @returns {*} The parsed value or the default value.
 */
export function parseJSON(value, defaultValue) {
  if (value === null || value === undefined || value === '') return defaultValue
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

/**
 * Parses a value and returns it if it is included in the options array,
 * otherwise returns the default value.
 * @param {*} value - The value to parse.
 * @param {*} defaultValue - The default value returned if the value is not included.
 * @param {Array} options - The array of options to check against.
 * @returns {*} - The parsed value or the default value.
 */
export function parseOption(value, defaultValue, options) {
  return options.includes(value) ? value : defaultValue
}
