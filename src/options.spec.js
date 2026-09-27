import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, OBSERVED_ATTRIBUTES, foldOptions } from './options'

describe('options', () => {
  it('should observe the layout attrs plus every parsed attr', () => {
    expect(OBSERVED_ATTRIBUTES).toEqual([
      'width',
      'height',
      'global',
      'audio',
      'sources',
      'outputs',
      'precision',
      'dpr',
      'loop',
    ])
  })

  it('should fold boolean attributes with JSON parsing', () => {
    expect(foldOptions(DEFAULT_OPTIONS, 'global', 'true').makeGlobal).toBe(true)
    expect(foldOptions(DEFAULT_OPTIONS, 'audio', 'true').detectAudio).toBe(true)
    expect(foldOptions(DEFAULT_OPTIONS, 'loop', 'false').autoLoop).toBe(false)
  })

  it('should fold numeric attributes within bounds', () => {
    expect(foldOptions(DEFAULT_OPTIONS, 'sources', '2').numSources).toBe(2)
    expect(foldOptions(DEFAULT_OPTIONS, 'sources', '99').numSources).toBe(4)
    expect(foldOptions(DEFAULT_OPTIONS, 'outputs', '0').numOutputs).toBe(0)
    expect(foldOptions(DEFAULT_OPTIONS, 'dpr', '1').dpr).toBe(1)
  })

  it('should fold precision as an option', () => {
    expect(foldOptions(DEFAULT_OPTIONS, 'precision', 'lowp').precision).toBe('lowp')
    expect(foldOptions(DEFAULT_OPTIONS, 'precision', 'bogus').precision).toBe(null)
  })

  it('should leave options untouched for unknown or layout attributes', () => {
    const options = { ...DEFAULT_OPTIONS }
    expect(foldOptions(options, 'width', '500')).toBe(options)
    expect(foldOptions(options, 'height', '300')).toBe(options)
    expect(foldOptions(options, 'unknown', 'x')).toBe(options)
  })
})
