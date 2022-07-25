import { Precision } from 'hydra-ts/src/Hydra';


export function parseIntAttribute(value: string, defaultValue: number): number {
  const parsedValue = parseInt(value, 10)
  return Number.isNaN(parsedValue) || parsedValue < 0
    ? defaultValue
    : parsedValue
}

export function parseFloatAttribute(value: string, defaultValue: number): number {
  const parsedValue = parseFloat(value)
  return Number.isNaN(parsedValue) || parsedValue < 0
    ? defaultValue
    : parsedValue
}

export function parsePrecisionAttribute(value: string, defaultValue: Precision): Precision {
  const parsedValue = ['highp', 'mediump', 'lowp'].includes(value)
    ? value
    : defaultValue
  return parsedValue as Precision
}


export const isIOS = (/iPad|iPhone|iPod/.test(navigator.platform)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  && !(window as any).MSStream
