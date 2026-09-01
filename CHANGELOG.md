# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-08-31

### Added

- **`<hydra-editor>` public element via `hydra-element/editor` subpath.** CodeJar + Prism with a Hydra-extended JS grammar (44 DSL functions + globals + JS keywords in the wordlist, mirror of `hydra-synth/global.d.ts` names from PR #211) and wordlist completion (Tab/Enter accepts, Esc dismisses, prefix-filtered dropdown). API: `value` (silent setter), `placeholder`, `addWords(words)` (idempotent), `destroy()`, `code-apply` event (Ctrl/Cmd+Enter) with `{ code }`. A11y: `role="textbox"`, `aria-multiline="true"`, `aria-label` (consumer-supplied or default). Styling: `::part(editor)`, `::part(token-function)`, `::part(token-global)`, `::part(completion)`, `::part(completion-item)`. The element is registered via side-effect import (`import 'hydra-element/editor'`); `codejar` and `prismjs` are bundled as devDependencies into the editor entry only, so the main entry keeps `hydra-synth` as the sole runtime dep. Hand-written TypeScript declarations (`dist/hydra-editor.d.ts`) following the `src/hydra-element.d.ts` pattern. Bundle budget: ~25 KB gzip. Grammar adapted from sweep's `hydra-prism.ts` (same owner, AGPL-3.0-or-later; attribution comment in `src/editor/hydra-grammar.js`).
- **Playground adopts `<hydra-editor>`** in `<editor-panel>` (`playground/components/editor-panel.js`). The textarea is replaced by the public element; every existing behavior is preserved (per-slot `localStorage` Map, `target-change` rebind, `preset-change` routing, storage fallback seeding from `target.code`, Cmd/Ctrl+Enter eval, eval button). The panel listens for the element's `code-apply` event and pushes the code to `target.code`. After every successful eval, the panel diffs `Object.keys(target.synth.synth)` against a baseline wordlist of 96 entries and calls `editor.addWords(newNames)` so the completion dropdown grows as extensions load — the autocompletado crece con las extensiones que cargas (the killer demo detail tying the element spec to the extensions catalog).
- **New tests:** `src/editor/hydra-grammar.spec.js` (token spans: DSL verbs → `token function`, globals → `token global`, keywords → `token keyword`), `src/editor/completion.spec.js` (96-entry wordlist contents, `addWords` array + space-string + idempotency, prefix filter, Tab accept, Esc dismiss, ArrowUp/ArrowDown navigation), `src/editor/editor.spec.js` (element registration, a11y attributes, value round-trip, silent setter, Ctrl+Enter + Cmd+Enter dispatch, placeholder reflection, `addWords`, `destroy()` idempotency, post-destroy `value` set no-throw, `input` event bubbles+composed), `playground/editor-panel-extensions.spec.js` (extension-aware `addWords` demo: baseline 96 entries, after-eval growth, idempotent dedup, target.code wiring on `code-apply`, fallback `target.synth` missing no-throw).
- **Build:** third lib entry `editor: 'src/editor/index.js'` in `vite.config.js`; `postbuild` now asserts `dist/hydra-editor.d.ts` exists; new `codejar ^4.3.0` and `prismjs ^1.29.0` devDeps bundled into the editor entry only.

### Changed

- `package.json` `sideEffects` gains `./dist/hydra-editor.js` (the element-registration side effect). Exports map gains `./editor` → `dist/hydra-editor.{d.ts,js}`. The subpath `./editor` is published alongside the existing `./eval` subpath; consumers who don't import the editor pay zero bundle cost.
- `playground/vite.playground.config.js` adds a dev-only Vite alias `hydra-element/editor` → `src/editor/index.js` so `pnpm dev` resolves the element from source (no pre-build of the lib entry needed). The published subpath used by external consumers is unaffected.
- Playground README section notes the new editor + the extensions-aware completion behavior.
- "What's where" pointers in the README move the API reference to include the new `hydra-element/editor` subpath section.

### Changed

- Playground unified: `playground/index.html` now renders four isolated `<hydra-element id="g-0..g-3">` in a 2×2 grid by default. A new `<target-picker>` dropdown selects which cell the editor / cfg-form / stats / log reflect — one editor, four sketches. The per-slot state (time / bpm / sources / outputs / audio / loop) stays independent because non-global mode is the technical truth; only the **UI** is focused. `gallery.html` (and its `gallery.js` / `css/gallery.css` / `<gallery-log>`) is retired: the standalone gallery view is replaced by an inline 2×2 in the playground. `gallery.html` itself is preserved as a 4-line `<meta http-equiv="refresh">` redirect to `./`, so the public URL `https://jdomizz.github.io/hydra-element/playground/gallery.html` (still cited in `backlog/launch-week-comms.md` and the v0.7.0 README history) doesn't 404 for external links. The redirect is rendered alongside the index by `vite.playground.config.js` (kept as a Rollup input) and lands at `dist-site/playground/gallery.html` on GH Pages.
- `<editor-panel>` now persists per slot (`localStorage` keys `hydra-element:editor:0..3`, four keys instead of one). The share button and "open in ojack" link are removed — the playground no longer tries to mirror `?code=` sketches outside this page. A document-level `target-change` listener rebinds the textarea + storage key when the user picks a different slot.
- `<multi-log>` now follows the selected cell via `target-change` (single-target subscription, like `<editor-panel>`, `<cfg-form>`, and `<stats-strip>`). Previously it auto-discovered all four cells via `closest('[data-log-cells]')` and subscribed to all four unconditionally — but `data-log-cells` lived on `.app__center` while `<multi-log>` lives on `.app__right`, so `closest()` walked up to `<main>` and found nothing: the log subscribed to zero cells and reflected nothing. The fix subscribes to the active target only and rebinds on every `target-change`. The header text is still "Log" (the multi-instance-ness is obvious from the page).
- Playground cells now load with default sketches (via `<hydra-element>` `textContent`) so all four canvases are populated and functional on first paint. Each cell demos a different attribute combination:
  - `#0`: Zach Krall's `osc + kaleid` — default attributes (sources=4, outputs=4)
  - `#1`: programmatic 2-source `init(() => [...])` blend — sources=2 (no camera permission)
  - `#2`: 6-source composite — `sources="6"`, programmatic `init()` with time-varying colors
  - `#3`: `turb`/`uturb`/`warp`/`cwarp` + audio-reactive overlay — `outputs="6"` `audio="true"` (mic input)
- `<editor-panel>` now falls back to `target.code` when `localStorage` has no entry for the active slot (typical on first visit). Previously the editor showed an empty textarea even when the element had code from `textContent`; the hydrate ran before the orchestrator bound the target, so the fallback saw no target. Now `main.js` re-primes the editor with `first.code` right after binding the target, and `<editor-panel>`'s own `hydrateFromStorage` falls back to `target.code` whenever `localStorage` is empty (covering slot switches too). Persists the fallback to `localStorage` so subsequent visits read it directly.
- `<cfg-form>` removed the "publish on window.\_hydra (disabled: multiple instances)" hint text below the form (visual noise). The `title` attribute on the disabled row still explains why the toggle is locked; the form's purpose (and the four checkboxes' semantics) is now self-evident from the labels.
- Preset list curated: removed `osc`, `noise` (single-line, no demo value), `typo (error)`, `reset` (utility, no demo), `osc + arithmetics`, `osc + blend modes` (niche). Added three playground presets: `2-source blend` (programmatic, no permissions), `6-source composite` (sources=6 demo), `6-output audio-reactive` (extra-shaders-for-hydra + a.fft[] + outputs=6 demo). All preset descriptions now follow the format `extension — author — what it demonstrates` (per user feedback). `custom GLSL` is kept (regression-tested by `playground/presets.spec.js`) and now sits at the end of the list.
- `<preset-selector>` now includes `slot` (0..3) in `preset-change` event detail, so the editor can route the preset's code to the right cell — preset selection on slot 2 doesn't overwrite slot 0's sketch.
- `<cfg-form>` re-binds its target when `target-change` fires (the global-disabled-when-multiple guard stays; with 4 elements the toggle is locked off by design).
- `<stats-strip>` re-binds to the active slot on `target-change`.
- `<multi-log>` (renamed from `<gallery-log>`; header text changed from "Multi-instance log" to "Log" since the multi-instance-ness is now obvious from the page) auto-discovers its targets from a `[data-log-cells]` ancestor — `playground/main.js` no longer needs to wire the log explicitly. The old `<log-panel>` (single-target) is deleted; the unified playground doesn't need it.
- `playground/main.js` now resolves all 4 `<hydra-element>` (no longer the first one only), wires click-to-select on each `.cell` (`setActive(i)` toggles `.is-active` + dispatches `target-change`), hydrates `?code0..3=` per slot (with the legacy bare-`?code=` mirrored to all 4 when no per-slot payload is present), persists URL payloads back to `localStorage`, and fires `setActive(0)` so every document-level listener lands on slot 0 by default. `decodeUrlCodes` / `encodeForUrl` / `decodeB64Url` / `NUM_SLOTS` / `STORAGE_KEY_PREFIX` are exported for direct unit testing (see the new `playground/playground-multi.spec.js`).
- `playground/css/layout.css` now styles the 2×2 cell grid in `.app__center` (moved out of the deleted `playground/css/gallery.css`). The `.cell` / `figcaption` / `aspect-ratio` rules are colocated with the rest of the layout for mobile responsiveness (cascades to a single column under 720px).
- `custom GLSL` preset is now portable: it inlines its own `setFunction({name: 'noixe', ...})` call before `noixe(5, 0.5).out()`, so the same `?code=` URL round-trips cleanly between this playground and hydra.ojack.xyz (where `noixe` was previously undefined). The hidden `el.ready.then(({ synth }) => synth.setFunction(...))` bootstrap in `playground/main.js` is removed — the lib was designed for bare `setFunction` inside code (Pattern 6 in `src/extensions.spec.js`); the bootstrap was a shortcut that bypassed the intended mechanism. A new `playground/presets.spec.js` regression test pins the architecture: it asserts `el.synth.noixe` is undefined on a fresh `<hydra-element>` and becomes a function after assigning the preset's code.
- `wtr.config.js` glob extended to pick up `playground/**/*.spec.js` alongside `src/**/*.spec.js`. Tests under `playground/` use the same `@open-wc/testing` + chai setup as `src/`.
- `<editor-panel>`'s shadow DOM now carries its own `.btn` / `.btn--primary` styles (the global `.btn` rules in `playground/css/components.css` do not cross shadow boundaries; without inlining them, the eval button was browser-default-styled).
- Package manager switched from npm to pnpm (`packageManager: "pnpm@11.9.0"`). `package-lock.json` is replaced by `pnpm-lock.yaml`; CI uses `pnpm install --frozen-lockfile`; `CONTRIBUTING.md` / `AGENTS.md` document `pnpm …` commands. Strict resolution (no phantom dependencies) catches "works on my machine but not for consumers" bugs before release. Build-script allow-list lives in `pnpm-workspace.yaml` (`allowBuilds: esbuild, playwright`) since pnpm 11 retired `pnpm.onlyBuiltDependencies`. `oxlint` and `oxfmt` are pinned as direct devDependencies — pnpm strict does not hoist them from `oxc-standard`, so the `lint` script and pre-commit hook would otherwise fail with `oxlint: not found`.
- `dist-site/` (the playground static build output) is git-ignored; CI's deploy workflow builds it from source and uploads the artifact directly.
- Playground HTML entry points moved from the repo root into `playground/` (`index.html` → `playground/index.html`, `gallery.html` → `playground/gallery.html`); the playground build's Vite `base` is now derived from `package.json#repository.url` instead of being hardcoded, so a fork with a different GitHub repo name resolves its assets correctly without edits. `pnpm dev` and `pnpm dev:playground` both use `vite.playground.config.js` (the lib config stays untouched so WTR's Vite plugin keeps finding `src/*.spec.js`). Dev mode serves at `/` (the usual `localhost:5173/`); build mode keeps `/hydra-element/` as the base for GitHub Pages.
- Dev server actually serves the playground now. `vite.playground.config.js` adds `root: 'playground'` when `command === 'serve'` so `playground/index.html` lives at the URL root. Previously `root` was left unset, Vite served from the repo root, and `index.html` returned 404 — a latent bug introduced when the HTMLs moved into `playground/` (per `archive/playground-repo-hygiene.md`). Because the new `root` scopes Vite to `playground/`, the prior `<script src="../index.js">` reference can no longer resolve; the playground now registers `<hydra-element>` itself from `playground/main.js` (`window.customElements.define('hydra-element', HydraElement)`). The npm entry (`index.js` at the repo root) stays untouched.
- `<hydra-element>` auto-injects a FOUC guard (`body hydra-element:not(:defined) { display:none }`) at module load time, so raw `textContent` code never flashes on screen before the canvas renders. The `body` prefix ensures higher specificity than any `.cell hydra-element { display:flex }` rules that might override a plain selector. The injected `<style>` is idempotent and has `data-hydra-fouc` for easy inspection. For guaranteed zero-flash on the very first paint (before any JS runs), users can add a one-liner `<style>body hydra-element:not(:defined){display:none}</style>` in their `<head>` — documented in the README.

