# 🍬 \<hydra-element>

A DOM-native Web Component for the Hydra visual synthesizer.

![image](/image.png)

Create generative visuals with [Hydra](https://hydra.ojack.xyz/) in any HTML page.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>

<hydra-element>osc(10, 0.2, 0.5).out()</hydra-element>
```

That's it — write Hydra code between the tags and you're live. Each element runs
its own engine, so several on one page don't interfere.

## Demo

Want to poke around? Open the [CodePen demo](https://codepen.io/editor/jdomizz/pen/01a0d310-226b-78dc-b5b1-cb56f2ad4150), or run the local playground (`pnpm dev`) for a sketch gallery.

## Install

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>
```

or

```sh
npm install hydra-element   # or pnpm / yarn
```

```js
import 'hydra-element'
```

The class is also exported if you need it directly:

```js
import { HydraElement } from 'hydra-element'
```

## Write code

The full Hydra DSL works between the tags (`osc()`, `noise()`, `solid()`,
`setFunction()`, sources `s0`–`s3`, outputs `o0`–`o3`, `time`, `bpm`, `speed`,
`mouse`) — no `synth.` prefix needed. `await` works too, so async sources and
`loadScript(...)` are supported.

```html
<hydra-element>
  osc(30, 0.01, 1)
    .mult(osc(() => 100 * Math.sin(time * 0.1), -0.1, 1).modulate(noise(3, 1)).rotate(0.7))
    .blend(src(s0))
    .posterize([3, 10, 2].fast(0.5).smooth(1))
    .out()
</hydra-element>
```

Change the scene from JS:

```js
document.querySelector('hydra-element').code = 'osc(20).out()'
```

Or drive the synth directly once it's ready:

```js
const el = document.querySelector('hydra-element')
const { synth } = await el.ready
synth.s0.initImage('...')
synth.bpm = 120
```

> **This is not a sandbox** — code runs in your page, so only evaluate code you trust.

## Binding values

Feed values from your page into the sketch without touching `globalThis`. Bound
names can also shadow the engine's built-ins (`time`, `width`, `speed`, …):

```js
const el = document.querySelector('hydra-element')
const slider = document.querySelector('#freq')

// static — a pinned value; shadows the engine's own `speed` read
el.bind('speed', 1.5)
// live — a getter re-read on every access: moving the slider updates the scene
el.bindLive('freq', () => Number(slider.value))
// remove it; the engine's own `speed` read applies from then on
el.unbind('speed')
```

```html
<hydra-element>osc(() => freq, 0.1, speed).out()</hydra-element>
<input id="freq" type="range" min="1" max="120" value="30">
```

Parameters only re-evaluate per frame when passed as functions: `osc(freq, …)`
pins, `osc(() => freq, …)` stays live. A sketch can override a binding with a
bare assignment; `bind`/`bindLive` restores it.

## Attributes

| Attribute | Default | What it does |
| --- | --- | --- |
| `width` / `height` | CSS | Canvas backing size in pixels (overrides the CSS size). |
| `dpr` | `2` | Cap for the device-pixel-ratio used by auto-sized canvases. |
| `precision` | default | Shader precision: `highp`, `mediump`, `lowp`. |
| `sources` / `outputs` | `4` | Number of source/output buffers (0–16). Extra buffers are `s4`, `s5`, …. |
| `audio` | `false` | Enable audio analysis (`a.fft`, …) — requests microphone access. |
| `global` | `false` | Keep Hydra globals on `window`. Use **at most one** per document. |
| `loop` | `true` | Whether the element drives its own render loop. |

Auto-sized canvases follow the layout via `ResizeObserver`, scaled by
`min(devicePixelRatio, dpr)`. Changing `width`/`height`/`dpr` resizes in place.

Turn `loop` off and drive frames yourself with `tick`:

```html
<hydra-element loop="false"></hydra-element>
```

```js
const el = document.querySelector('hydra-element')
function frame(now) {
  el.tick(now - last)
  last = now
  requestAnimationFrame(frame)
}
```

You can toggle `loop` at runtime too — it starts/stops the loop without
recreating the engine.

## API

| Member | Type | Description |
| --- | --- | --- |
| `code` | get/set | The scene source. Setting it (re)evaluates the sketch. |
| `ready` | get (read-only) | `Promise<{ synth }>` that resolves once the engine is initialized. |
| `tick(dt)` | method | Manual frame tick (ms) — used when `loop="false"`. |
| `canvas` | get/set | The backing `<canvas>`. Assign your own to take over rendering. |
| `synth` | get (read-only) | The hydra-synth engine (`el.synth.osc`, `el.synth.s0`, …). |
| `transforms` | get/set | Array of custom GLSL functions (`setFunction` under the hood). |
| `pb` | get/set | An `rtc-patch-bay` instance for streaming (recreates the engine). |
| `scope` | get | The persistent eval scope — bare assignments, bound values, and `_hydra`/`hydraSynth` live here. |
| `bind(name, value)` | method | Binds a static value into the eval scope; wins over live engine-owned reads (`time`, `width`, …). |
| `bindLive(name, fn)` | method | Binds a getter re-read on every access (a sketch assignment replaces it). |
| `unbind(name)` | method | Removes a previously bound value or live getter. |
| `loadScript(url)` | method | Loads an extension script, scoped to this element. |
| `capture()` | method | The next rendered frame as a PNG `Blob` (needs the loop running). |
| `destroy()` | method | Tears the element down in place; also automatic on removal. |

### Capturing frames

```js
const el = document.querySelector('hydra-element')
const blob = await el.capture() // PNG of the next rendered frame
```

## Events

Bubbling `CustomEvent`s dispatched on the element:

| Event | Detail |
| --- | --- |
| `hydra-eval` | `{ success, error?, line? }` — after each `code` assignment. |
| `hydra-ready` | `{ synth }` — after every engine (re)initialization. |
| `hydra-loadscript` | `{ success, url, error? }` — after a `loadScript(url)` call (rethrows on failure). |
| `hydra-element-resize` | `{ width, height }` — when the canvas backing store resizes. |

```js
el.addEventListener('hydra-eval', e => {
  if (!e.detail.success) console.error(e.detail.error)
})
```

## Framework integration

`<hydra-element>` is a standard Web Component, so it works in any framework that
supports them. The key bits are its properties (`code`, `synth`, `bind`, …) and
the `hydra-eval` / `hydra-ready` events.

### React

React 19+ maps matching props to properties and custom events to
`onHydraEval` / `onHydraReady`:

```jsx
<hydra-element
  audio="false"
  onHydraEval={e => e.detail.success ? null : console.error(e.detail.error)}
/>
```

React < 19 has no custom-element prop support — drive the element with a ref
(`code`, `bind`, `addEventListener`). Removing the element from the DOM frees
its engine automatically, so no manual cleanup is needed.

### Vue

Vue 3 binds props as properties and listens to events with `@hydra-eval`; set
`isCustomElement` to avoid the "failed to resolve component" warning:

```js
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'hydra-element' } } })
```

### Other frameworks

Solid, Svelte, Angular and Preact render it natively — bind values via the
element's properties and attach the events with the framework's regular syntax.
Removing the element from the DOM frees its engine automatically.

## Styling with `::part`

The internal canvas and the audio analyzer are exposed as CSS parts:

```css
hydra-element::part(canvas) {
  border-radius: 0.5rem;
}

/* hide the audio analyzer overlay */
hydra-element::part(analyzer) {
  display: none;
}
```

## Extensions

Load any Hydra extension with `loadScript` — no `global` attribute needed. The
script is fetched and evaluated inside the element's scope:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

  osc(10,.1,2)
    .mod(gradient().asin().cos())
    .step(noise(2).unipolar().div(o0))
    .blend(o0,.2)
    .out()
</hydra-element>
```

> **Note** — extensions built for the classic single-global editor read
> `window._hydra`, `window.hydraSynth`, `window.update`, etc. Across several
> isolated elements the bridge may resolve to the wrong engine, and anything
> global by nature (UI appended to `document.body`, APIs on `window`) can collide.

## Evaluation context

Evaluation is provided by [`hydra-context`](https://github.com/jdomizz/hydra-context).

## Notes and limitations

- **~16 WebGL contexts per browser** — ~12+ elements on one page may hit it.
- `hydra-synth` itself is only tested with 4 outputs; raise `outputs` with caution.
- **No `p5` wrapper** — the classic editor ships a global `p5`; here load it yourself and `bind` it in.

## Acknowledgements

- [Olivia Jack](https://ojack.xyz/) for creating [Hydra](https://hydra.ojack.xyz/) 🌈
- The Hydra community for the extensions and ecosystem that surround it 🧩

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

[AGPL-3.0-or-later](LICENSE).
