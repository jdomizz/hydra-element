# \<hydra-element>

Create generative visuals with [Hydra](https://hydra.ojack.xyz/) directly in your web pages.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>

<hydra-element> osc(10, 0.2, 0.5).out() </hydra-element>
```

That's it. Drop the tag in, write Hydra code between the tags, you're live.

Multiple `<hydra-element>` on one page each run their own Hydra engine — no conflicts, no shared state.

## Try it

- **[Multi-instance gallery](https://jdomizz.github.io/hydra-element/playground/gallery.html)** — four isolated `<hydra-element>` running simultaneously in one HTML document. The same money shot hydra-synth#44 has been asking for.
- **[Playground](https://jdomizz.github.io/hydra-element/playground/)** — interactive editor with presets, attribute toggles, and a live event log. Edit code, press <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd>.

Source lives in [`playground/`](./playground). Run locally with `pnpm dev` (playground) or `pnpm dev:playground` (both pages).

## Install

CDN (recommended for quick sketches):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>
```

With a bundler:

```sh
npm install hydra-element
```

```js
import 'hydra-element'
```

## Write code

The element runs any Hydra code you put between its tags. The full DSL works directly — `osc()`, `solid()`, `out()`, `setFunction()`, sources (`s0`–`s3`), outputs (`o0`–`o3`), `time`, `bpm`, `speed`. No `synth.` prefix needed.

```html
<hydra-element> noise(3, 0.1).color(0.5, 0.5, 0.5).out() </hydra-element>
```

Update the scene from JavaScript by setting `code`:

```js
document.querySelector('hydra-element').code = 'osc().out()'
```

Or `await el.ready` to get the synth when initialization finishes:

```js
const el = document.querySelector('hydra-element')
const { synth } = await el.ready
synth.s0.initCam()
synth.bpm = 120
```

## Common patterns

### Camera, screen, image, video

```html
<hydra-element> s0.initCam() s1.initScreen() src(s0).blend(src(s1)).out() </hydra-element>
```

### Audio reactivity

```html
<hydra-element audio="true"> osc(10, 0, () => a.fft[0] * 4).out() </hydra-element>
```

To hide the analyzer UI:

```css
hydra-element::part(analyzer) {
  display: none;
}
```

### Custom GLSL with `setFunction`

```html
<hydra-element>
  setFunction({ name: 'myNoise', type: 'src', inputs: [{ type: 'float', name: 'scale', default: 5
  }], glsl: `return vec4(vec3(_noise(vec3(_st*scale, time))), 0.5);` }) myNoise(10).out()
</hydra-element>
```

### React + Vue + Svelte

`<hydra-element>` is a standard custom element — use it like any HTML tag from any framework.

## Community extensions

Hydra has a rich ecosystem of extensions. Load any of them with `loadScript` inside the element's code:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/npm/hydra-midi@latest/dist/index.js") await
  midi.start() osc(30, .01).invert(note('C4')).out()
</hydra-element>
```

Works in both global and isolated mode. `loadScript` transiently publishes this element's Hydra on `window` while the script loads, so scripts that call bare `setFunction(...)` or read `window._hydra` self-register on this element's synth — and `window` returns to its prior state when the load finishes. Multiple elements stay isolated.

A few popular extensions:

- [metagrowing/extra-shaders-for-hydra](https://github.com/metagrowing/extra-shaders-for-hydra) — `turb`, `warp`, `lib-noise`, `lib-pattern`, `lib-color`
- [geikha/hyper-hydra](https://github.com/geikha/hyper-hydra) — `srcAbs`, aspect-ratio aware sources
- [arnoson/hydra-midi](https://github.com/arnoson/hydra-midi) — MIDI control (`midi()`, `note()`, `cc()`)
- [atfornes/Hydra-strudel-extension](https://github.com/atfornes/Hydra-strudel-extension) — sync with Strudel patterns
- p5.js, three.js — any library that registers a global; access it via `window.p5` etc.

> **Warning:** Loaded scripts run with full page privileges. Only load scripts you trust.

## Styling

### Canvas sizing

The canvas automatically follows the element's CSS size. Set explicit dimensions with CSS or the `width`/`height` attributes — attributes win.

```css
hydra-element {
  width: 400px;
  height: 400px;
}
```

```html
<hydra-element width="800" height="600"></hydra-element>
```

### CSS parts

Style internal canvases:

```css
hydra-element::part(canvas) {
  border: 2px solid red;
  image-rendering: pixelated;
}

hydra-element::part(analyzer) {
  display: none;
}
```

## Configuration

| Attribute   | Default | What it does                                       |
| ----------- | ------- | -------------------------------------------------- |
| `width`     | CSS     | Canvas width in pixels (wins over ResizeObserver)  |
| `height`    | CSS     | Canvas height in pixels (wins over ResizeObserver) |
| `audio`     | `false` | Enable microphone input                            |
| `loop`      | `true`  | Run the animation loop                             |
| `global`    | `false` | Keep Hydra globals on `window` permanently         |
| `sources`   | `4`     | Number of source buffers (max 16)                  |
| `outputs`   | `4`     | Number of output buffers (max 16)                  |
| `precision` | auto    | Shader precision: `highp`, `mediump`, or `lowp`    |

Need more than 4 sources/outputs?

```html
<hydra-element sources="8" outputs="8">
  s0.initCam() s6.initImage('https://example.com/image.jpg') src(s0).blend(src(s6)).out()
</hydra-element>
```

### Global mode

By default each element is isolated. `loadScript` already bridges the Hydra globals while a script loads — that's enough for every community extension above. Only opt into `global="true"` if you need the globals to stay on `window` permanently (extensions whose callbacks read `window._hydra` _after_ `loadScript` resolves, or page-level scripts that expect the globals before any `loadScript` runs):

```html
<hydra-element global="true"> osc(10, 0.2, 0.5).out() </hydra-element>
```

> You can only have one element with `global="true"` per page. With multiple elements, the last one initialized wins.

## API reference

### Properties

| Property    | Type              | Description                                                                         |
| ----------- | ----------------- | ----------------------------------------------------------------------------------- |
| `code`      | string            | Get or set the scene code                                                           |
| `canvas`    | HTMLCanvasElement | Adopt a custom canvas to render on                                                  |
| `synth`     | HydraSynth        | Read-only access to the synth instance                                              |
| `ready`     | Promise           | Resolves with `{ synth }` once Hydra is initialized; always reflects the live synth |
| `destroy()` | method            | Tear the element down without removing it from the DOM (re-add to re-initialize)    |

For everything else, use the synth:

```js
const el = document.querySelector('hydra-element')

el.synth.s0.initCam() // init a source
el.synth.bpm = 120 // change BPM
el.synth.setResolution(800, 600) // change resolution
el.synth.setFunction({
  // add a custom GLSL function
  name: 'myNoise',
  type: 'src',
  inputs: [{ type: 'float', name: 'scale', default: 5 }],
  glsl: `return vec4(vec3(_noise(vec3(_st*scale, time))), 0.5);`,
})

await el.loadScript('https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-src.js')
// load an extension from page JS — same transient-bridge behavior as in-code loadScript
```

### Events

| Event                  | Detail                | Description                                            |
| ---------------------- | --------------------- | ------------------------------------------------------ |
| `hydra-ready`          | `{ synth }`           | Fired when Hydra is initialized                        |
| `hydra-eval`           | `{ success, error? }` | Fired after every code evaluation                      |
| `hydra-element-resize` | `{ width, height }`   | Fired when the canvas backing-store resolution changes |
| `hydra-context-lost`   | —                     | Fired when the WebGL context was lost and recovered    |

```js
el.addEventListener('hydra-eval', e => {
  if (!e.detail.success) console.error('Eval error:', e.detail.error)
})
```

### Moving elements in the DOM

Moving `<hydra-element>` around in the DOM does **not** re-initialize it. To tear it down without removing it from the DOM, call `el.destroy()`. Re-add the element afterward to start fresh.

## Limitations

- **WebGL context limit** — browsers allow ~16 WebGL contexts. With ~12+ elements on one page you may hit the limit. Browser constraint, no library workaround.
- **Audio isolation** — `audio="true"` shares a single `AudioContext` across elements. For full per-element isolation, manage `AudioContext` yourself via `el.synth`.
- **Eval security** — user code uses `new Function()` + a Proxy; it's **not a sandbox**. User code has full access to browser globals. Only evaluate code you trust. For untrusted code, use an iframe with a separate origin.

## Where to go next

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — module breakdown, eval proxy, transient bridge, lifecycle, build pipeline. For maintainers.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — dev setup, commands, test strategy, spec workflow, release process. For contributors.
- **[CHANGELOG.md](./CHANGELOG.md)** — what changed in each release.
- **[hydra-synth docs](https://hydra.ojack.xyz/)** — the underlying synth.

## Credits

- [Olivia Jack](https://ojack.xyz/) for creating Hydra
- The Hydra community for making this so much fun

## License

GNU Affero General Public License (AGPL-3.0-or-later)
