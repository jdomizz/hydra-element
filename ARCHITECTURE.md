# Architecture

This document describes how `<hydra-element>` is put together. It is for
maintainers and contributors; if you just want to use the element, read
[README.md](./README.md) instead.

## Big picture

```
src/index.ts ── the main entry: registers the engine factory (hydra-synth)
   │            + the runtime factory, defines <hydra-element>, exports types
   │
   ├─▶ src/element/ ── the DOM-only shell (zero hydra vocabulary)
   │     element.ts   HydraElement: lifecycle, canvas, FOUC guard, delegation
   │     canvas.ts    CanvasManager: canvas + resize + context-loss dispatch
   │     events.ts    the public event-name constants
   │     runtime.ts   the CanvasRuntime seam { attach, detach, destroy, ... }
   │        ▲  delegates every engine-touching behavior to the slot below
   │
   └─▶ src/runtime/ ── the hydra adapter (implements CanvasRuntime)
         runtime.ts   HydraRuntime: attrs, eval events, resize, context-loss
         attributes.ts  pure attr parsing · globals.ts  publishHydraGlobals
            ▲  drives the core, bridges loadScript
            │
            └─▶ src/core/ ── the headless engine core (zero DOM, zero hydra)
                  core.ts  HydraCore + createHydraCore + setDefaultHydraFactory
                  eval.ts  hydraEval + userCodeLine · queue.ts · loop.ts
                          │
                          ▼
                    hydra-synth (peer) — built through the injected factory
```

Imports flow one way — `index → element + runtime`, `runtime → core`,
`element → parse/types` only — and nothing imports the element except the main
entry. The shell carries zero hydra vocabulary; the runtime carries zero DOM;
the core carries neither. `hydra-synth` is imported exactly once (the engine
factory in `index.ts`).

## Modules

### `src/core/` — the headless engine core (`hydra-element/core`)

Zero DOM, zero events, zero `hydra-synth` import. Orchestration is testable
in Node against an injected engine factory + scheduler.

- `types.ts` — the structural contracts: `SynthLike`, `HydraLike`,
  `HydraFactory`, `EngineOptions`, `CreateHydraCoreOptions` (factory +
  scheduler + an injectable `scope` — the runtime passes one persistent object
  so bare assignments survive engine resets).
