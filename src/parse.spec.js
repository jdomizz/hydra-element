import { expect } from '@open-wc/testing'
import { parseNumber, parseJSON, parseOption } from './parse'

describe('parseNumber', () => {
  it('should return the parsed value if it is within the min and max range', () => {
    expect(parseNumber('10', 0, 5, 15)).to.equal(10)
  })

  it('should return the default value if out of range or invalid', () => {
    expect(parseNumber('3', 10, 5, 15)).to.equal(10)
    expect(parseNumber('20', 10, 5, 15)).to.equal(10)
    expect(parseNumber('abc', 10, 5, 15)).to.equal(10)
  })

  it('should work without max parameter', () => {
    expect(parseNumber('10', 0, 5)).to.equal(10)
    expect(parseNumber('3', 10, 5)).to.equal(10)
  })

  it('should use Infinity as default max', () => {
    expect(parseNumber('999999', 0, 0)).to.equal(999999)
  })

  it('should reject invalid number strings', () => {
    expect(parseNumber('10abc', 0, 0)).to.equal(0)
    expect(parseNumber('5px', 0, 0)).to.equal(0)
  })

  it('should accept valid decimal numbers', () => {
    expect(parseNumber('42', 0, 0)).to.equal(42)
  })
})

describe('parseJSON', () => {
  it('should return the parsed value if the input is a valid JSON string', () => {
    expect(parseJSON('{"foo": "bar"}', {})).to.deep.equal({ foo: 'bar' })
  })

  it('should return the default value if the input is invalid or empty', () => {
    expect(parseJSON('not a JSON string', { foo: 'bar' })).to.deep.equal({ foo: 'bar' })
    expect(parseJSON('', { foo: 'bar' })).to.deep.equal({ foo: 'bar' })
  })

  it('should return the default for null, undefined, and empty string', () => {
    expect(parseJSON(null, true)).to.equal(true)
    expect(parseJSON(undefined, true)).to.equal(true)
    expect(parseJSON('', true)).to.equal(true)
  })

  it('should parse valid boolean strings', () => {
    expect(parseJSON('true', false)).to.equal(true)
    expect(parseJSON('false', true)).to.equal(false)
  })
})

describe('parseOption', () => {
  it('should return the value if it is included in the options', () => {
    expect(parseOption('foo', 'default', ['foo', 'bar', 'baz'])).to.equal('foo')
  })

  it('should return the default value if not in options or options empty', () => {
    expect(parseOption('qux', 'default', ['foo', 'bar', 'baz'])).to.equal('default')
    expect(parseOption('foo', 'default', [])).to.equal('default')
  })
})