### Added

- `<target-picker>` component (`playground/components/target-picker.js`) — removed. Click on a `<figure class="cell">` to make it the active target. The active cell gets `.is-active` (accent border + outline) and the click handler dispatches `target-change` with `{ index, element, label }`. Keyboard-accessible via `Tab` + `Enter` / `Space`. Each cell's `<figcaption>` shows its slot number (`#0`, `#1`, `#2`, `#3`) — no scene names, so renaming a sketch doesn't drift out of sync with the cell labels.
- Per-slot `localStorage` keys (`hydra-element:editor:0..3`) and per-slot URL hydration (`?code0=…&code1=…&code2=…&code3=…`). Legacy bare `?code=<base64>` URLs (from before this change) are mirrored to all 4 slots so old links still load a coherent page.
- `playground/playground-multi.spec.js` — covers `decodeUrlCodes` (per-slot, legacy mirror, per-slot-wins-over-legacy), `encodeForUrl` / `decodeB64Url` round-trips with UTF-8, the target-picker's `target-change` event shape, editor-panel's per-slot persistence + `target-change` rebind, preset-selector's `slot` field, and the end-to-end 4-element hydration scenarios.
- Share button in `<editor-panel>` that base64-encodes the current textarea value as UTF-8 (inverse of `decodeUrlCode`), updates `history` via `replaceState` (not `pushState`), and copies `${origin}${pathname}?code=...` to the clipboard via `navigator.clipboard.writeText` (with a hidden-input + `execCommand('copy')` fallback). Shows a transient "copied!" confirmation in the existing hint slot for 1.5s. Sharing does **not** trigger eval — the two actions are orthogonal. (Multi-slot aware: see "Changed" above.)
- "open in ojack" link in `<editor-panel>` (adjacent to share, `target="_blank" rel="noopener"`) that points at `https://hydra.ojack.xyz/?code=<same payload>`. The href mirrors the share URL and updates on every textarea change so the link always reflects what the user is editing. Most sketches (`osc` / `noise` / `gradient` / `shape` / `out` puros) round-trip 1:1 between this playground and ojack's editor.
- Multi-instance gallery (`gallery.html` + `playground/gallery.js` + `playground/components/gallery-log.js` + `playground/css/gallery.css`) — four isolated `<hydra-element>` running simultaneously in one HTML document, with a shared `<gallery-log>` aggregating events from all four. Wired into a new `vite.playground.config.js` (multi-page input, output `dist-site/`) and deployed via the new `.github/workflows/deploy-pages.yml` on tag `v*` to `https://jdomizz.github.io/hydra-element/`. (Superseded by the unified playground; the gallery files are deleted in this release and the URL is preserved as a redirect.)

