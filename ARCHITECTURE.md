# Architecture

This document describes how `<hydra-element>` is put together. It is for
maintainers and contributors; if you just want to use the element, read
[README.md](./README.md) instead.

## Big picture

```
┌─────────────────────────────────────────────────────────────────┐
│  <hydra-element>                                                │
│  src/element.js (HTMLElement facade)                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  Attribute │  │    Canvas    │  │   Hydra    │  │   Loop   │ │
│  │   Handler  │  │   Manager    │  │  Manager   │  │  Ctrl    │ │
│  │ attrs.js   │  │  canvas.js   │  │  hydra.js  │  │  loop.js │ │
│  └────────────┘  └──────────────┘  └────────────┘  └──────────┘ │
│                              │                                  │
│                              ▼                                  │
│                    ┌────────────────┐                           │
│                    │   src/eval.js  │  hydraEval() scope proxy  │
│                    └────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌─────────────────────────┐
                  │   hydra-synth (peer)    │
                  │   + src/globals.js      │  transient bridge
                  └─────────────────────────┘
```

`element.js` is a thin facade: it owns lifecycle (connect/disconnect/
destroy, attribute change handling) and wires together four focused
managers. Each manager owns one concern and knows nothing about the
others except through the element.

## Modules

### `src/element.js` — the facade

The custom element class. It owns:

- attribute observation (`observedAttributes` + `attributeChangedCallback`)
- lifecycle callbacks (`connectedCallback`, `disconnectedCallback`)
- `#initHydra()` — orchestrates canvas + Hydra manager creation (the single owner of old-manager teardown: every reset path goes through it, so the previous manager is destroyed exactly once)
- the `code`, `canvas`, `synth`, `ready`, `loadScript`, `destroy` public surface
- event dispatch for `hydra-ready`, `hydra-eval`, `hydra-element-resize`, `hydra-context-lost`

The facade does **not** know how canvas sizing or evaluation works. It
delegates to managers and reacts to their outcomes.

### `src/canvas.js` — `CanvasManager`

Owns the canvas lifecycle inside the shadow root:

- `init(width, height)` — create the internal `<canvas>` (with `role="img"`, `aria-label`), attach a one-shot `webglcontextlost` listener
- `preserveCustomCanvas(canvas)` — adopt a user-supplied canvas into the shadow root, mark it `part="canvas"`, observe its CSS size unless it has explicit `width`/`height` attributes
- `resize(w, h)` — set the backing-store resolution
- `refreshFromCss()` — re-read the host's CSS bounding rect and resize accordingly (used when `width`/`height` attributes are removed)
- `removeInternalCanvas()`, `removeAnalyzerCanvases()`, `tagAnalyzerCanvases()` — clean up internal vs. Hydra-created canvases
- `#observeResize()` — wires a `ResizeObserver` on the host and applies `#handleResize` entries; precedence: explicit `width`/`height` host attribute > CSS > 1280×720 fallback

### `src/hydra.js` — `HydraManager`

Wraps a `hydra-synth` instance and dispatches `hydra-ready` /
`hydra-eval` events on the host.

