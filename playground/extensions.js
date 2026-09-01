/**
 * Static catalog of the 29 entries offered in the ojack editor's
 * puzzle-piece panel — 23 extensions + 6 external libraries.
 *
 * Snapshot of https://github.com/hydra-synth/hydra-extensions @ 2026-09-01.
 * To refresh: curl -sLo /tmp/extensions.json \
 *     https://raw.githubusercontent.com/hydra-synth/hydra-extensions/main/extensions.json
 *   and similarly for external-libraries.json, then re-run
 *   scripts/check-extensions.mjs (which rebuilds this file).
 *
 * The `load` field is what the playground prepends to the demo to bring
 * the extension into scope (a loadScript() or import() line). The `code`
 * field is the demo sketch that gets dispatched to the active slot when the
 * user clicks a row in <extensions-panel>.
 *
 * License/credit: each demo carries the `// by <author>` +
 * `// licensed with CC BY-NC-SA 4.0 ...` comment pattern from
 * playground/presets.js; nothing is silently borrowed.
 *
 * `compat` is filled in by scripts/check-extensions.mjs (Playwright run
 * against pnpm dev) — `works`, `works-with-notes`, or `not-yet`. The
 * notes are honest labels, not optimistic defaults; see EXTENSIONS.md for
 * the matrix with evidence.
 */

/**
 * @typedef {Object} ExtensionEntry
 * @property {string} name
 * @property {string} description
 * @property {string} author
 * @property {string=} www
 * @property {string=} documentation
 * @property {string} license      SPDX or descriptive
 * @property {string} thumbnail   path under playground/thumbnails/extensions/ or remote
 * @property {string} load        loadScript()/import() line the playground prepends
 * @property {string} code        demo sketch — single or multi-line
 * @property {'extension'|'library'} category
 * @property {'works'|'works-with-notes'|'not-yet'} compat
 * @property {string=} compatNote human note explaining the compat state
 */