- `destroy()` method for explicit teardown without removing from DOM
- `hydra-element-resize` event when the canvas backing-store resolution changes
- `hydra-context-lost` event for internal canvas context loss
- `synth` property and `hydraEval` standalone export via the `hydra-element/eval` subpath
- `hydra-ready` and `hydra-eval` events
- `ready` promise — resolves with `{ synth }` once Hydra is initialized; always reflects the live synth
- Canvas re-evaluation when the `canvas` property changes
- Canvas resolution follows element CSS size via `ResizeObserver`; explicit `width`/`height` attributes take precedence
- CSS parts: `::part(canvas)` and `::part(analyzer)`
- Reconnection safety — moving the element in the DOM no longer re-initializes synth
- `loadScript()` works in non-global mode (and `el.loadScript(url)` is exposed as a sugar method)
- TypeScript declarations via `dist/hydra-element.d.ts` and `dist/eval.d.ts` (hand-written in `src/`, copied to `dist/` as part of the build — no `tsc` step, no new devDeps)
- Internal canvas has `role="img"` and `aria-label="Hydra visual"`; analyzer canvases are `aria-hidden="true"`
- `ARCHITECTURE.md` describing modules, eval proxy, transient bridge, lifecycle, and build
- `CONTRIBUTING.md` reorganized for maintainers (commands, tests, spec workflow, release process)
- Dev playground upgrade: preset sketches (osc, noise, cam+blend, custom GLSL, deliberate typo), attribute toggles for `audio`/`global`/`loop`/`sources`/`outputs`, a live event log, and a stats strip — all in `playground/`, importing nothing from `src/`
- `npm run check` — lint + test + build in order, the pre-PR gate CI runs
- `.nvmrc` (Node 20 pin, matching CI) and `.editorconfig` mirroring `oxfmt`'s whitespace rules
- Pre-commit hook (husky + lint-staged): `oxlint --fix` + `oxfmt` on staged `*.{js,mjs}`, `oxfmt` on staged `*.md` (bypass with `git commit --no-verify`)
- **Playground extensions catalog** (`playground/extensions.js` + `playground/components/extensions-panel.js` + `playground/extensions.spec.js` + `scripts/check-extensions.mjs` + `EXTENSIONS.md`): the 29 entries the ojack editor offers via its puzzle-piece panel — 23 extensions (metagrowing, geikha hyper-hydra, arnoson hydra-midi, atfornes hydra-strudel, hydra-superdirt, Hydra-FCS, hydra-vertex, hydra-datamosh, scrawlink, Noise Room, hydrated-gradient) + 6 external libraries (p5.js, Tone.js, Three.js, bitfolly, bl4st, Total Serialism). Snapshot date 2026-09-01. Click a row → the demo sketch loads into the active slot via the same `preset-change` event the existing `<preset-selector>` uses. Bridge globals survey (`.opencode/specs/hydra-element/active/playground-extensions-catalog.md` §5) identifies two `not-yet` entries (hydra-vertex, hydra-datamosh) reading `window.hydraSynth` not currently published by the bridge — recommended fix: `bridge-globals-unification.md` mini-spec to publish the union of names extensions read (no `src/` change in this commit). The compat pass is a Playwright script that writes evidence (screenshots + console logs) into `console-output/<slug>.{png,txt}`; not in WTR (CDN fetches unreliable headless). Each demo carries CC BY-NC-SA credit comments per the `playground/presets.js` pattern.
- **Bridge globals unification** (`src/globals.js`): `publishHydraGlobals` now publishes `window.hydraSynth` as an alias for `window._hydra` (same hydra-synth instance) for the duration of the `loadScript` bridge (and permanently in global mode). Two extensions previously labeled `not-yet` (hydra-vertex, hydra-datamosh) now run as `works`. `EXTENSIONS.md` matrix reflects the new state. The snapshot/restore contract still preserves pre-existing `window.hydraSynth` if a page-level global already exists — verified by `src/globals.spec.js`. Per-entry analysis lives in the catalog spec §5 (bridge survey 2026-09-01).

