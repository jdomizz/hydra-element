import { expect } from '@open-wc/testing'
import { parseNumber, parseJSON, parseOption } from './helper'

describe('parseNumber', () => {
  it('should return the parsed value if it is within the min and max range', () => {
    expect(parseNumber('10', 0, 5, 15)).to.equal(10)
  })

  it('should return the default value if the parsed value is less than the min range', () => {
    expect(parseNumber('3', 10, 5, 15)).to.equal(10)
  })

  it('should return the default value if the parsed value is greater than the max range', () => {
    expect(parseNumber('20', 10, 5, 15)).to.equal(10)
  })

  it('should return the default value if the input is not a valid number', () => {
    expect(parseNumber('abc', 10, 5, 15)).to.equal(10)
  })
})

describe('parseJSON', () => {
  it('should return the parsed value if the input is a valid JSON string', () => {
    expect(parseJSON('{"foo": "bar"}', {})).to.deep.equal({ foo: 'bar' })
  })

  it('should return the default value if the input is not a valid JSON string', () => {
    expect(parseJSON('not a JSON string', { foo: 'bar' })).to.deep.equal({ foo: 'bar' })
  })
  
  it('should return the default value if the input is an empty string', () => {
    expect(parseJSON('', { foo: 'bar' })).to.deep.equal({ foo: 'bar' })
  })
})

describe('parseOption', () => {
  it('should return the value if it is included in the options', () => {
    expect(parseOption('foo', 'default', ['foo', 'bar', 'baz'])).to.equal('foo')
  })

  it('should return the default value if the value is not included in the options', () => {
    expect(parseOption('qux', 'default', ['foo', 'bar', 'baz'])).to.equal('default')
  })

  it('should return the default value if the options array is empty', () => {
    expect(parseOption('foo', 'default', [])).to.equal('default')
  })
})