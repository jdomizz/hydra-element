import { TransformDefinition } from 'hydra-ts'

export const customTransforms: TransformDefinition[] = [
  {
    name: 'noise2',
    type: 'src',
    inputs: [
      {
        type: 'float',
        name: 'scale',
        default: 10,
      },
      {
        type: 'float',
        name: 'offset',
        default: 0.1,
      },
    ],
    glsl: `   return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 1.0);`,
  },
  {
    name: 'pixelate2',
    type: 'coord',
    inputs: [
      {
        type: 'float',
        name: 'pixelX',
        default: 20,
      },
      {
        type: 'float',
        name: 'pixelY',
        default: 20,
      },
    ],
    glsl: `   vec2 xy = vec2(pixelX, pixelY);
 return (floor(_st * xy) + 0.5)/xy;`,
  }
]