### Changed

- **BREAKING**: `hydraEval` now returns a Promise — always `await` it
- `build` and `plan` agents pinned to `opencode-go/minimax-m3` via project overrides
- `/fix` command now delegates to the default `build` agent
- Removed custom `coder` agent; defaults are sufficient
- **BREAKING**: animation loop is managed by the element, not hydra-synth's `autoLoop`
- **BREAKING**: default canvas size is 0×0 (falls back to 1280×720)
- Eval uses a Proxy for scoped DSL access; identifier-level lookups resolve scope → synth → `globalThis`
- Disconnecting the element no longer destroys the synth — moving the element in the DOM preserves state
- `sources`/`outputs` are bounded to 16 (values above revert to default)
- Multiple synth-reset attribute changes in one tick are coalesced into a single reset
- Async evaluations are now serialized in submission order
- Undefined identifiers in user code emit a one-time `console.warn`
- `loadScript` (and `el.loadScript`) transiently publish the element's Hydra on `window` while a script loads and restore the prior state when it settles
- Non-global elements no longer bind `_hydra`, `synth`, or DSL functions on `window`
- `transforms` property survives synth resets — assignments are re-applied when the synth is recreated (attribute changes, canvas swaps)
- `width`/`height` attributes now coerce with strict `Number()` instead of `parseInt`. A `console.warn` fires once per session for non-numeric values like `width="500px"`; the canvas falls back to its previous resolution. Empty attributes (`width=""`) are treated as absent and fall back too.
- README is oriented at the creative coder; implementation details moved to `ARCHITECTURE.md`
- Dev playground: `<log-panel>.clear()` is private (`#clear`) — only the clear button uses it
- Manager internals are fully private: `CanvasManager`, `HydraManager`, `LoopController`, and `AttributeHandler` keep their state in `#` fields, exposed only through getters (`canvas`, `resizeObserver`, `host`, `synth`, `hydra`, `scope`, `getOptions()`). The element exposes `scope` plus read-only test seams (`canvasManager`, `attributeHandler`, `hydraManager`) for the test suite — not part of the public API
- Old-manager teardown has a single owner: the element's `#initHydra` destroys the previous `HydraManager` exactly once per reset — synth-resetting attribute changes and `canvas` swaps route through it instead of calling `destroy()` separately

