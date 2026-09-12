# \<hydra-element>

Create generative visuals with [Hydra](https://hydra.ojack.xyz/) in your web pages.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>

<hydra-element> osc(10, 0.2, 0.5).out() </hydra-element>
```

That's it. Write Hydra code between the tags, you're live. Each element runs its
own engine — several on one page don't interfere.

[Try the playground](https://jdomizz.github.io/hydra-element/playground/) — four live elements in one page.

## Install

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>
```

or

```sh
npm install hydra-element
```

```js
import 'hydra-element'
```

## Write code

The full Hydra DSL works between the tags — `osc()`, `noise()`, `solid()`,
`setFunction()`, sources `s0`–`s3`, outputs `o0`–`o3`, `time`, `bpm`, `speed`.
No `synth.` prefix.

```html
<hydra-element> noise(3, 0.1).color(0.5, 0.5, 0.5).out() </hydra-element>
```

Change the scene from JS:

```js
document.querySelector('hydra-element').code = 'osc().out()'
```

Or wait for it to be ready and drive the synth directly:

```js
const el = document.querySelector('hydra-element')
const { synth } = await el.ready
synth.s0.initCam()
synth.bpm = 120
```

## Attributes

| Attribute             | Default | What it does                                   |
| --------------------- | ------- | ---------------------------------------------- |
| `width` / `height`    | CSS     | Canvas size in pixels (overrides the CSS size) |
| `audio`               | `false` | Enable microphone input                        |
| `loop`                | `true`  | Run the animation loop                         |
| `global`              | `false` | Keep Hydra globals on `window` permanently     |
| `sources` / `outputs` | `4`     | Number of source/output buffers (max 16)       |
| `precision`           | `null`  | Shader precision: `highp`, `mediump`, `lowp`   |

## Patterns

Camera + screen blend:

```html
<hydra-element> s0.initCam() s1.initScreen() src(s0).blend(src(s1)).out() </hydra-element>
```

Audio reactivity:

```html
<hydra-element audio="true"> osc(10, 0, () => a.fft[0] * 4).out() </hydra-element>
```

Custom GLSL:

```html
<hydra-element>
  setFunction({ name: 'myNoise', type: 'src', inputs: [{ type: 'float', name: 'scale', default: 5
  }], glsl: `return vec4(vec3(_noise(vec3(_st*scale, time))), 0.5);` }) myNoise(10).out()
</hydra-element>
```

Drive the loop yourself (`loop="false"`):

```js
const { synth } = await el.ready
function frame() {
  synth.tick(16)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
```

## Extensions

Load any Hydra extension with `loadScript` inside your code:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/npm/hydra-midi@latest/dist/index.js") midi.start()
  osc(30, .01).invert(note('C4')).out()
</hydra-element>
```

`loadScript` briefly publishes the element's Hydra on `window` while the script
loads (so bare `setFunction(...)` and `window._hydra` work), then restores the
page. Only load scripts you trust.

## Styling

Size it with CSS — `width`/`height` attributes win when both are set.

```css
hydra-element {
  width: 400px;
  height: 400px;
}
```

Two CSS parts to style the internals:

```css
hydra-element::part(canvas) {
  image-rendering: pixelated;
}
hydra-element::part(analyzer) {
  display: none;
}
```

Code between the tags can flash as raw text before the element upgrades — the
library injects a guard. For zero flash on first paint, add
`body hydra-element:not(:defined){display:none}` to your `<head>`.

## API

### Properties

| Property          | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `code`            | Get/set the scene code (setting evaluates it)               |
| `ready`           | `Promise<{ synth }>` — resolves when Hydra is initialized   |
| `synth`           | The hydra-synth instance (`el.synth.s0`, `el.synth.bpm`, …) |
| `canvas`          | Adopt a custom `<canvas>` to render on                      |
| `transforms`      | Custom GLSL functions, re-applied after synth resets        |
| `loadScript(url)` | Load an extension with the transient globals bridge         |
| `destroy()`       | Tear down without removing from the DOM; re-add to restart  |

### Events

| Event                  | Detail                       | When                        |
| ---------------------- | ---------------------------- | --------------------------- |
| `hydra-ready`          | `{ synth }`                  | Hydra initialized           |
| `hydra-eval`           | `{ success, error?, line? }` | After every code evaluation |
| `hydra-element-resize` | `{ width, height }`          | Canvas resolution changed   |
| `hydra-context-lost`   | —                            | WebGL context lost          |

```js
el.addEventListener('hydra-eval', e => {
  if (!e.detail.success) console.error(`line ${e.detail.line}:`, e.detail.error)
})
```

## Drive hydra yourself

Skip the tag and drive a bare `hydra-synth` with `hydra-element/context`:

```js
import Hydra from 'hydra-synth'
import { createContext } from 'hydra-element/context'

const hydra = new Hydra({ canvas, makeGlobal: false }) // nothing lands on window
const context = createContext(hydra.synth)

await context.eval('osc().out()')
await context.eval('x = 5')
await context.eval('osc(x)') // x persists, still isolated

context.scope.y = 2 // seed a value before eval
await context.eval('osc(y)')
```

`createContext` keeps a scope, so bare assignments persist across evals —
isolated from `window` and the synth. Need the raw one-shot or error lines?
`hydraEval(code, synth, scope?)` and `userCodeLine(error, code)` are exported too.

## Limitations

- **~16 WebGL contexts per browser** — ~12+ elements on one page may hit it.
- **Not a sandbox** — evaluated code has full page access. Only run code you trust.
- **`global="true"`** — one element per page; the last initialized wins.

## License

[AGPL-3.0-or-later](./LICENSE). Built on [hydra-synth](https://hydra.ojack.xyz/) by [Olivia Jack](https://ojack.xyz/).
