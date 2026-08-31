/**
 * Static preset sketches shown in `<preset-selector>`.
 *
 * Title format: `extension — author — what it demonstrates`. The user sees
 * `title — description` in the dropdown, so the description carries the
 * author + demo summary.
 *
 * `requires` data on a preset is informational — the consumer decides
 * whether to bump `sources` / `outputs` before evaluating.
 *
 * Removed in the playground unification (per user feedback):
 *   - `osc`, `noise` — too simple (single-line sketches)
 *   - `typo (error)` — narrow debug use case
 *   - `reset` — utility, no demo value
 *   - `osc + arithmetics`, `osc + blend modes` — niche extensions
 *   - `custom GLSL` — kept (regression-tested by `playground/presets.spec.js`)
 *     but moved to the end so it doesn't clutter the common-picks menu
 *
 * Added in the unification:
 *   - `2-source blend`     — programmatic `s0.init(() => ...)`, no permissions
 *   - `6-source composite` — sources="6", programmatic init with `time`
 *   - `6-output audio-reactive` — extra-shaders-for-hydra + a.fft[] + outputs="6"
 */
export const PRESETS = [
  {
    title: 'osc + kaleid',
    description: 'Zach Krall (CC BY-NC-SA 4.0) — diff + repeat modulate',
    code: [
      'osc(10, 0.9, 300)',
      '.color(0.9, 0.7, 0.8)',
      '.diff(',
      '  osc(45, 0.3, 100)',
      '  .color(0.9, 0.9, 0.9)',
      '  .rotate(0.18)',
      '  .pixelate(12)',
      '  .kaleid()',
      ')',
      '.scrollX(10)',
      '.colorama()',
      '.luma()',
      '.repeatX(4)',
      '.repeatY(4)',
      '.modulate(',
      '  osc(1, -0.9, 300)',
      ')',
      '.scale(2)',
      '.out()',
    ].join('\n'),
  },
  {
    title: 'cam + blend',
    description: 'playground — camera + screen via s0+s1 (sources=2)',
    code: 's0.initCam(); s1.initScreen(); src(s0).blend(src(s1)).out()',
    requires: { sources: 2 },
  },
  {
    title: 'solid + blend',
    description: 'playground — solid() with time-varying params, blend demo',
    code: 'solid(() => Math.sin(time * 2) * 0.5 + 0.5, 0, 0, 1)\n  .blend(solid(0, () => Math.sin(time * 3) * 0.5 + 0.5, 0, 1))\n  .out()',
  },
  {
    title: '6-output audio-reactive',
    description: 'playground — extra-shaders-for-hydra + a.fft[] + outputs=6 (mic input)',
    code: [
      'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")',
      '',
      'turb(3, 0, () => 6 * ((0.5 * time) % 1.0)).out(o0)',
      'uturb(3, 0, () => 6 * ((0.5 * time) % 1.0)).out(o1)',
      'warp(3, 0, () => 6 * ((0.5 * time) % 1.0), () => 6 * ((0.5 * time) % 1.0)).out(o2)',
      'cwarp(3, 0, () => 6 * ((0.5 * time) % 1.0), () => 6 * ((0.5 * time) % 1.0)).out(o3)',
      'osc(20, 0.1, () => a.fft[0] * 4).modulate(src(o0), 0.5).out(o4)',
      'shape(99, 0.3, 0.7).modulate(src(o1), 0.3).out(o5)',
      'render(o0, o1, o2, o3, o4, o5)',
    ].join('\n'),
    requires: { outputs: 6, audio: true },
  },
  {
    title: 'corrupted screensaver',
    description: 'Ritchse (CC BY-NC-SA 4.0) — voronoi + diff chain',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=ritchse_1',
      '// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/',
      '//corrupted screensaver',
      '//by Ritchse',
      '//instagram.com/ritchse',
      '',
      'voronoi(350,0.15)',
      '\t.modulateScale(osc(8).rotate(Math.sin(time)),.5)',
      '\t.thresh(.8)',
      '\t.modulateRotate(osc(7),.4)',
      '\t.thresh(.7)',
      '\t.diff(src(o0).scale(1.8))',
      '\t.modulateScale(osc(2).modulateRotate(o0,.74))',
      '\t.diff(src(o0).rotate([-.012,.01,-.002,0]).scrollY(0,[-1/199800,0].fast(0.7)))',
      '\t.brightness([-.02,-.17].smooth().fast(.5))',
      '\t.out()',
    ].join('\n'),
  },
  {
    title: 'glitch river',
    description: 'Flor de Fuego — voronoi + kaleid feedback',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=flor_2',
      '//Glitch River',
      '//Flor de Fuego',
      '//https://flordefuego.github.io/',
      '',
      'voronoi(8,1)',
      '.mult(osc(10,0.1,()=>Math.sin(time)*3).saturate(3).kaleid(200))',
      '.modulate(o0,0.5)',
      '.add(o0,0.8)',
      '.scrollY(-0.01)',
      '.scale(0.99)',
      '.modulate(voronoi(8,1),0.008)',
      '.luma(0.3)',
      '.out()',
      '',
      '',
      'speed = 0.1',
      '',
      '',
    ].join('\n'),
  },
  {
    title: 'osc + mouse rotate',
    description: 'Olivia Jack — pixelated osc with mouse-driven modulateRotate',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=example_18',
      '// by Olivia Jack',
      '// https://ojack.github.io',
      '',
      'osc(6, 0, 0.8)',
      '  .color(1.14, 0.6,.80)',
      '  .rotate(0.92, 0.3)',
      '  .pixelate(20, 10)',
      '  .mult(osc(40, 0.03).thresh(0.4).rotate(0, -0.02))',
      '  .modulateRotate(osc(20, 0).thresh(0.3, 0.6), () => 0.1 + mouse.x * 0.002)',
      '  .out(o0)',
    ].join('\n'),
  },
  {
    title: 'osc + modulatePixelate',
    description: 'Naoto Hieda (@naoto_hieda) — chained outputs with pixelate modulation',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=naoto_0',
      '// @naoto_hieda',
      '',
      'osc(20, 0.1, 0).color(0, 1, 2).rotate(1.57/2).out(o1)',
      'osc(30, 0.01, 0).color(2, 0.7, 1).modulate(o1, 0).add(o1,1).modulatePixelate(o1,1,10).out(o0)',
    ].join('\n'),
  },
  {
    title: 'egg of the phoenix',
    description: 'Alexandre Rangel — stacked shape.diff chain with modulateScale',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=alexandre_2',
      '// "egg of the phoenix"',
      '// Alexandre Rangel',
      '// www.alexandrerangel.art.br/hydra.html',
      '',
      'speed=1.2',
      'shape(99,.15,.5).color(0,1,2)',
      '',
      '.diff( shape(240,.5,0).scrollX(.05).rotate( ()=>time/10 ).color(1,0,.75) )',
      '.diff( shape(99,.4,.002).scrollX(.10).rotate( ()=>time/20 ).color(1,0,.75) )',
      '.diff( shape(99,.3,.002).scrollX(.15).rotate( ()=>time/30 ).color(1,0,.75) )',
      '.diff( shape(99,.2,.002).scrollX(.20).rotate( ()=>time/40 ).color(1,0,.75) )',
      '.diff( shape(99,.1,.002).scrollX(.25).rotate( ()=>time/50 ).color(1,0,.75) )',
      '',
      '.modulateScale(',
      '  shape(240,.5,0).scrollX(.05).rotate( ()=>time/10 )',
      '  , ()=>(Math.sin(time/3)*.2)+.2 )',
      '',
      '.scale(1.6,.6,1)',
      '.out()',
    ].join('\n'),
  },
  {
    title: 'really love',
    description: 'Abhinay Khoparzi — osc.pixelate.kaleid + self-diff feedback',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=khoparzi_2',
      '// Really Love',
      '// by Abhinay Khoparzi',
      '// http://khoparzi.com',
      '',
      'osc(100,-0.01245,1).pixelate(50).kaleid(()=>(Math.sin(time/8)*9+3)).rotate(0,0.125)',
      '.modulateRotate(shape(3).scale(()=>(Math.cos(time)*2)).rotate(0,-0.25)).diff(src(o0).brightness(0.3))',
      '  .out()',
    ].join('\n'),
  },
  {
    title: 'turb / warp / cwarp',
    description: 'metagrowing (CC BY-NC-SA 4.0) — 4 outputs, extra-shaders-for-hydra',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=metagrowing_1',
      '// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/',
      'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")',
      '',
      'turb(3, 0,  () => 6 * ((0.5 * time) % 1.0)).out(o0);',
      'uturb(3, 0, () => 6 * ((0.5 * time) % 1.0)).out(o1);',
      'warp(3, 0,  () => 6 * ((0.5 * time) % 1.0), () => 6 * ((0.5 * time) % 1.0)).out(o2);',
      'cwarp(3, 0, () => 6 * ((0.5 * time) % 1.0), () => 6 * ((0.5 * time) % 1.0)).out(o3);',
      'render()',
    ].join('\n'),
  },
  {
    title: 'shader park torus',
    description: 'shader-park-core — 3D via sculptToHydraRenderer',
    code: [
      'const { sculptToHydraRenderer } = await import("https://unpkg.com/shader-park-core/dist/shader-park-core.esm.js")',
      '',
      'sculptToHydraRenderer(() => {',
      '\trotateX(time / 5)',
      '\trotateZ(time / 3)',
      '\tdisplace(sin(time), 1, 0)',
      '\tmirrorN(3, 3)',
      '\ttorus(0.8, 0.38 + 0.1 * sin(time))',
      '})',
      '\t.out(o0)',
      '',
      'render(o0)',
    ].join('\n'),
  },
  {
    title: 'midi solid',
    description: 'arnoson (CC BY-NC-SA 4.0) — MIDI `note()` drives solid() color',
    code: [
      '// from https://hydra.ojack.xyz/?sketch_id=arnoson_midi_solid',
      '// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/',
      'await loadScript(',
      "  'https://cdn.jsdelivr.net/npm/hydra-midi@latest/dist/index.js'",
      ')',
      '',
      '// Use midi messages from all channels of all inputs.',
      "await midi.start({ channel: '*', input: '*' })",
      'midi.show()',
      '',
      "solid(note('*'), 0, 1).out()",
    ].join('\n'),
  },
  {
    title: 'custom GLSL',
    description:
      'playground — user-defined src via setFunction() (self-contained, regression-tested)',
    code: [
      'setFunction({',
      '  name: "noixe",',
      '  type: "src",',
      '  inputs: [',
      '    { type: "float", name: "scale", default: 5 },',
      '    { type: "float", name: "offset", default: 0.5 },',
      '  ],',
      '  glsl: "return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);",',
      '})',
      'noixe(5, 0.5).out()',
    ].join('\n'),
  },
]
