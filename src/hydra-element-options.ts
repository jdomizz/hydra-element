import { Precision } from 'hydra-ts/src/Hydra'
import { isIOS } from './hydra-element-helper'


export type HydraElementOptions = {
  width: number
  height: number
  numSources: number
  numOutputs: number
  precision: Precision
  density: number
}

export function createHydraElementOptions(): HydraElementOptions {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    numSources: 4,
    numOutputs: 4,
    precision: (isIOS ? 'highp' : 'mediump') as Precision,
    density: 1
  }
}
