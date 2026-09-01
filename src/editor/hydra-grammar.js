// Adapted from sweep's packages/app/src/app/shared/hydra-prism.ts (same
// owner, AGPL-3.0-or-later). The grammar is the source of truth for the DSL
// function list; PR hydra-synth#211's global.d.ts will eventually supersede
// it.

import 'prismjs'
import 'prismjs/components/prism-javascript.js'

// `prismjs` is a UMD-style package: the main entry installs `Prism` on
// `globalThis` (the language component files reference it as a global),
// and doesn't export it as an ES module. We read it back from
// `globalThis` after the side-effect import above.
const { Prism } = globalThis

const HYDRA_DSL_FUNCTIONS = [
  'osc',
  'src',
  'solid',
  'noise',
  'shape',
  'voronoi',
  'kaleid',
  'rotate',
  'scale',
  'hue',
  'saturate',
  'contrast',
  'add',
  'luma',
  'grain',
  'scanline',
  'dither',
  'chromatic',
  'vignette',
  'tri',
  'square',
  'saw',
  'invert',
  'colorama',
  'out',
  'diff',
  'layer',
  'mask',
  'blend',
  'modulate',
  'repeat',
  'scrollX',
  'scrollY',
  'pixelate',
  'posterize',
  'shift',
  'thresh',
  'modulateScrollX',
  'modulateScrollY',
  'modulateKaleid',
  'modulateRepeat',
  'modulateRepeatX',
  'modulateRepeatY',
].join('|')

const HYDRA_GLOBALS = 'k[0-7]|g[0-7]|gp[0-7]|time|o[0-3]|a'

// Singleton guard: if both the playground and the element reference this
// module, the import resolves to the same instance — but Vite HMR or test
// isolation might re-evaluate the module, so guard explicitly.
if (!Prism.languages.hydra) {
  Prism.languages.hydra = Prism.languages.extend('javascript', {
    function: new RegExp(`\\b(?:${HYDRA_DSL_FUNCTIONS})\\b`),
    global: new RegExp(`\\b(?:${HYDRA_GLOBALS})\\b`),
  })
}

/**
 * CodeJar-compatible highlight callback. CodeJar saves/restores the
 * selection around the call, so reassigning `innerHTML` is safe.
 * @param {HTMLElement} editorEl
 */
export function highlightHydra(editorEl) {
  const code = editorEl.textContent ?? ''
  editorEl.innerHTML = Prism.highlight(code, Prism.languages.hydra, 'hydra')
}
