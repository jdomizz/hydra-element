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
│  ┌────────────�  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
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
- `_initHydra()` — orchestrates canvas + Hydra manager creation
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
- `_observeResize()` — wires a `ResizeObserver` on the host and applies `_handleResize` entries; precedence: explicit `width`/`height` host attribute > CSS > 1280×720 fallback

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

- **Global mode** (`element._initHydra`): persistent exposure for editor/extension workflows
- **`loadScript` bridge** (`hydra.loadScript`): transient publish while a script loads, restore on completion (success or error)

The `restore()` closure restores pre-existing values and deletes keys
the helper introduced — so a script loaded into one element cannot
clobber a page-level `window.render`.

Private methods use `#` syntax (ES2022). They are unreachable from
outside the class even by name; underscore prefixes are reserved for
data fields and module-level locals only.

## Lifecycle

### Connection

`connectedCallback` initializes the element **once** (`_initialized`
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

1. The change is queued in a `Map` and a microtask is scheduled
2. After the current task, `_flushSynthReset` applies all pending changes in a single batch
3. The previous `HydraManager` is destroyed (no WebGL context leak) before a new one is built

This pairs with the `lifecycle-resource-leaks` spec — every reset path
must destroy the old manager before creating the new one.

### Destruction

`el.destroy()` does what `disconnectedCallback` used to do, plus:

- destroys the current `HydraManager` (clears sources, stops audio)
- removes analyzer canvases from the shadow root
- resets `_initialized = false` and the `ready` promise so a later reconnect initializes fresh

### `ready`

`el.ready` is a live getter, not a fixed promise:

```js
get ready() {
  return this.hydraManager ? Promise.resolve({ synth: this.synth }) : this._readyPromise
}
```

It always resolves to the **current** synth, even after a reset or
reconnect. Before the first `_initHydra`, it returns the constructor
promise (which resolves when `hydra-ready` fires).

## Eval queue and coalescing

### Async evaluations

`HydraManager.evaluate` chains onto a promise queue so two rapid
`el.code = …` assignments run in submission order, not parallel:

```js
this._evalQueue = this._evalQueue.then(() => this._evaluate(code)).then(handleResult, dispatchError)
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
- TypeScript declarations generated as `dist/hydra-element.d.ts` and `dist/eval.d.ts`
- `package.json` declares `sideEffects: false` for both entries (no top-level side effects other than `customElements.define`)
- `exports` map exposes `.`, `./eval`, and `./package.json` (the last so bundlers can resolve the package manifest)

## Events

| Event                  | Source          | When                                            |
| ---------------------- | --------------- | ----------------------------------------------- |
| `hydra-ready`          | `HydraManager`  | First (or fresh) synth is ready                 |
| `hydra-eval`           | `HydraManager`  | After every `evaluate()`, `{ success, error? }` |
| `hydra-element-resize` | `CanvasManager` | Canvas backing-store resolution changes         |
| `hydra-context-lost`   | `CanvasManager` | WebGL context for the internal canvas was lost  |

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

For full test details and the WTR quirks (e.g. installing Playwright's
Chromium), see [CONTRIBUTING.md](./CONTRIBUTING.md).
