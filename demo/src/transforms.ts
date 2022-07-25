import { TransformDefinition } from 'hydra-ts'

// https://gitlab.com/metagrowing/extra-shaders-for-hydra

export const customTransforms: TransformDefinition[] = [
  {
    name: 'wave',
    type: 'src',
    inputs: [
      { name: 'time', type: 'float', default: 0.0 },
      { name: 'frequ', type: 'float', default: 10.0 },
      { name: 'loops', type: 'float', default: 3.0 },
      { name: 'thick', type: 'float', default: 0.025 },
    ],
    glsl: `
    const float eps = 0.001;
    float x = _st.x - time;
    float y = _st.y - 0.5;
    float scale = 0.25;
    float l = 0.0;
    for(int i=0; i<6; ++i) {
      y += scale * sin(frequ * x);
      if(l >= loops) break;
      scale *= 0.5;
      frequ *= 2.0;
      l += 1.0;
    }
    float d = smoothstep(0.0, eps, y) - smoothstep(thick, thick+eps, y);
    return vec4(d, d, d, 1);
  `},
  {
    name: 'pulse',
    type: 'src',
    inputs: [
      { name: 'edge', type: 'float', default: 0.5 },
      { name: 'width', type: 'float', default: 0.05 },
      { name: 'epsilon', type: 'float', default: 0.001 },
    ],
    glsl: `
      float ea = abs(epsilon);
      float wa = abs(width);
      float d0 = smoothstep(edge-ea, edge+ea, _st.x);
      float d1 = smoothstep(edge+wa-ea, edge+wa+ea, _st.x);
      float d = d0-d1;
      return vec4(d, d, d, 1);
  `}
]