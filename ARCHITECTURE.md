# Architecture

`<hydra-element>` is a Web Component that owns its own [`hydra-synth`](https://github.com/hydra-synth/hydra-synth) engine, canvas, render loop and evaluation scope. Each instance is **isolated** by default (`makeGlobal: false`), so many elements can coexist on a page.

Two deliberate choices shape everything else:

- the engine is created with `autoLoop: false` — **the element owns the render loop**, so re-initializing an element never leaks a phantom `requestAnimationFrame`;
- the element owns a **persistent eval scope** — bare assignments survive engine resets, which is what live-coding expects.

## Big picture

```
index.js ── registers <hydra-element> + the injected engine factory
   │
   ▼
src/element.js ── HydraElement (the custom element)
   │   owns: engine · canvas · loop · eval scope · attributes · events
   │
   ├─▶ src/eval.js    hydraEval (+userCodeLine, bind*Scope) — the with + Proxy scope
   ├─▶ src/canvas.js  CanvasManager — canvas, ResizeObserver, ::part
   ├─▶ src/loop.js    Loop — requestAnimationFrame
   ├─▶ src/queue.js   EvalQueue — serialized evals
   ├─▶ src/globals.js publishHydraGlobals — transient loadScript bridge
   └─▶ src/parser.js parseNumber / parseJSON / parseOption
   │
   ▼
hydra-synth (peer) — built through the factory, driven by the element
```

Everything is plain JS in one flat `src/` tree — no layer split. Imports flow one
way (`index → element → helpers`), and `hydra-synth` is imported only in
`element.js`'s factory.

## Module map

| File | Responsibility |
| --- | --- |
| `index.js` | Entry point. Registers `<hydra-element>` and re-exports `HydraElement`. |
| `src/element.js` | `HydraElement` — the custom element. Owns the lifecycle, observed attributes, events, the engine, the loop and the eval scope. |
| `src/context.js` | The `hydra-element/context` subpath — `createContext` + `loadScript` + re-export `hydraEval`/`userCodeLine` (headless, no DOM). |
| `src/eval.js` | `hydraEval` + `createScopeProxy` — evaluates code with a `with(scope)` + `Proxy` scope; `bindScope`/`bindLiveScope`/`unbindScope` — per-scope value binding; `userCodeLine` maps error lines. |
| `src/canvas.js` | `CanvasManager` — internal canvas, `ResizeObserver` (+ DPR) sizing, `::part` exposition. |
| `src/loop.js` | `Loop` — the `requestAnimationFrame` loop (the engine is created with `autoLoop: false`). |
| `src/queue.js` | `EvalQueue` — serializes evaluations so async sketches can't interleave. |
| `src/globals.js` | `publishHydraGlobals` — transiently publishes the engine surface on `window` while an extension loads. |
| `src/parser.js` | Pure attribute parsing (`parseNumber`, `parseJSON`, `parseOption`). |

The build yields two artifacts: `dist/hydra-element.js` (the DOM element) and
`dist/context.js` (the headless context), exposed as `exports` `"."` and
`"./context"` respectively.

## Data flow

```
el.code = "..." ──▶ EvalQueue ──▶ hydraEval ──▶ (async function(){ with(scopeProxy) { code } })()
                         │                          │
                         │                    get(foo): scope → synth → globalThis
                         │                    set(foo): scope (+ mirror speed/bpm/… to synth)
                         │
                    hydra-eval event ──▶ { success, error?, line? }
```

## Evaluation model

Identifiers inside a sketch resolve through the scope `Proxy` in this order:

1. **live engine read** — for the engine-owned live names (`time`, `width`,
   `height`, `speed`, `bpm`, `update`, `afterUpdate`, `fps`) the value is read
   fresh from the synth on every access, so a bare assignment can never pin
   them (unless a bound name shadows them, see below);
2. **bound names / persistent scope** — names bound with `bind`/`bindLive` and
   bare assignments (`x = 5`, `var`) survive re-evaluation;
3. **synth** — DSL functions and state (`osc`, `time`, `s0`…, `o0`…, extra buffers `s6`, custom transforms);
4. **`globalThis`** — browser globals (`Math`, `document`, …).

Functions pulled off the synth are re-bound to it; browser globals are wrapped so host functions (`setTimeout`, …) keep the right `this`. This is **not a sandbox** — user code has full page access.

## Binding values

`bindScope` / `bindLiveScope` / `unbindScope` in `eval.js` attach a value or a
live getter to a scope and mark the name as bound. A bound name is looked up
directly in the scope and, crucially, wins over the live engine read — that's
how you can override `time`, `width`, `height`, … or feed external values into
a sketch without touching `globalThis`. The custom element and the headless
context expose the same trio as `el.bind`/`el.bindLive`/`el.unbind` and
`context.bind`/`context.bindLive`/`context.unbind`. Because a live getter is
re-read on every access, bound values stay responsive across frames without
re-evaluating the scene.

## Evaluation vs. extensions

Extensions load through `el.loadScript(url)` (or bare `loadScript(url)` inside a sketch) which **fetches and evaluates** the script inside the element's scope, with a transient `window` bridge (`publishHydraGlobals`) so self-registering extensions (`setFunction`, …) can reach the engine. This keeps `window` clean after the load.

> Extensions that spawn their own UI (MIDI monitor, audio analyzer, p5/Tone canvas, …) append it to `document.body`, **outside** the element's shadow DOM, and expose their API on `window`. They are global by nature and can overlap or collide across multiple isolated elements.