- `eval.ts` — `hydraEval(code, synth, scope)` + `userCodeLine(error, code)`
  (see [hydraEval](#hydraeval) below).
- `queue.ts` — `EvalQueue`: a serialized promise chain whose tail swallows
  errors, so one failed eval never kills the queue.
- `loop.ts` — `Loop`: a scheduler-injected rAF clock (`Scheduler =
'raf' | RafScheduler`); `start()` is a no-op in Node without injection.
- `core.ts` — `HydraCore`: builds the engine through the factory, wires the
  non-enumerable `s`/`o` arrays, owns the persistent user scope, exposes
  `evalAsync` (queue-submit + line attach), `start`/`stop`/`tick`/
  `setResolution`/`loadScript`, and `destroy()`. Facade: `createHydraCore` +
  `setDefaultHydraFactory` (throws when no factory is registered).
- `index.ts` — the subpath entry.

### `src/element/` — the DOM-only shell

Carries zero hydra vocabulary in its own logic; delegates every
engine-touching behavior to the runtime held in its `#runtime` slot.

- `events.ts` — the public event-name constants (`hydra-element-resize`,
  `hydra-context-lost`).
- `canvas.ts` — `CanvasManager`: canvas creation/resizing/preservation,
  ResizeObserver → `hydra-element-resize`, and a **non-once**
  `webglcontextlost` handler (dispatches `hydra-context-lost`; survives
  repeated losses).
- `runtime.ts` — the `CanvasRuntime` seam `{ attach, detach, destroy,
handleCanvasSwap? }` + `setDefaultRuntimeFactory`/`getDefaultRuntimeFactory`.
- `element.ts` — `HydraElement` (the shell): observes only `width`/`height`;
  `code`/`synth`/`scope`/`transforms`/`loadScript`/`canvas` delegate to the
  runtime slot; `ready` is a live getter; `seedCode` + `notifyReady` +
  `runtime` + `canvasManager` are `@internal` seams (stripped from the
  generated d.ts); the FOUC guard is injected at module load.

### `src/runtime/` — the hydra adapter

`HydraRuntime` implements `CanvasRuntime` and is wired in by the main entry.

- `attributes.ts` (pure) — `parseHydraAttrs` / `parseHydraAttr` /
  `parseResetAttr` + `HYDRA_ATTRS` / `RESET_ATTRS` / `DEFAULT_RUNTIME_OPTIONS`.
  Absent attributes keep their default — `parseNumber(null)` is `0` and must
  not clobber `numSources`/`numOutputs`.
- `globals.ts` — `publishHydraGlobals` (see [the bridge](#loadscript-bridge)).
- `runtime.ts` — `HydraRuntime`: `attach` (read seed, parse attrs, init core,
  wire resize → `core.setResolution` and context-loss → `core.stop` + a
  re-armed one-shot `webglcontextrestored` handler, MutationObserver on the
  hydra attributes, dispatch `hydra-ready`), `#eval` (dispatch `hydra-eval`),
  `#flushSynthReset` (coalesce → recreate → re-eval), `handleCanvasSwap`, the
  `loadScript` bridge, and `detach`/`destroy`.

### `src/parse.ts` + `src/types.ts`

Shared, layer-agnostic:

- `parse.ts` — `parseNumber` / `parseJSON` / `parseOption`.
- `types.ts` — the public detail types (`HydraReadyDetail`, `HydraEvalDetail`,
  `HydraResizeDetail`, `HydraTransformFunction`) + the
  `HTMLElementTagNameMap` / `HTMLElementEventMap` global augmentations.

### `src/index.ts` + `src/eval.ts` — the entries

- `index.ts` — registers `setDefaultHydraFactory(opts => new Hydra({
...opts, autoLoop: false }))` (the **only** `hydra-synth` import — the core
  owns the loop, so the engine must not self-loop), registers the runtime
  factory, defines `<hydra-element>`, re-exports `HydraElement` + the types.
- `eval.ts` — re-exports `hydraEval` / `userCodeLine` (the `hydra-element/eval`
  subpath).

## `hydraEval`

The heart of user-code evaluation (`src/core/eval.ts`), exported under
`hydra-element/eval` for users who want to drive their own loops.

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

## Lifecycle

### Connection

`connectedCallback` initializes the element **once** (the `#initialized`
flag) and mounts the runtime. Subsequent reconnects (DOM moves, attribute
changes that trigger a synth reset) re-attach the preserved runtime without
recreating the engine — moving the element around is cheap.

### Disconnection

`disconnectedCallback` calls `runtime.detach()` — stop the loop, disconnect
the ResizeObserver and the attribute observer, remove the resize/context-loss
listeners; **the engine stays alive** so DOM moves are no-ops for the WebGL
context.

### Reset

Several attributes force a fresh synth (`global`, `audio`, `sources`,
`outputs`, `precision`). The runtime's MutationObserver detects them; on
change:

1. The change is queued and a microtask is scheduled
2. After the current task, `HydraRuntime.#flushSynthReset` applies all pending changes in a single batch
3. `#initCore` destroys the previous core (no WebGL context leak) before building a new one — teardown happens exactly once per reset

This pairs with the `lifecycle-resource-leaks` spec — every reset path
must destroy the old core before creating the new one.

### Destruction

`el.destroy()` does what `disconnectedCallback` used to do, plus:

- destroys the runtime (which destroys the core: clears sources, stops audio)
- removes analyzer canvases from the shadow root
- resets `#initialized = false` and the `ready` promise so a later reconnect initializes fresh

### `ready`

`el.ready` is a live getter, not a fixed promise:

```js
get ready() {
  return this.#runtime ? Promise.resolve({ synth: this.synth }) : this.#readyPromise
}
```

It always resolves to the **current** synth, even after a reset or
reconnect. Before the runtime mounts, it returns the constructor promise
(which `notifyReady` resolves at the end of `attach`).

## Eval queue and coalescing

### Async evaluations

`HydraCore.evalAsync` submits onto the `EvalQueue` promise chain so two rapid
`el.code = …` assignments run in submission order, not parallel. The queue
keeps a swallowed-error tail, so one failed eval never kills the chain.

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
  const restore = publishHydraGlobals(this.core.hydra)
  try {
    await this.core.loadScript(url)
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
- Three entry points (`vite.config.js`):
  - `dist/hydra-element.js` — the element + everything (default import)
  - `dist/eval.js` — just `hydraEval` for users driving their own loop (subpath import `hydra-element/eval`)
  - `dist/core.js` — the headless engine core (subpath import `hydra-element/core`)
- Single runtime dependency: `hydra-synth`
- TypeScript declarations are emitted by `tsc -p tsconfig.build.json` (`dist/index.d.ts`, `dist/core/index.d.ts`, `dist/eval.d.ts` plus the `element/`/`runtime/` trees); the `postbuild` script asserts the three public entry points. The `synth` property is typed as `unknown` because `hydra-synth` does not yet publish its own `.d.ts`; narrow when it does.
- `package.json` declares `sideEffects: ["./dist/hydra-element.js"]` — only the element entry has a module-load side effect (`customElements.define`); the pure `dist/eval.js` and `dist/core.js` subpaths stay tree-shakeable
- `exports` map exposes `.`, `./eval`, `./core`, and `./package.json` (the last so bundlers can resolve the package manifest)

## Events

| Event                  | Source          | When                                                  |
| ---------------------- | --------------- | ----------------------------------------------------- |
| `hydra-ready`          | `HydraRuntime`  | First (or fresh) synth is ready                       |
| `hydra-eval`           | `HydraRuntime`  | After every `evalAsync`, `{ success, error?, line? }` |
| `hydra-element-resize` | `CanvasManager` | Canvas backing-store resolution changes               |
| `hydra-context-lost`   | `CanvasManager` | WebGL context for the internal canvas was lost        |

All events bubble (`bubbles: true`) so a single document-level listener
can watch every element.

## CSS parts

- `::part(canvas)` — the main render surface
- `::part(analyzer)` — Hydra's audio analyzer canvases (hidden by default; show via CSS if you want them visible)

The internal canvas also has `role="img"` and `aria-label="Hydra visual"`
so it doesn't break accessibility audits.

## Test strategy

Tests live next to the code they exercise. Two lanes:

- **Browser (WTR)** — `src/**/*.spec.js` + `playground/**/*.spec.js`, real
  Chromium via `@open-wc/testing` + `sinon`. Each spec imports the main entry
  (`./index`) to register the runtime + engine factories and define the element.
- **Node (vitest)** — `src/core/**/*.spec.ts` (`pnpm test:node`), exercising the
  headless core against an injected engine factory + scheduler — no DOM, no
  hydra-synth import.

Class state is private (`#` fields). Tests that need to reach internals use the
**test seams** — `@internal` getters on the shell (`canvasManager`, `runtime`)
and on the runtime (`core`) — plus `CanvasManager.resizeObserver`. They exist
for the suite only and are stripped from the generated d.ts (`stripInternal`).

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
mini-spec adds `'hydraSynth'` to `src/runtime/globals.ts`'s published set
(single-line addition; the snapshot/restore in `publishHydraGlobals`
preserves pre-existing keys and deletes only what was introduced).
**Out of scope for the catalog commit** — the catalog ships with the
two gap entries honestly labeled `not-yet` and the demo `code` for
each pointing at the `window.hydraSynth` requirement. If the bridge
fix lands in v0.7.0, flip those labels to `works`.
