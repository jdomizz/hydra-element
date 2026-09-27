# Architecture

`<hydra-element>` is a Web Component that owns its own [`hydra-synth`](https://github.com/hydra-synth/hydra-synth) engine, canvas, render loop and evaluation scope. Each instance is **isolated** by default (`makeGlobal: false`), so many elements can coexist on a page.

Two deliberate choices shape everything else:

- the engine is created with `autoLoop: false` — **the element owns the render loop**, so re-initializing an element never leaks a phantom `requestAnimationFrame`;
- the element owns a **persistent eval scope** — bare assignments survive engine resets, which is what live-coding expects.

Removing the element from the DOM tears it down automatically
(`disconnectedCallback`); re-inserting it re-initializes the engine and
re-evaluates the code, and the persistent eval scope survives both.

## Big picture

```
src/index.js ── registers <hydra-element>, re-exports HydraElement
   │
   ▼
src/element.js ── HydraElement (the custom element)
   │   owns: lifecycle · attributes · events · public API
   │
   ├─▶ hydra-context   HydraContext — eval core, globals bridge
   ├─▶ src/canvas.js   CanvasManager — canvas, ResizeObserver, ::part
   ├─▶ src/loop.js     Loop — requestAnimationFrame
   ├─▶ src/capture.js  FrameCapture — frame latch
   ├─▶ src/script.js   loadScriptInto — extension loading
   ├─▶ src/options.js  foldOptions — attributes → options
   ├─▶ src/queue.js    EvalQueue — serialized evals
   └─▶ src/parser.js   parseNumber / parseJSON / parseOption
   │
   ▼
hydra-synth — a bundled dependency, built through hydraFactory, driven by the element
```

The element is plain JavaScript in `src/`; evaluation lives behind the
`HydraContext` class in the sibling `hydra-context` package. Imports flow one
way (`src/index.js → element → helpers`), and `hydra-synth` is imported only in
`element.js`'s factory.

## Module map

| File | Responsibility |
| --- | --- |
| `src/index.js` | Entry point. Registers `<hydra-element>` and re-exports `HydraElement`. |
| `src/element.js` | `HydraElement` — the custom element. Owns the lifecycle, attributes, events and the public API; engine, loop, canvas, eval and capture are delegated to the helpers. |
| `hydra-context` | Evaluation package — `HydraContext`, `publishHydraGlobals`, `userCodeLine`. |
| `src/canvas.js` | `CanvasManager` — internal canvas, `ResizeObserver` (+ DPR) sizing, `::part` exposition. |
| `src/loop.js` | `Loop` — the `requestAnimationFrame` loop (the engine is created with `autoLoop: false`). |
| `src/capture.js` | `FrameCapture` — reads frames through the engine's `getScreenImage` latch. |
| `src/script.js` | `fetchScriptText` / `loadScriptInto` — extension loading via the context bridge. |
| `src/options.js` | `DEFAULT_OPTIONS` / `ATTR_PARSERS` / `OBSERVED_ATTRIBUTES` / `foldOptions` — attribute parsing into hydra options. |
| `src/queue.js` | `EvalQueue` — serializes element code evaluation tasks. |
| `src/parser.js` | Pure attribute parsing (`parseNumber`, `parseJSON`, `parseOption`). |

The build yields one artifact: `dist/hydra-element.js`, exposed as the package
root export. Evaluation is provided by the sibling `hydra-context` package;
its root exports are `HydraContext`, `publishHydraGlobals`, and `userCodeLine`,
and the element does not import any package-internal modules.

## Data flow

The element routes every entry point through the small helpers:

```
el.code = "..." ──▶ src/queue.js ──▶ HydraContext.eval ──▶ (async function(){ with(scopeProxy) { code } })()
                         │                          │
                         │                    get(foo): scope → synth → globalThis
                         │                    set(foo): scope (+ mirror speed/bpm/… to synth)
                         │
                    hydra-eval event ──▶ { success, error?, line? }

attribute change ──▶ src/options.js (foldOptions) ──▶ engine recreate or canvas refresh

el.loadScript(url) ──▶ src/script.js ──▶ HydraContext.withBridge ──▶ fetch → eval, else hydra.loadScript
                         │
                    hydra-loadscript event ──▶ { success, url, error? }

el.capture() ──▶ src/capture.js (FrameCapture) ──▶ hydra.getScreenImage ──▶ PNG Blob
```

## Evaluation model

Identifiers inside a sketch resolve through the scope `Proxy` in this order:

1. **live engine read** — for the engine-owned live names (`time`, `width`,
   `height`, `speed`, `bpm`, `update`, `afterUpdate`, `fps`) the value is read
   fresh from the synth on every access, so a bare assignment can never pin
   them (unless a bound name shadows them, see below);
2. **bound names / persistent scope** — names bound with `bind`/`bindLive` and
   bare assignments (`x = 5`) survive re-evaluation;
3. **synth** — DSL functions and state (`osc`, `time`, `s0`…, `o0`…, extra buffers `s6`, custom transforms);
4. **`globalThis`** — browser globals (`Math`, `document`, …).

Functions pulled off the synth are re-bound to it; browser globals are wrapped so host functions (`setTimeout`, …) keep the right `this`. This is **not a sandbox** — user code has full page access.

## Binding values

`HydraContext` exposes `bind`, `bindLive` and `unbind` for the persistent scope.
A bound name is looked up directly in the scope and, crucially, wins over the
live engine read — that's how you can override `time`, `width`, `height`, … or
feed external values into a sketch without touching `globalThis`. The custom
element delegates its public binding methods to the same context. Because a
live getter is re-read on every access, bound values stay responsive across
frames without re-evaluating the scene. A sketch can overwrite a binding with a
bare assignment; assigning to a live binding replaces the getter, and
re-binding restores it.

## Evaluation vs. extensions

Extensions load through `el.loadScript(url)` (or bare `loadScript(url)` inside a sketch), routed through `src/script.js`: it **fetches and evaluates** the script inside the element's scope under a transient bridge from `HydraContext.withBridge` — so self-registering extensions (`setFunction`, …) can reach the engine — falling back to the engine's `script`-tag loader when the fetch fails. This keeps `window` clean after the load. The `global` attribute instead publishes the engine surface persistently via `publishHydraGlobals` (imported from `hydra-context`).

> Extensions that spawn their own UI (MIDI monitor, audio analyzer, p5/Tone canvas, …) append it to `document.body`, **outside** the element's shadow DOM, and expose their API on `window`. They are global by nature and can overlap or collide across multiple isolated elements.
