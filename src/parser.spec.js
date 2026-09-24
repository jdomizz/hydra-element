import { describe, expect, it } from 'vitest'
import { parseJSON, parseNumber, parseOption } from './parser'

describe('parseNumber', () => {
  it('should return the parsed value if it is within the min and max range', () => {
    expect(parseNumber('10', 0, 5, 15)).toBe(10)
  })

  it('should return the default value if the parsed value is less than the min range', () => {
    expect(parseNumber('3', 10, 5, 15)).toBe(10)
  })

  it('should return the default value if the parsed value is greater than the max range', () => {
    expect(parseNumber('20', 10, 5, 15)).toBe(10)
  })

  it('should return the default value if the input is not a valid number', () => {
    expect(parseNumber('abc', 10, 5, 15)).toBe(10)
  })

  it('should return the default value when no max is provided', () => {
    expect(parseNumber('50', 10, 0)).toBe(50)
  })

  it('should parse decimals', () => {
    expect(parseNumber('1.5', 2, 0)).toBe(1.5)
  })

  it('should return the default value for a null input', () => {
    expect(parseNumber(null, 10, 0, 15)).toBe(10)
  })
})

describe('parseJSON', () => {
  it('should return the parsed value if the input is a valid JSON string', () => {
    expect(parseJSON('{"foo": "bar"}', {})).toEqual({ foo: 'bar' })
  })

  it('should return the default value if the input is not a valid JSON string', () => {
    expect(parseJSON('not a JSON string', { foo: 'bar' })).toEqual({ foo: 'bar' })
  })

  it('should return the default value if the input is an empty string', () => {
    expect(parseJSON('', { foo: 'bar' })).toEqual({ foo: 'bar' })
  })

  it('should return the default value for a null input', () => {
    expect(parseJSON(null, { foo: 'bar' })).toEqual({ foo: 'bar' })
  })
})

describe('parseOption', () => {
  it('should return the value if it is included in the options', () => {
    expect(parseOption('foo', 'default', ['foo', 'bar', 'baz'])).toBe('foo')
  })

  it('should return the default value if the value is not included in the options', () => {
    expect(parseOption('qux', 'default', ['foo', 'bar', 'baz'])).toBe('default')
  })

  it('should return the default value if the options array is empty', () => {
    expect(parseOption('foo', 'default', [])).toBe('default')
  })
})