### Fixed

- `package.json` `sideEffects` lists only `dist/hydra-element.js` (the `customElements.define` side effect) — the pure `dist/eval.js` subpath stays tree-shakeable
- `time`, `speed`, `bpm` now resolve dynamically in non-global mode
- Multi-element isolation — no more last-writer-wins on `window._hydra`/`window.synth` in non-global mode
- Removing the `loop` attribute now restores the default `loop="true"` instead of stopping the loop
- Removing `width`/`height` returns the canvas to CSS-based sizing instead of forcing 0×0
- Old Hydra instances are destroyed before creating a new one (no more WebGL context leaks)
- WebGL context loss on internal canvases now triggers automatic re-initialization

### Removed

- **BREAKING**: `tick()` method — use `el.synth.tick(dt)`
- **BREAKING**: `analyzer` attribute — use `::part(analyzer) { display: none }`
- **BREAKING**: `pb` option — access via `el.synth.pb`

## [0.6.0] - 2026-02-14

### Added

- New `analyzer` attribute to disable the Hydra audio analyzer UI.

### Changed

- Update dependencies

## [0.5.1] - 2024-04-07

### Fixed

- Update dependencies

## [0.5.0] - 2023-12-17

### Changed

- Now to use the `loadScript` function you have to activate the `global` mode

