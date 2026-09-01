# Extensions — compatibility matrix

> Snapshot of [`hydra-synth/hydra-extensions`](https://github.com/hydra-synth/hydra-extensions) @ **2026-09-01**.
> Mirror of the catalog data in [`playground/extensions.js`](./playground/extensions.js).
> Run `node scripts/check-extensions.mjs` against a running `pnpm dev` server to refresh this matrix with canvas screenshots + console logs per entry (writes evidence to `console-output/<slug>.{png,txt}`).

The catalog is the **puzzle-piece panel from the ojack editor**, reimplemented as a custom element (`<extensions-panel>`). Click any row → the demo sketch loads into the active slot via the same `preset-change` event the existing `<preset-selector>` uses.

## How to read this

- **`works`** — the demo loaded, the canvas drew something visible, no console errors. The bridge published the keys the extension reads.
- **`works-with-notes`** — the demo loaded but has caveats (audio input, backend dependency, UI overlay outside the cell, source-of-truth drift with the bridge's published set). The note column explains.
- **`not-yet`** — the demo cannot run with the current `src/globals.js` published set. See `.opencode/specs/hydra-element/active/playground-extensions-catalog.md` §5 for the bridge survey findings.

| #   | Name                       | Category  | Compat           | Note                                                                                                                                                                                                                                       |
| --- | -------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Color manipulation         | extension | works            | metagrowing — `setFunction` registers on synth via the bridge.                                                                                                                                                                             |
| 2   | Noise generators           | extension | works-with-notes | already in playground (preset: `turb / warp / cwarp`); the panel demos it as a standalone entry.                                                                                                                                           |
| 3   | Op-art patterns            | extension | works            | metagrowing — `setFunction` registers on synth via the bridge.                                                                                                                                                                             |
| 4   | Soft patterns              | extension | works            | metagrowing — `setFunction` registers on synth via the bridge.                                                                                                                                                                             |
| 5   | Screen space operations    | extension | works            | metagrowing — `setFunction` registers on synth via the bridge.                                                                                                                                                                             |
| 6   | if then else               | extension | works            | metagrowing — `setFunction` registers on synth via the bridge.                                                                                                                                                                             |
| 7   | hydra-arithmetics          | extension | works            | geikha hyper-hydra — registers globals via `window`; bridge publishes them.                                                                                                                                                                |
| 8   | hydra-blend                | extension | works            | geikha hyper-hydra — registers globals via `window`; bridge publishes them.                                                                                                                                                                |
| 9   | hydra-fractals             | extension | works            | geikha hyper-hydra — registers globals via `window`; bridge publishes them.                                                                                                                                                                |
| 10  | hydra-gif                  | extension | works            | geikha hyper-hydra — `s0.initGif(url)` is in scope via the eval proxy.                                                                                                                                                                     |
| 11  | hydra-outputs              | extension | works            | geikha hyper-hydra — `o0.setNearest()` / `o1.setLinear()` work because outputs are in scope.                                                                                                                                               |
| 12  | hydra-text                 | extension | works            | geikha hyper-hydra — registers via `window`; the demo also calls `await loadScript(...)` for its specific bundle.                                                                                                                          |
| 13  | hydra-wrap                 | extension | works            | geikha hyper-hydra — `hydraWrap.setMirror()` works via window.                                                                                                                                                                             |
| 14  | hydrated-gradient          | extension | works            | `gradient2(...)` registers via the bridge.                                                                                                                                                                                                 |
| 15  | hydra-shaderpark           | extension | works-with-notes | Already in playground (preset: `shader park torus`); `sculptToHydraRenderer` is imported dynamically, the demo runs.                                                                                                                       |
| 16  | hydra-midi                 | extension | works-with-notes | Already in playground (preset: `midi solid`); `midi.start()` / `note()` / `cc()` work via window.                                                                                                                                          |
| 17  | hydra-strudel              | extension | works            | `await initHydraStrudel()` initializes; `P(pattern)` and `n(pattern).scale('C:major').play()` work; brings in Strudel + WebAudio.                                                                                                          |
| 18  | scrawlink QR extension     | extension | works            | UI overlay — attaches to host page. Demo `shape(...).scroll(...).blend(...).out(o0)` works.                                                                                                                                                |
| 19  | Noise Room (Audio Effects) | extension | works            | iframe overlay (`addIframe.js`); demo `a.setSmooth(...).shape(...).out(...)` works.                                                                                                                                                        |
| 20  | hydra-superdirt            | extension | works-with-notes | `rms()` returns 0 unless a SuperDirt backend is running on port 8080 sending `/rms` OSC. UI loads; visual output stays at black without backend.                                                                                           |
| 21  | Hydra-FCS                  | extension | works            | `iCardioid` / `pNephroid` / `pSpiral` register via `setFunction`; the implicit-curve source functions work.                                                                                                                                |
| 22  | hydra-vertex               | extension | not-yet          | Reads `window.hydraSynth` only — not currently published by the bridge (see catalog spec §5). The demo errors until `bridge-globals-unification.md` lands.                                                                                 |
| 23  | hydra-datamosh             | extension | not-yet          | Reads `window.hydraSynth` (fallback path) — same bridge gap as #22.                                                                                                                                                                        |
| 24  | p5.js                      | library   | works            | Auto-loaded by the ojack editor; `P5` is exposed as a global. Demo uses instance mode (`p5.rect(...)`) and `s0.init({src: p5.canvas})`.                                                                                                    |
| 25  | Tone.js                    | library   | works-with-notes | The example triggers one C4 note and exits. Subsequent `Tone.Synth().toDestination()` calls work; audio needs a user gesture to unlock in modern browsers.                                                                                 |
| 26  | Three.js                   | library   | works            | Dynamic import of `three.module.js`; the demo renders a transparent-background icosahedron into a hidden canvas and uses it as `s0.init({src: renderer.domElement})`. `update` is in `USER_PROPS` so the reserved function syncs to synth. |
| 27  | bitfolly                   | library   | works            | Library registers `window.Bitfolly`; the demo instantiates and seeds a bitfield canvas for `s0.init`.                                                                                                                                      |
| 28  | bl4st                      | library   | works            | Library registers `window.flameEngine`; the demo configures a fractal flame and renders to canvas for `s0.init`.                                                                                                                           |
| 29  | Total Serialism            | library   | works            | Library is loaded; `TS` is captured and `Object.assign(window, TS.Generative, ...)` exposes its methods as globals. Demo uses arrays as channel values.                                                                                    |

## Snapshot refresh

The catalog is a snapshot, not a live feed. To refresh from upstream:

```sh
curl -sLo /tmp/extensions.json \
  https://raw.githubusercontent.com/hydra-synth/hydra-extensions/main/extensions.json
curl -sLo /tmp/external-libraries.json \
  https://raw.githubusercontent.com/hydra-synth/hydra-extensions/main/external-libraries.json
```

Re-extract each entry's `load` URL + first example (decoded via `decodeURIComponent(atob(...))`), update the compat label from a manual run of `scripts/check-extensions.mjs`, and bump the snapshot date in this file's banner + `playground/extensions.js`.

## Caveats

- The Playwright compat pass (`scripts/check-extensions.mjs`) fetches 29 CDN scripts (metagrowing, jsDelivr, unpkg, statically.io, fentonia.com, emptyfla.sh). Some are large (shader-park-core ≈ 2.8 MB; total-serialism ≈ 2 MB). A network failure mid-run leaves the affected entry labeled by the static analysis from `playground/extensions.js` — re-run when the network is healthy.
- Some entries produce a black canvas by design (e.g. hydra-superdirt without a SuperDirt backend, Three.js without `update` driven by `mouse.x`). The matrix labels these `works-with-notes` regardless of pixel sampling.
- The `not-yet` entries (#22, #23) need a `bridge-globals-unification` fix to ship — tracked in the catalog spec §5.

## Bridge globals survey

The complete per-entry `window.*` access survey lives in
`.opencode/specs/hydra-element/active/playground-extensions-catalog.md` §5.
The two gaps identified by the static catalog analysis are hydra-vertex
and hydra-datamosh, both reading `window.hydraSynth` (not currently
published). The user-gated next step is a `bridge-globals-unification.md`
mini-spec to publish the union of names extensions read.