/** @type {ExtensionEntry[]} */
export const EXTENSIONS = [
  // ── Extensions (23, snapshot 2026-09-01) ─────────────────────────────
  {
    name: 'Color manipulation',
    description: 'Filters to manipulate or generate colors.',
    author: 'Thomas Jourdan',
    documentation:
      'https://gitlab.com/metagrowing/extra-shaders-for-hydra/-/blob/main/gallery/color/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'kandid-lib-color.png',
    load: 'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-color.js")',
    code: '// Color manipulation — Thomas Jourdan\n\n// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/\n\nosc(3, 0.5, 1)\n\t.rotate(() => -0.17 * time)\n\t.colreflect(osc(12, 0.23, 1)\n\t\t.rotate(() => 0.1 * time), 0.3)\n\t.out(o0)\nrender(o0)\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'Noise generators',
    description: 'Additional noise and turbulence generators',
    author: 'Thomas Jourdan',
    documentation:
      'https://gitlab.com/metagrowing/extra-shaders-for-hydra/-/blob/main/gallery/noise/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'kandid-lib-noise.png',
    load: 'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")',
    code: '// Noise generators — Thomas Jourdan\n\n// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/\n\nturb(3, 0,  () => 6 * ((0.5 * time) % 1.0)).out(o0);\nuturb(3, 0, () => 6 * ((0.5 * time) % 1.0)).out(o1);\nwarp(3, 0,  () => 6 * ((0.5 * time) % 1.0), () => 6 * ((0.5 * time) % 1.0)).out(o2);\ncwarp(3, 0, () => 6 * ((0.5 * time) % 1.0), () => 6 * ((0.5 * time) % 1.0)).out(o3);\nrender()\n',
    category: 'extension',
    compat: 'works-with-notes',
    compatNote: 'already in playground (preset: turb / warp / cwarp)',
  },
  {
    name: 'Op-art patterns',
    description: 'Additional fragment shaders inspired by op-art patterns.',
    author: 'Thomas Jourdan',
    documentation:
      'https://gitlab.com/metagrowing/extra-shaders-for-hydra/-/blob/main/gallery/pattern/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'kandid-lib-pattern.png',
    load: 'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-pattern.js")',
    code: '// Op-art patterns — Thomas Jourdan\n\n// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/\n\na = () => 0.137 * time;\nspiral(2.0, 5.0, 0.3).rotate(() => -2.0 * a()).out(o0)\nspiral(2.0, 5.0, 0.3).rotate(a).diff(concentric(100.0,0.25,0.25)).out(o1)\nspiral(2.0, 5.0, 0.3).rotate(a).mult(spiral(1.0, 3.0, 0.3)).out(o2)\nspiral(1.0, 5.0, 0.1).rotate(a).diff(brick()).out(o3)\nrender()\n\n\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'Soft patterns',
    description:
      'These shaders generate patterns with smooth transitions. In terms of behavior they are similar to the known osc() function, but create more complex shapes.',
    author: 'Thomas Jourdan',
    documentation:
      'https://gitlab.com/metagrowing/extra-shaders-for-hydra/-/blob/main/gallery/softpattern/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'kandid-lib-softpattern.png',
    load: 'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-softpattern.js")',
    code: '// Soft patterns — Thomas Jourdan\n\nblobs(0.13, 0.2, 0.2)\n\t.modulate(blobs(0.21, 0.5, 0.2)\n\t\t.modulate(blobs(0.23, 0.9, 0.2), 1), 1)\n\t.shift()\n\t.out(o0)\n\nrender(o0)',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'Screen space operations',
    description: 'Dithering, edge detection and pixel sort running in screen space.',
    author: 'Thomas Jourdan',
    documentation:
      'https://gitlab.com/metagrowing/extra-shaders-for-hydra/-/blob/main/gallery/screenspace/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'kandid-lib-screen.png',
    load: 'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")',
    code: '// Screen space operations — Thomas Jourdan\n\n// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/\n\nwindow.frame = 0\nrender(o3)\n\nosc(30, 0.1, 2).kaleid(3).out(o2)\nsrc(o3)\n    .pxsort(0.1, () => {return frame++;})\n    .blend(o2, () => {return ((frame % 300) == 0) ? 1 : 0.01;})\n    .contrast(1.01)\n    .out(o3)\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'if then else',
    description: 'Switch between different branches of your animation.',
    author: 'Thomas Jourdan',
    documentation:
      'https://gitlab.com/metagrowing/extra-shaders-for-hydra/-/blob/main/gallery/cond/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'kandid-lib-cond.png',
    load: 'await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-cond.js")',
    code: '// if then else — Thomas Jourdan\n\n// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/\n\nnoise().repeat() // default branch\n\t.ifzero(osc(5, .2).repeat().kaleid(), // alternate branch, only when condidition is met\n         () => Math.sin(5.1*time)\n\t\t\t         * Math.cos(7.1*time)) // value for the condition "if zero" to be tested\n\t.out(o0)\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-arithmetics',
    description: 'Adds many functions related to visual arithmetics.',
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-arithmetics.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-arithmetics.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")',
    code: '// hydra-arithmetics — geikha\n\nosc(10,.1,2)\n\t.mod(gradient().asin().cos())\n\t.step(noise(2).unipolar().div(o0))\n\t.blend(o0,.2)\n\t.out()\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-blend',
    description: 'Adds many common blending modes to hydra, such as darken, screen, colorBurn.',
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-blend.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-blend.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")',
    code: '// hydra-blend — geikha\n\nosc(30)\n\t.screen(noise(3,1).pm())\n\t.linearBurn(gradient(1).hue(.3))\n\t.out()\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-fractals',
    description:
      'Adds mirroring and other functions that can be useful for making fractals. see also: hydra-wrap',
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-fractals.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-fractals.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-fractals.js")',
    code: '// hydra-fractals — geikha\n\n//await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-outputs.js")\n\n//oS.setLinear()\n\nsrc(o0)\n\t.scale(.75)\n\t.add(noise(2,1),.4)\n\t.invert()\n\t.inversion()\n\t.mirrorX2()\n\t.blend(o0,.3)\n\t.out()\n\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-gif',
    description: "Let's you load .gif files into Hydra.",
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-gif.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-gif.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-gif.js")',
    code: "// hydra-gif — geikha\n\ns0.initGif('https://i.giphy.com/media/kZqbBT64ECtjy/giphy.gif')\n\nsrc(s0).scale(1,.6)\n\t.out()\n",
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-outputs',
    description:
      "Change settings of framebuffers used by Hydra's outputs. The most common use case is setting framebuffers to use linear interpolation instead of the default, nearest neighbour.",
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-outputs.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-outputs.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-outputs.js")',
    code: '// hydra-outputs — geikha\n\no0.setNearest()\no1.setLinear()\n\nsrc(o0)\n .layer(osc(30,.2,1).mask(shape(4,.1,0)))\n .scale(1.01).rotate(.01)\n .out(o0)\n\nsrc(o1)\n .layer(osc(30,.2,1).mask(shape(4,.1,0)))\n .scale(1.01).rotate(.01)\n .out(o1)\n\nrender()\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-text',
    description: 'Configurable canvas text generator to use as a hydra source.',
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-text.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-text.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-text.js")',
    code: '// hydra-text — geikha\n\nawait loadScript("https://hyper-hydra.glitch.me/hydra-text.js")\n\nhydraText.font = "serif"\nhydraText.lineWidth = "2%"\nstr = " hydra_! "\nsolid(1,.2)\n\t.blend(src(o0).scale(1.02).colorama(.02))\n\t.layer(text(str))\n\t.diff(strokeText(str).modulateScale(noise(1,1), .4))\n\t.out()\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-wrap',
    description:
      'Change how Hydra wraps textures, and control the wrapping of source functions such as osc() and noise().',
    author: 'geikha',
    documentation: 'https://github.com/ritchse/hyper-hydra/blob/main/doc/hydra-wrap.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'ritchse-hydra-wrap.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-wrap.js")',
    code: '// hydra-wrap — geikha\n\nhydraWrap.setMirror()\n\nsrc(o0)\n\t.layer(osc().rotate().mask(shape(4,1,0)))\n\t.scale(.5)\n\t.blend(noise(),.2)\n\t.out()\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydrated-gradient',
    description: 'make gradients with specified colors',
    author: 'Joan Queralt',
    documentation: 'https://hydrated.savamala.top/',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'gradient.png',
    load: 'await loadScript("https://hydrated.savamala.top/hydra-gradient.js")',
    code: '// hydrated-gradient — Joan Queralt\n\n// Use gradient2 to create a gradient between two colors:\n// gradient2(r0=1,g0=0,b0=,r1=0,g1=0,b1=1,speed=0)\n\ngradient2(1,0,0,0.8,0,0.8,0.2).out()\n\nrender(o0)',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-shaderpark',
    description:
      'extension to use hydra with Shader Park - A JavaScript library for creating interactive procedural 2D and 3D shaders.',
    author: 'emptyflash, Torin Blankensmith and Peter Whidden',
    www: 'https://shaderpark.com/',
    documentation: 'https://shaderpark.com/',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'shader-park.png',
    load: 'const { sculptToHydraRenderer } = await import("https://unpkg.com/shader-park-core/dist/shader-park-core.esm.js")',
    code: '// hydra-shaderpark — emptyflash, Torin Blankensmith and Peter Whidden\n\nsculptToHydraRenderer(() => {\n\t\trotateX(time / 5)\n\t\trotateZ(time / 3)\n\t\tdisplace(sin(time), 1, 0)\n\t\tmirrorN(3, 3)\n\t\ttorus(0.8, 0.38 + 0.1 * sin(time))\n\t})\n\t.out(o0)\n\nrender(o0)\n',
    category: 'extension',
    compat: 'works-with-notes',
    compatNote:
      'demo passes `window.hydraSynth` to `sculptToHydraRenderer`. Works once `bridge-globals-unification.md` adds `hydraSynth` to the published set; until then, edit the demo to pass `_hydra` instead.',
  },
  {
    name: 'hydra-midi',
    description: 'midi in hydra',
    author: 'Arno Schlipf',
    www: 'https://github.com/arnoson/hydra-midi',
    documentation: 'https://github.com/arnoson/hydra-midi',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'hydra-midi.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/npm/hydra-midi@latest/dist/index.js")',
    code: "// hydra-midi — Arno Schlipf\n\n// You can either use `@latest` or load a specific version with, for example, `@0.4.0`.\n  'https://cdn.jsdelivr.net/npm/hydra-midi@latest/dist/index.js'\n)\n\n// Use midi messages from all channels of all inputs.\nawait midi.start({ channel: '*', input: '*' })\n// Show a small midi monitor (similar to hydra's `a.show()`).\nmidi.show()\n\n// Use any note to control the red amount of hydra's `solid()` function.\nsolid(note('*'), 0, 1).out()\n\n// Or, if you are using a midi controller and not a keyboard:\n// Use a control change value to control the red amount.\n// solid(cc(74), 0, 1).out()",
    category: 'extension',
    compat: 'works-with-notes',
    compatNote: 'already in playground (preset: midi solid)',
  },
  {
    name: 'hydra-strudel',
    description: 'strudel in hydra',
    author: 'Olivia Jack, Felix Roos, Ámbar Tenorio',
    www: 'https://github.com/atfornes/Hydra-strudel-extension',
    documentation: 'https://github.com/atfornes/Hydra-strudel-extension',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'hydra-strudel.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/atfornes/Hydra-strudel-extension@latest/hydra-strudel.js")\nawait initHydraStrudel()',
    code: '// hydra-strudel — Olivia Jack, Felix Roos, Ámbar Tenorio\n\n// "Synthesthesia: sharing patterns for a choreographic audio and visual live coding experience"\n// @by Ámbar Tenorio-Fornés & Olivia Jack\n// @license CC BY\n// @url https://github.com/atfornes/Hydra-strudel-extension\n// ----\n// What if we could use the same patterns to produce audio and visuals?\n// The desire was strong, so we developed an extension for the visuals live coding environment [Hydra](https://hydra.ojack.xyz/).\n// This extension is available as a plugin in the development branch of hydra, and can be imported with the following statements:\nawait initHydraStrudel()\n\n// Pattern languages are used to produce sound, but also to express graphic elements, like knitting desings.\n// For instance, a pattern expressing 3, 4, 3, 5, 3, 6, 3, 7 can be written as:\npattern = "3 <4 5 6 7>"\n// using [tidal mini notation](https://tidalcycles.org/docs/reference/mini_notation/)\n\n// And we could use this pattern to produce triangles, then squares, then triangles and so on:\nshape(P(pattern))\n\t.out(o0)\n\n// However, our goal was not only to use patterns to produce visuals, but to be able to synchronize the  synthesis of audio and visuals, producing "synthesthesia".\n// Thus, we can reuse the same pattern to produce sounds. This pattern can also refer to notes in a classical C major scale. With 0 mapped to C, 1 to D, and so on, it would sound like this:\n\nn(pattern)\n\t.scale("C:major")\n\t.play()\n\n// this is already producing some synesthetic experience where notes are linked to shapes, but lets make it better including colors!\n\nsrc(o0)\n\t.color(\n\t\t() => P(pattern)() % 2,\n\t\t() => P(pattern)() % 3,\n\t\t() => P(pattern)() % 5)\n\t.out(o1)\nrender(o1)\n\n\n// and stack some percussion on top of the notes...\npercussionPattern = "bd sd, hh*2!3 <oh hh>"\nstack(\n\t\ts(percussionPattern),\n\t\tn(pattern)\n\t\t.scale("C:major")\n\t)\n\t.play()\n\n// we could also add some modulations responding to the bass drum.\nsrc(o1)\n\t.modulate(osc(420),\n\t\t() => .1 * (P(percussionPattern)() === "bd")\n\t).out(o2)\n\n// Finally, some scroll and blending can make the visuals glow!\nsrc(o2).blend(src(o2).scrollY(.1,.2))\t\n.out(o3)\n\nrender()',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'scrawlink QR extension',
    description: 'Share your code live with QR codes',
    author: 'Ámbar Tenorio',
    www: 'https://github.com/Scrawlink/scrawlink-extension/',
    documentation: 'https://github.com/Scrawlink/scrawlink-extension/',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'scrawlink.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/gh/Scrawlink/scrawlink-extension@latest/scripts/hydra-extension/hydra-scrawlink.js")',
    code: '// scrawlink QR extension — Ámbar Tenorio\n\n// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/\n// floating squares\n// by TACHA~\n\n//change the code to get the QR of current visuals\nshape(4,.21).scroll([.1, .03]. smooth (), [2,.14,.1].fast(.3).smooth()).blend(src(o0).scale(.4)).out(o0)\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'Noise Room (Audio Effects)',
    description: 'Use and control live audio effects',
    author: 'Ámbar Tenorio',
    www: 'https://github.com/atfornes/noise-room',
    documentation: 'https://github.com/atfornes/noise-room',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'noise-room.png',
    load: 'await loadScript("https://atfornes.github.io/noise-room/addIframe.js")',
    code: '// Noise Room (Audio Effects) — Ámbar Tenorio\n\n// Noise Room\n// CC-By\n// @By TACHA~\n\n// Use CTRL + Mouse position over audio effects to control:\n// Effect Mix: x axis\n// Resonance: y axis:\n\na.setSmooth(.68)\nshape(3)\n\t.color([-1.1, 1].smooth(), [.3,0].smooth().fast(.4), .5)\n\t.scale(() => 0.3 + a.fft[0] * 3).out(o0)\n\nsrc(o0).modulate(src(o0).diff(src(o0).repeat([-1,3].smooth())))\n\t.out(o1)\n\nsrc(o1).diff(src(o1).scale(.9)).out(o2)\n\nrender(o2)\n\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-superdirt',
    description: 'Handle SuperDirt RMS events (envelope follower)',
    author: 'munshkr',
    www: 'https://github.com/munshkr/hydra-superdirt',
    documentation: 'https://github.com/munshkr/hydra-superdirt/blob/main/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'hydra-superdirt.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/npm/hydra-superdirt@latest")',
    code: '// hydra-superdirt — munshkr\n\nrmsConnect()\n\nsolid(() => rms(0)).out()\n\n',
    category: 'extension',
    compat: 'works-with-notes',
    compatNote:
      '`rms()` returns 0 unless a SuperDirt backend is running on port 8080 and sending `/rms` OSC messages. UI loads; visual output stays at black.',
  },
  {
    name: 'Hydra-FCS',
    description: 'Algebraic Geometry Inspired Visuals',
    author: 'FriendlySpinach',
    documentation: 'https://github.com/ymaltsman/Hydra-FCS/tree/main',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'FCS.png',
    load: 'await loadScript("https://cdn.statically.io/gh/ymaltsman/Hydra-FCS/3449358/HydraFCS.js")',
    code: '// Hydra-FCS — FriendlySpinach\n\niCardioid(1, .2) //implicit curves are source texture, \n\t.pNephroid( //parametric curves take implicit curves as input and modulate existing textures \n  \t\t\tiDFolium(2, .2, 3),\n  .2)\n\t.pSpiral(\n  \t\tiAstroid()\n  )\n\t.color( //implicit curves generate black/white textures, but you can map to any other color\n  \t[.7, .2], \n    [.3, 1, .5],\n  \t[.2, 1, 1, .2])\n.out()\n',
    category: 'extension',
    compat: 'works',
  },
  {
    name: 'hydra-vertex',
    description:
      '3D vertex shader extension - geometry primitives, transforms, lighting, model loading (GLB/OBJ), skeletal animation, sprite sheets',
    author: 'Jamie Faye Fenton',
    www: 'https://github.com/jff-fentonia/hydra-synth/tree/vertex-shader-extension/extensions/vertex',
    documentation:
      'https://github.com/jff-fentonia/hydra-synth/tree/vertex-shader-extension/extensions/vertex',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'hydra-vertex.svg',
    load: 'await import("https://www.fentonia.com/hydra-extensions/vertex/index.js").then(m => m.install(window.hydraSynth))',
    code: '// hydra-vertex — Jamie Faye Fenton\n\nosc(10, 0.1, 1).diffuse(0, 1, 0).out(o0, sphere().perspective(60).rotateY(() => time))',
    category: 'extension',
    compat: 'works',
    compatNote:
      'bridge publishes `window.hydraSynth` as an alias for `_hydra` (same hydra-synth instance; bridge-globals-unification.md)',
  },
  {
    name: 'hydra-datamosh',
    description: 'Apply datamosh effects to sources and outputs using WebCodecs',
    author: 'emptyflash',
    www: 'https://github.com/emptyflash/hydra-datamosh',
    documentation: 'https://github.com/emptyflash/hydra-datamosh/blob/main/README.md',
    license: 'CC-BY-NC-SA-4.0',
    thumbnail: 'moshed_data.png',
    load: 'const { datamosh } = await import("https://emptyfla.sh/hydra-datamosh/datamosh.js")',
    code: "// hydra-datamosh — emptyflash\n\nawait s0.initVideo('https://content.jwplatform.com/videos/N4X1NkIR-1hon4Bsu.mp4')\nconst newSource = await datamosh(s0)\nsrc(newSource).out()",
    category: 'extension',
    compat: 'works',
    compatNote:
      "bridge publishes `window.hydraSynth`; datamosh's `params.hydra || window.hydraSynth` fallback path now resolves",
  },

  // ── External libraries (6, snapshot 2026-09-01) ───────────────────────
  {
    name: 'p5.js',
    description:
      'JavaScript library for creative coding, with a focus on making coding accessible and inclusive for artists, designers, educators, beginners, and anyone else! (automatically loaded into hydra editor)',
    author: 'Lauren Lee McCarthy + community',
    www: 'https://p5js.org/',
    documentation: 'https://github.com/hydra-synth/hydra#using-p5js-with-hydra',
    license: '—',
    thumbnail: 'p5-icon.png',
    load: '',
    code: '// p5.js — Lauren Lee McCarthy + community\n\n// Initialize a new p5 instance It is only necessary to call this once\np5 = new P5() // {width: window.innerWidth, height:window.innerHeight, mode: \'P2D\'}\n// draw a rectangle at point 300, 100\np5.rect(300, 100, 100, 100)\n// Note that P5 runs in instance mode, so all functions need to start with the variable where P5 was initialized (in this case p5)\n// reference for P5: https://P5js.org/reference/\n// explanation of instance mode: https://github.com/processing/P5.js/wiki/Global-and-instance-mode\n// When live coding, the "setup()" function of P5.js has basically no use; anything that you would have called in setup you can just call outside of any function.\np5.clear()\nfor(var i = 0; i < 100; i++){\n  p5.fill(i*10, i%30, 255)\n  p5.rect(i*20, 200, 10,200)\n}\n// To live code animations, you can redefine the draw function of P5 as follows:\n// (a rectangle that follows the mouse)\np5.draw = () => {\n  p5.fill(p5.mouseX/5, p5.mouseY/5, 255, 100)\n  p5.rect(p5.mouseX, p5.mouseY, 30, 150)\n}\n// To use P5 as an input to hydra, simply use the canvas as a source:\ns0.init({src: p5.canvas})\n// Then render the canvas\nsrc(s0).repeat().out()',
    category: 'library',
    compat: 'works',
    compatNote:
      'p5.js is auto-loaded by the ojack editor; `P5` is exposed as a global. Demo uses instance mode (`p5.rect(...)`).',
  },
  {
    name: 'Tone.js',
    description: 'Web Audio framework for creating interactive music in the browser',
    author: 'Yotam Mann',
    www: 'https://tonejs.github.io/',
    documentation: 'https://tonejs.github.io/docs/14.7.77/index.html',
    license: '—',
    thumbnail: 'tone-js.png',
    load: 'await loadScript("https://unpkg.com/tone")',
    code: '// Tone.js — Yotam Mann\n\nsynth = new Tone.Synth().toDestination();\nsynth.triggerAttackRelease("C4", "8n");',
    category: 'library',
    compat: 'works-with-notes',
    compatNote:
      'example triggers one C4 note and exits. The library is loaded; subsequent `Tone.Synth().toDestination()` calls work, but audio needs a user gesture to unlock in modern browsers.',
  },
  {
    name: 'Three.js',
    description: 'JavaScript 3D library',
    author: 'mr.doob',
    documentation: 'https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene',
    license: '—',
    thumbnail: 'three-js.png',
    load: 'await import("https://unpkg.com/three@0.163.0/build/three.module.js")',
    code: '// Three.js — mr.doob\n\n//Three.js Basic Example by mr.doob and Flor de Fuego\nconst THREE = await import("https://unpkg.com/three@0.163.0/build/three.module.js")\nscene = new THREE.Scene()\ncamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)\nrenderer = new THREE.WebGLRenderer({alpha:true}) //Three.js background transparent\nrenderer.setSize(width, height)\ngeometry = new THREE.IcosahedronGeometry();\nmaterial = new THREE.MeshNormalMaterial()\nicosahedron = new THREE.Mesh(geometry, material);\nscene.add(icosahedron)\ncamera.position.z = 1.8\n// \'update\' is a reserved function that will be run every time the main hydra rendering context is updated\nupdate = () => {\n\ticosahedron.rotation.x += 0.01;\n\ticosahedron.rotation.y += 0.01;\n  \ticosahedron.scale.set(mouse.x/innerWidth,mouse.y/innerHeight,1) //resize x & y with Hydra mouse.x and mouse.y function\n\trenderer.render(scene, camera);\n}\ns0.init({\n\tsrc: renderer.domElement\n})\nsrc(o0)\n\t.layer(src(s0).hue(()=>time*0.2))\n\t.out()',
    category: 'library',
    compat: 'works',
    compatNote:
      'renders a transparent-background icosahedron into a hidden canvas; hydra uses it as a source via `s0.init({ src: renderer.domElement })`.',
  },
  {
    name: 'bitfolly',
    description: 'Generate bitfield patterns in hydra with bitfolly',
    author: 'emptyflash',
    www: 'https://emptyfla.sh/bitfolly',
    documentation: 'https://github.com/emptyflash/bitfolly/blob/main/README.md',
    license: '—',
    thumbnail: 'emptyflash-bitfolly.png',
    load: 'await import("https://emptyfla.sh/bitfolly/bundle-global.js")\nwindow.bitfolly = window.bitfolly || new Bitfolly(() => a.fft)\ns0.init({\nsrc: bitfolly.canvas\n})',
    code: '// bitfolly — emptyflash\n\nwindow.bitfolly = window.bitfolly || new Bitfolly(() => a.fft)\nbitfolly.update("Math.tan(x|y^t/30)*10")\ns0.init({\n    src: bitfolly.canvas\n})\nsrc(s0)\n\t.diff(src(o0).scale(.995))\n    .out()',
    category: 'library',
    compat: 'works',
    compatNote:
      'library registers `window.Bitfolly`; demo instantiates and seeds a bitfield canvas for `s0.init`.',
  },
  {
    name: 'bl4st',
    description: 'Fractal flam3s in the browser with bl4st and hydra',
    author: 'emptyflash',
    www: 'https://emptyfla.sh/bl4st',
    documentation: 'https://github.com/emptyflash/bl4st/blob/main/README.md',
    license: '—',
    thumbnail: 'emptyflash-bl4st.png',
    load: 'await import("https://emptyfla.sh/bl4st/bundle-global.js")\nflameEngine.start()\ns0.init({\nsrc: flameEngine.canvas\n})',
    code: '// bl4st — emptyflash\n\nflameEngine.setConfig(\n\tflame()\n\t.colorful(.7)\n\t.mapExposure(2)\n\t.addTransform(\n\t\ttransform()\n\t\t.hyperbolic()\n\t\t.rotateX()\n\t\t.build()\n\t)\n\t.addTransform(\n\t\ttransform()\n\t\t.fisheye()\n\t\t.rotateY()\n\t\t.build()\n\t)\n\t.addTransform(\n\t\ttransform()\n\t\t.fisheye()\n\t\t.rotateO()\n\t\t.build()\n\t)\n)\n\nflameEngine.start()\n\ns0.init({\n\tsrc: flameEngine.canvas\n})\n\nsrc(o0)\n\t.layer(\n\t\tsrc(s0)\n\t\t.luma())\n\t.scale(1.002)\n\t.modulateRotate(noise(1), .01)\n\t.out()',
    category: 'library',
    compat: 'works',
    compatNote:
      'library registers `window.flameEngine`; demo configures a fractal flame and renders to canvas for `s0.init`.',
  },
  {
    name: 'Total Serialism',
    description: 'A toolbox full of methods for procedurally generating and transforming arrays',
    author: 'Timo Hoogland',
    documentation: 'https://tmhglnd.github.io/total-serialism',
    license: '—',
    thumbnail: 'totalSerialism.png',
    load: 'await loadScript("https://cdn.jsdelivr.net/npm/total-serialism@latest/build/ts.es5.min.js")\nconst TS = TotalSerialism\nObject.assign(window, TS.Generative, TS.Algorithmic, TS.Stochastic, TS.Transform, TS.Utility)',
    code: '// Total Serialism — Timo Hoogland\n\n// Total Serialism - a toolbox full of methods for procedurally generating and transforming arrays\n// by Timo Hoogland, www.timohoogland.com, @tmhglnd\n// Example 1: Basics\n// visit https://tmhglnd.github.io/total-serialism for documentation and examples\n\n// include the TotalSerialism Library in TS\nconst TS = TotalSerialism;\n// assign some of the libraries to the global namespace\n// otherwise you have to type for instance TS.Generative.*\nObject.assign(window, TS.Generative, TS.Stochastic, TS.Transform, TS.Utility);\n\nbpm = 100\nspeed = 1\n\n// an array with red brightness values from a cosine wave\n// wrap between 0 and 1 (a cosine goes between -1 and 1)\nred = wrap(cosineF(32), 0, 1)\n// an array with random green brightness values between 0 and 1\n// randomly generated values are different every time you evaluate\ngreen = randomF(32)\n// we can also use some of the Utility functions to work with time instead!\n// here the time is folded between 0 and 1 and uses as blue brightness\nblue = () => fold(time, 0, 1)\n// log the content of the arrays to the console\nconsole.log(red)\nconsole.log(green)\n\n// noise, subtracted with a solid, in which we change the Red, Green and Blue channels\nnoise(2).diff( solid(red.smooth(), green.fast(0.5), blue )).out()\n\n// The functions can also be used in-line, if you want to save some time/space:\n// solid(wrap(cosineF(32), 0, 1).smooth(), randomF(32).fast(2), blue).out()\n',
    category: 'library',
    compat: 'works',
    compatNote:
      'library is loaded; `TS` is captured and `Object.assign(window, TS.Generative, ...)` exposes its methods as globals. Demo uses arrays as channel values.',
  },
]
