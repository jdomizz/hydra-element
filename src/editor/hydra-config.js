// Adapted from sweep's packages/app/src/app/shared/hydra-prism.ts (same
// owner, AGPL-3.0-or-later). HYDRA_TOKENS is the source of truth for the
// DSL function list; PR hydra-synth#211's global.d.ts will eventually
// supersede it.

import 'prismjs'
import 'prismjs/components/prism-javascript.js'

// `prismjs` is a UMD-style package: the main entry installs `Prism` on
// `globalThis` (the language component files reference it as a global),
// and doesn't export it as an ES module. We read it back from
// `globalThis` after the side-effect import above.
const { Prism } = globalThis

/**
 * The canonical Hydra editing vocabulary — editor-format-agnostic data.
 * Everything else (grammar, wordlist) derives from this at module load.
 */
export const HYDRA_TOKENS = {
  /** The 43 DSL generator/transform/output functions. */
  functions: [
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
  ],
  /** The 30 globals (k0..k7, g0..g7, gp0..gp7, time, o0..o3, a). */
  globals: [
    'k0',
    'k1',
    'k2',
    'k3',
    'k4',
    'k5',
    'k6',
    'k7',
    'g0',
    'g1',
    'g2',
    'g3',
    'g4',
    'g5',
    'g6',
    'g7',
    'gp0',
    'gp1',
    'gp2',
    'gp3',
    'gp4',
    'gp5',
    'gp6',
    'gp7',
    'time',
    'o0',
    'o1',
    'o2',
    'o3',
    'a',
  ],
  /** Common JS keywords kept in the completion wordlist. */
  keywords: [
    'const',
    'let',
    'var',
    'function',
    'return',
    'await',
    'async',
    'if',
    'else',
    'for',
    'while',
    'true',
    'false',
    'null',
    'undefined',
    'new',
    'class',
  ],
}

// Derive the Prism grammar from HYDRA_TOKENS.
const functionRegex = new RegExp(`\\b(${HYDRA_TOKENS.functions.join('|')})\\b`)
const globalRegex = /\b(k[0-7]|g[0-7]|gp[0-7]|time|o[0-3]|a)\b/

Prism.languages.hydra = Prism.languages.extend('javascript', {
  function: functionRegex,
  global: globalRegex,
})

/** The derived Prism grammar object (Prism.languages.hydra). */
export const hydraGrammar = Prism.languages.hydra

/**
 * Highlight function for the truss-editor core: code → HTML string.
 */
export function highlightHydra(code) {
  return Prism.highlight(code, Prism.languages.hydra, 'hydra')
}

/** The derived completion wordlist (functions + globals + keywords). */
export const DEFAULT_WORDLIST = new Set([
  ...HYDRA_TOKENS.functions,
  ...HYDRA_TOKENS.globals,
  ...HYDRA_TOKENS.keywords,
])
