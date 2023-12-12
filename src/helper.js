/**
 * Parses a string into a number and returns it. If the parsed value is not a number or is outside the specified range, returns the default value.
 * @param {string} value - The string to be parsed into a number.
 * @param {number} defaultValue - The default value to be returned if the parsed value is not a number or is outside the specified range.
 * @param {number} min - The minimum value allowed for the parsed number.
 * @param {number} max - The maximum value allowed for the parsed number.
 * @returns {number} - The parsed number or the default value if the parsed value is not a number or is outside the specified range.
 */
export function parseNumber(value, defaultValue, min, max) {
  const parsedValue = parseInt(value, 10)
  return isNaN(parsedValue, min, max)
    ? defaultValue
    : parsedValue
}

/**
 * Parses a JSON string and returns the resulting JavaScript value.
 * @param {string} value - The JSON string to parse.
 * @param {*} defaultValue - The value to return if the JSON string is empty or cannot be parsed.
 * @returns {*} The resulting JavaScript value.
 */
export function parseJSON(value, defaultValue) {
  let result = defaultValue
  
  try {
    result = JSON.parse(value)
  } catch (error) {
    // console.log(error);
  }

  return result
}

/**
 * Parses a value and returns it if it is included in the options array, otherwise returns the default value.
 * @param {*} value - The value to parse.
 * @param {*} defaultValue - The default value to return if the value is not included in the options array.
 * @param {Array} options - The array of options to check against the value.
 * @returns {*} - The parsed value or the default value.
 */
export function parseOption(value, defaultValue, options) {
  return options.includes(value)
    ? value
    : defaultValue
}

/**
 * Checks if a value is NaN or outside of a given range.
 * @param {number} value - The value to check.
 * @param {number} min - The minimum value of the range (inclusive).
 * @param {number} [max] - The maximum value of the range (inclusive).
 * @returns {boolean} - True if the value is NaN or outside of the range, false otherwise.
 */
function isNaN(value, min, max) {
  return max
    ? Number.isNaN(value)
    || value < min
    || value > max
    : Number.isNaN(value)
    || value < min
}