## [0.4.1] - 2023-12-17

### Fixed

- Exception thrown when using `loadScript` in local mode
- Exception thrown when using `setFunction` in local mode

## [0.4.0] - 2023-12-16

### Changed

- Attribute `global` is now `false` by default so each element uses its own private `hydra-synth` engine

## [0.3.1] - 2023-12-12

### Added

- JSDoc for documentation and typing
- Unit tests

### Fixed

- Exception thrown when parsing an invalid JSON string with `parseJSON`

## [0.3.0] - 2023-11-12

### Added

- Now the component evaluates the code between the element tags
- New `code` property
- New `global` attribute
- New `transforms` property
- New `pb` property
- New `canvas` property
- New `loop` attribute and `tick` method

### Fixed

- The component is already reactive to attribute changes 🎉

### Changed

- The bundler has been changed from webpack to vite

## [0.2.0] - 2021-09-04

### Changed

- Ensure the hydra-synth is created only once. As a result the component loses reactivity to attribute changes 😒

### Fixed

- Use valid SPDX license identifier in package.json.

## [0.1.2] - 2021-08-17

### Fixed

- Distribute the correct bundle 😅

## [0.1.1] - 2021-08-17

### Changed

- Attributes are now initialized in the constructor to prevent webpack from defining them before the super() call.

## [0.1.0] - 2021-08-13

### First public release.