- `init()` — `new Hydra({ ...options, autoLoop: false })`; bind `scope.loadScript` to the bridge
- `loadScript(url)` — **transient bridge**: publish globals, await `hydra.loadScript(url)`, restore in `finally`. See [the bridge section](#loadscript-bridge) below.
- `evaluate(code)` — queue-based, see [eval queue](#eval-queue-and-coalescing)
- `destroy()` — clear sources, stop audio, drop the instance
- `tick(dt)`, `setResolution(w, h)` — drive the synth forward

### `src/loop.js` — `LoopController`

A minimal requestAnimationFrame loop:

- `start()` / `stop()`
- invokes the provided `tick(dt)` callback each frame

`element.js` owns the lifecycle decision (when to start/stop based on
`autoLoop` and the connected flag); the controller is just the clock.

### `src/attributes.js` — `AttributeHandler`

Parses raw attribute strings into typed options and tells the element
which attributes force a synth reset (`global`, `audio`, `sources`,
`outputs`, `precision`). Pure, DOM-free.

- `parse(attr, value)` → `{ width, height, makeGlobal, ... }`
- `update(attr, value)` → mutates and returns the new options object
- `hasSynthResettingAttribute(attr)` → boolean

### `src/parse.js`

Three small parsers used by `AttributeHandler`:

- `parseNumber(value, default, min, max)` — `Number(value)` inside `[min, max]`, else default
- `parseJSON(value, default)` — `JSON.parse(value)`; treats `null`/`undefined`/`''` as "no value" and returns the default (important for attribute-removal semantics)
- `parseOption(value, default, allowed)` — picks from `allowed` or returns default

### `src/eval.js` — `hydraEval`

The heart of user-code evaluation. Exported as a standalone function
under `hydra-element/eval` for users who want to drive their own loops.

```js
export function hydraEval(code, synth, scope) {
  const proxy = createScopeProxy(synth, scope || Object.create(null))
  const fn = new Function('__scope', `return (async function(){with(__scope){${code}}})()`)
  return fn(proxy)
}
```

User code runs inside an **async IIFE** wrapped in `with(proxy)` so
identifiers resolve through the proxy. The proxy:

- `has` returns `true` for everything (so `with(__scope)` never throws `ReferenceError`)
- `get` resolves in priority order: persistent scope → `synth` → global `globalThis`. Each synth function is bound so `this` works inside user code.
- `set` stores bare assignments (`x = 5`) on the persistent scope and syncs a small set of user props (`speed`, `bpm`, `update`, `afterUpdate`, `fps`) to the synth
- emits a one-time `console.warn` per session for identifiers that resolve to nothing — typos surface instead of failing silently

**This is not a sandbox.** `globalThis` is reachable. Only evaluate
trusted code. Real isolation requires an iframe with a separate origin.

### `src/globals.js` — transient bridge

`publishHydraGlobals(hydra)` snapshots the current `window` state for
`_hydra`, `synth`, and every function key of `hydra.synth`, writes the
element's values, and returns a `restore()` closure. The helper is
shared between:

- **Global mode** (the element's `#initHydra`): persistent exposure for editor/extension workflows
- **`loadScript` bridge** (`hydra.loadScript`): transient publish while a script loads, restore on completion (success or error)

The `restore()` closure restores pre-existing values and deletes keys
the helper introduced — so a script loaded into one element cannot
clobber a page-level `window.render`.

Private methods use `#` syntax (ES2022). They are unreachable from
outside the class even by name; underscore prefixes are reserved for
data fields and module-level locals only.

## Lifecycle

### Connection

`connectedCallback` initializes the element **once** (the `#initialized`
flag). Subsequent reconnects (DOM moves, attribute changes that trigger
a synth reset) preserve the same Hydra instance — moving the element
around is now cheap.

### Disconnection

`disconnectedCallback` only stops the loop and disconnects the
ResizeObserver; **the synth stays alive** so DOM moves are no-ops for
the WebGL context.

### Reset

Several attributes force a fresh synth (`global`, `audio`, `sources`,
`outputs`, `precision`). On change:

1. The change is queued in a plain object and a microtask is scheduled
2. After the current task, `#flushSynthReset` applies all pending changes in a single batch
3. The previous `HydraManager` is destroyed (no WebGL context leak) before a new one is built — teardown happens inside `#initHydra`, exactly once per reset

This pairs with the `lifecycle-resource-leaks` spec — every reset path
must destroy the old manager before creating the new one.

### Destruction

`el.destroy()` does what `disconnectedCallback` used to do, plus:

- destroys the current `HydraManager` (clears sources, stops audio)
- removes analyzer canvases from the shadow root
- resets `#initialized = false` and the `ready` promise so a later reconnect initializes fresh

### `ready`

`el.ready` is a live getter, not a fixed promise:

```js
get ready() {
  return this.#hydraManager ? Promise.resolve({ synth: this.synth }) : this.#readyPromise
}
```

It always resolves to the **current** synth, even after a reset or
reconnect. Before the first `#initHydra`, it returns the constructor
promise (which resolves when `hydra-ready` fires).

## Eval queue and coalescing

### Async evaluations

`HydraManager.evaluate` chains onto a promise queue so two rapid
`el.code = …` assignments run in submission order, not parallel:

```js
this.#evalQueue = this.#evalQueue.then(() => this.#evaluate(code)).then(handleResult, dispatchError)
```

This matters for live-coding editors that fire many keystrokes per
second — without the queue, the earlier evaluation can finish after
the later one and the visible frame can lag behind the typed code.

### Reset coalescing

Synth-resetting attribute changes are coalesced into a single microtask
so `setAttribute('global', 'true')` + `setAttribute('sources', '8')` +
`setAttribute('outputs', '2')` triggers **one** reset, not three. This
caps WebGL context churn at one per tick.

## `loadScript` bridge

```js
async loadScript(url) {
  const restore = publishHydraGlobals(this.hydra)
  try {
    await this.hydra.loadScript(url)
  } finally {
    restore()
  }
}
```

Why transient, not persistent: the previous version bound `_hydra`,
`synth`, and ~50 DSL functions to `window` for every element
unconditionally. With N elements on a page, last-writer-wins clobbered
all previous synth surfaces and polluted every page that embedded the
element.

The bridge restores `window` to its prior state in `finally` — so a
failed `loadScript` does not leak either. The snapshot/restore logic
preserves pre-existing values and deletes only what we introduced.

**Limitation:** extensions that read `window._hydra` _lazily_ (after
`loadScript` resolves, e.g. inside `midi.start()` or during ongoing
animation) fall outside the bridge window and need `global="true"`.

## Build and distribution

- ES module only (`"type": "module"`, `vite.config.js`)
- Two entry points (`vite.config.js`):
  - `dist/hydra-element.js` — the element + everything (default import)
  - `dist/eval.js` — just `hydraEval` for users driving their own loop (subpath import `hydra-element/eval`)
- Single runtime dependency: `hydra-synth`
- TypeScript declarations hand-written in `src/hydra-element.d.ts` and `src/eval.d.ts`, copied to `dist/hydra-element.d.ts` and `dist/eval.d.ts` by a custom Vite plugin in `vite.config.js`. The `synth` property is typed as `unknown` because `hydra-synth` does not yet publish its own `.d.ts`; narrow when it does.
- `package.json` declares `sideEffects: ["./dist/hydra-element.js"]` — only the element entry has a module-load side effect (`customElements.define`); the pure `dist/eval.js` subpath stays tree-shakeable
- `exports` map exposes `.`, `./eval`, and `./package.json` (the last so bundlers can resolve the package manifest)

## Events

| Event                  | Source          | When                                                   |
| ---------------------- | --------------- | ------------------------------------------------------ |
| `hydra-ready`          | `HydraManager`  | First (or fresh) synth is ready                        |
| `hydra-eval`           | `HydraManager`  | After every `evaluate()`, `{ success, error?, line? }` |
| `hydra-element-resize` | `CanvasManager` | Canvas backing-store resolution changes                |
| `hydra-context-lost`   | `CanvasManager` | WebGL context for the internal canvas was lost         |

All events bubble (`bubbles: true`) so a single document-level listener
can watch every element.

## CSS parts

- `::part(canvas)` — the main render surface
- `::part(analyzer)` — Hydra's audio analyzer canvases (hidden by default; show via CSS if you want them visible)

The internal canvas also has `role="img"` and `aria-label="Hydra visual"`
so it doesn't break accessibility audits.

## Test strategy

Tests live next to the code they exercise (`src/**/*.spec.js`), use
`@open-wc/testing` + `sinon`, and run in a real browser via Web Test
Runner with Playwright's Chromium. The element is registered in each
spec file (`customElements.define`) so tests are self-contained and can
run independently.

All manager state is private (`#` fields). Tests that need to reach
internals use the **test seams** — read-only getters on the element
(`canvasManager`, `attributeHandler`, `hydraManager`, `scope`) and on
the managers (`CanvasManager.resizeObserver`, `HydraManager.hydra`,
`HydraManager.scope`). They exist for the suite only and are not part
of the public API.

For full test details and the WTR quirks (e.g. installing Playwright's
Chromium, the failing-sinon-assertion hang), see
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Demo surface (unified playground)

The dev playground lives in `playground/` and is built by
`vite.playground.config.js` to `dist-site/` for GitHub Pages.

The playground page renders **four** isolated `<hydra-element>` in a 2×2
grid (`#g-0` through `#g-3`), each with its own non-global-mode Hydra
engine. The user selects the active cell by **clicking on it** (or
keyboard `Tab` + `Enter` / `Space`); the editor / cfg-form / stats / log
re-bind when the click handler fires `target-change`. The active cell
gets `.is-active` (accent border + outline) so the user can see which
cell the editor is targeting.

```
┌──────────────────────┬──────────────────────────┬──────────────────────┐
│ <preset-selector>    │ <figure class="cell">    │ <cfg-form>           │
│ <editor-panel>       │   #0  <hydra-element>    │ <multi-log>          │
│   textarea + buttons │ <figure class="cell">    │   <stats-strip>      │
│                      │   #1  <hydra-element>    │ </multi-log>         │
│                      │ <figure class="cell">    │                      │
│                      │   #2  <hydra-element>    │                      │
│                      │ <figure class="cell">    │                      │
│                      │   #3  <hydra-element>    │                      │
└──────────────────────┴──────────────────────────┴──────────────────────┘
```

### Event flow

```
.click / Enter / Space on .cell ─[ setActive(i) ]→  document  ─→  <editor-panel>     rebinds target + slot
                                              ─→  <cfg-form>         rebinds target
                                              ─→  <stats-strip>      rebinds target
                                              ─→  <preset-selector>  updates slot field
<preset-selector>   ─[ preset-change ]→   document  ─→  <editor-panel>     writes to active slot
<hydra-element>     ─[ hydra-ready | hydra-eval | hydra-element-resize | hydra-context-lost ]→
                                            document  ─→  <multi-log>        aggregates per id
```

All four events bubble + are composed, so a single document-level listener
catches every event without reaching into shadow roots. The cell click
handler lives in `playground/main.js` (not in a component) because it
needs access to both the element array and the cell DOM nodes, and that
relationship is exactly the wiring `main.js` already owns.

### Slot persistence and share URL

Each cell persists its code in its own `localStorage` key:
`hydra-element:editor:0` through `hydra-element:editor:3`. The
`<editor-panel>` rewrites the textarea when the user clicks a different
cell.

URL hydration uses per-slot keys: `?code0=…&code1=…&code2=…&code3=…`. The
share button collapses to a bare `?code=…` when all four slots are
identical (the common case), so simple sketches still share a one-letter
URL delta. A bare legacy `?code=…` (no slot suffix) is mirrored to all
four slots on hydration — preserving any links shared before the
multi-instance rework.

### Standalone gallery

The earlier `gallery.html` (a separate page that mounted 4 cells with
hardcoded scenes and no editor) is retired. The file persists as a 4-line
`<meta http-equiv="refresh">` redirect to `./`, so the public URL
`https://jdomizz.github.io/hydra-element/playground/gallery.html` (still
cited in `backlog/launch-week-comms.md`) doesn't 404 for external links.
The redirect is rendered by Vite alongside the index page.

## `<hydra-editor>` — separate package

Per ο (2026-09-01), the `<hydra-editor>` element + Hydra config extracted
from `hydra-element` into a new standalone npm package
[`hydra-editor`](https://www.npmjs.com/package/hydra-editor) (unscoped,
AGPL-3.0-or-later). `hydra-element` 0.7.0 ships **without** the editor
subpath.

The playground adopts `<hydra-editor>` from the `hydra-editor` package
(devDependency `file:../hydra-editor` until R1 publish, then `^0.1.0`).
The panel keeps its per-slot `localStorage` Map, `target-change` rebind,
`preset-change` routing, and storage fallback. The element's `code-apply`
event triggers `target.code = ...`, and after each eval the panel diffs
the synth keys against the 96-entry baseline and calls
`editor.addWords(newNames)` — so loading an extension grows the completion
dropdown automatically.

See the [`hydra-editor` README](https://github.com/jdomizz/hydra-editor#readme)
for the element's API, architecture, and scope discipline.

## Playground extensions catalog

The playground ships a **full mirror** of the ojack editor's
puzzle-piece panel — 29 entries from
[`hydra-synth/hydra-extensions`](https://github.com/hydra-synth/hydra-extensions)
(snapshot 2026-09-01): 23 extensions + 6 external libraries.

```
playground/extensions.js              ← EXTENSIONS catalog data (29 entries)
playground/components/extensions-panel.js  ← <extensions-panel> custom element
playground/extensions.spec.js         ← catalog shape + panel rendering + click dispatch
scripts/check-extensions.mjs          ← Playwright compat pass (canvas + console evidence)
EXTENSIONS.md                         ← compatibility matrix
```

Each entry carries: `name`, `description`, `author`, `www?`,
`documentation?`, `license`, `thumbnail`, `load` (the line the playground
prepends to the demo), `code` (the demo sketch), `category`
(`'extension'` or `'library'`), `compat` (`'works'` /
`'works-with-notes'` / `'not-yet'`), `compatNote?`. Demos adapted from
the official `?code=` examples carry the same CC BY-NC-SA credit
comments as `playground/presets.js`.

**`<extensions-panel>`** renders two `<details>` groups (Extensions +
External libraries), each row a click target that dispatches
`preset-change` with `{ slot, code, name }` — the same event shape
`<preset-selector>` uses. Reuses the playground's existing event flow
(no editor-panel change needed beyond what `playground-editor.md` covers).

**Compat pass** (`scripts/check-extensions.mjs`): launches `pnpm dev`,
opens the playground in headless Chromium, clicks every catalog entry,
captures a canvas screenshot + console per entry, writes evidence to
`console-output/<slug>.{png,txt}` and a markdown matrix to
`EXTENSIONS.md`. Not in WTR (CDN fetches unreliable in that
environment). Documented in `CONTRIBUTING.md` as the refresh protocol.

**Bridge globals survey** (catalog spec §5, filled 2026-09-01):
per-entry `window.*` access analysis identifies two `not-yet` entries
(hydra-vertex, hydra-datamosh) reading `window.hydraSynth` not
currently published. Recommended fix: `bridge-globals-unification.md`
mini-spec adds `'hydraSynth'` to `src/globals.js`'s published set
(single-line addition; the snapshot/restore in `publishHydraGlobals`
preserves pre-existing keys and deletes only what was introduced).
**Out of scope for the catalog commit** — the catalog ships with the
two gap entries honestly labeled `not-yet` and the demo `code` for
each pointing at the `window.hydraSynth` requirement. If the bridge
fix lands in v0.7.0, flip those labels to `works`.
