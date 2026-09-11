/**
 * Parses a string into a number and returns it. If the parsed value is not a
 * number or is outside the specified range, returns the default value.
 *
 * @param value The raw attribute string to parse. `null` is allowed — the
 *   attribute-removal path flows through here and `Number(null)` is `0`
 *   (historical behavior preserved).
 * @param defaultValue The default value returned if the parsed value is not a
 *   number or is outside the specified range.
 * @param min The minimum value allowed for the parsed number.
 * @param max The maximum value allowed for the parsed number.
 * @returns The parsed number or the default value if the parsed value is not
 *   a number or is outside the specified range.
 */
export function parseNumber(
  value: string | null,
  defaultValue: number,
  min: number,
  max = Infinity
): number {
  const parsedValue = Number(value)
  return isOutOfRange(parsedValue, min, max) ? defaultValue : parsedValue
}

/**
 * Parses a JSON string and returns the resulting JavaScript value.
 * @param value The JSON string to parse.
 * @param defaultValue The value to return if the JSON string is empty or
 *   cannot be parsed.
 * @returns The resulting JavaScript value.
 */
export function parseJSON<T>(value: string | null, defaultValue: T): T {
  if (value === null || value === undefined || value === '') return defaultValue
  try {
    return JSON.parse(value) as T
  } catch {
    return defaultValue
  }
}

/**
 * Parses a value and returns it if it is included in the options array,
 * otherwise returns the default value.
 * @param value The value to parse.
 * @param defaultValue The default value to return if the value is not included
 *   in the options array.
 * @param options The array of options to check against the value.
 * @returns The parsed value or the default value.
 */
export function parseOption<T>(value: unknown, defaultValue: T, options: readonly T[]): T {
  return options.includes(value as T) ? (value as T) : defaultValue
}

/**
 * Checks if a value is NaN or outside of a given range.
 * @param value The value to check.
 * @param min The minimum value of the range (inclusive).
 * @param max The maximum value of the range (inclusive).
 * @returns True if the value is NaN or outside of the range, false otherwise.
 */
function isOutOfRange(value: number, min: number, max: number): boolean {
  return Number.isNaN(value) || value < min || value > max
}
