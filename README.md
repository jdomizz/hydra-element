# \<hydra-element>

Create generative visuals with [Hydra](https://hydra.ojack.xyz/) directly in your web pages.

`hydra-element` lets you embed Hydra scenes in HTML with a single tag. Each element runs independently, so you can have multiple visuals on the same page without conflicts.

## Quick Start

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>

<hydra-element> osc(10, 0.2, 0.5).out() </hydra-element>
```

That's it. Open that HTML in your browser and you'll see an oscillator running.

### Multiple visuals

You can have several independent scenes on the same page:

```html
<hydra-element style="width: 50%; height: 50vh; display: inline-block">
  osc(30, 0.1, 1).out()
</hydra-element>

<hydra-element style="width: 50%; height: 50vh; display: inline-block">
  noise(5, 0.3).out()
</hydra-element>
```

Each `<hydra-element>` has its own Hydra engine, so there are no conflicts between them.

## Installation

### CDN (recommended)

Add this line to your HTML and you're good to go:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>
```

### With npm

If you're using a bundler or framework:

```sh
npm install hydra-element
```

```js
import 'hydra-element'
```

## Examples

### Load an image or video

```html
<hydra-element>
  s0.initImage("https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg") src(s0).osc(10,
  0.1, 0.5).out()
</hydra-element>
```

### React to audio

Enable the microphone with the `audio` attribute:

```html
<hydra-element audio="true"> osc(10, 0, () => a.fft[0] * 4).out() </hydra-element>
```

To hide the audio analyzer UI:

```css
hydra-element::part(analyzer) {
  display: none;
}
```

### Use camera and screen

```html
<hydra-element> s0.initCam() s1.initScreen() src(s0).blend(src(s1)).out() </hydra-element>
```

### Update code dynamically

If you need to change the scene from JavaScript:

```js
document.querySelector('hydra-element').code = 'osc().out()'
```

## Styling with CSS

Use regular CSS to style the element:

```css
hydra-element {
  width: 400px;
  height: 400px;
}
```

Or use the `width` and `height` attributes:

```html
<hydra-element width="400" height="400"></hydra-element>
```

### Canvas sizing

The canvas resolution automatically follows the element's CSS size via ResizeObserver. If you set explicit `width`/`height` attributes, those take precedence over the observer.

### CSS parts

Style internal canvases using CSS parts:

```css
/* Style the main canvas */
hydra-element::part(canvas) {
  border: 2px solid red;
  image-rendering: pixelated;
}

/* Hide the audio analyzer */
hydra-element::part(analyzer) {
  display: none;
}
```

## Configuration

### More buffers (sources and outputs)

By default you get 4 source buffers (`s0`-`s3`) and 4 output buffers (`o0`-`o3`). If you need more:

```html
<hydra-element sources="8" outputs="8">
  s0.initCam() s6.initImage('https://example.com/image.jpg')
  s7.initVideo('https://example.com/video.mp4') src(s0).blend(src(s6)).blend(src(s7)).out()
</hydra-element>
```

### Loading third-party libraries with `loadScript`

`loadScript(url)` loads a third-party library so you can use it in your scene (e.g. p5, three, or custom shader libraries). It works in **both** global and isolated (non-global) modes:

```html
<hydra-element>
  await
  loadScript("https://cdn.statically.io/gl/metagrowing/extra-shaders-for-hydra/main/lib/lib-noise.js")
  warp().out()
</hydra-element>
```

> **Warning:** Loaded scripts run with full page privileges — they are not sandboxed. Only load scripts you trust. This is separate from the eval sandboxing note below.

`loadScript` also transiently exposes this element's Hydra surface on `window` while the script loads, so extension scripts that assume the Hydra globals (bare `setFunction(...)`, `window._hydra`, `window.synth`) can self-register. The previous `window` state is restored once the script finishes loading. Outside of `loadScript` calls, the element never touches `window` in non-global mode — multiple `<hydra-element>` on one page stay isolated from each other.

### Community Extensions

`hydra-element` is compatible with the [Hydra extensions ecosystem](https://github.com/hydra-synth/hydra-extensions). All DSL functions (`setFunction()`, `osc()`, `solid()`, etc.) work directly inside the code without needing the `synth.` prefix.

#### metagrowing/extra-shaders-for-hydra

Add noise, patterns, and color filters:

```html
<hydra-element>
  await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js") turb(3, 0, () =>
  6 * ((0.5 * time) % 1.0)).out(o0)
</hydra-element>
```

Other extensions: `lib-pattern.js`, `lib-color.js`, `lib-softpattern.js`, `lib-screen.js`

#### geikha/hyper-hydra

Extended source functions with aspect ratio handling:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-src.js")
  srcAbs(s0).out()
</hydra-element>
```

Other extensions: `hydra-wrap.js`, `hydra-blend.js`, `hydra-arithmetics.js`, `hydra-text.js`

#### arnoson/hydra-midi

Control visuals with MIDI devices:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/npm/hydra-midi@latest/dist/index.js") await
  midi.start() osc(30, .01).invert(note('C4')).out()
</hydra-element>
```

#### atfornes/Hydra-strudel-extension

Synchronize visuals with Strudel audio patterns:

```html
<hydra-element>
  await
  loadScript("https://cdn.jsdelivr.net/gh/atfornes/Hydra-strudel-extension@latest/hydra-strudel.js")
  await initHydraStrudel() shape(P("3 <4 5> 6 7>")).out(o0)
</hydra-element>
```

#### p5.js

Use p5.js for creative coding alongside Hydra:

```html
<hydra-element>
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js") // p5.js is now
  available as window.p5 osc().out()
</hydra-element>
```

#### Custom GLSL functions with `setFunction()`

Add your own GLSL functions directly in the code:

```html
<hydra-element>
  setFunction({ name: 'myNoise', type: 'src', inputs: [ { type: 'float', name: 'scale', default: 5
  }, { type: 'float', name: 'offset', default: 0.5 } ], glsl: `return
  vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);` }) myNoise(10, 0.2).out()
</hydra-element>
```

You can also access the synth instance via `synth.setFunction()` or `window.synth.setFunction()` if needed.

### Global mode

By default, each element has its own isolated scope. `loadScript` bridges the Hydra globals **transiently** while a script loads — that covers every extension in the Community Extensions section above. If you need the Hydra globals to stay on `window` permanently (e.g. extensions whose callbacks read `window._hydra` lazily after `loadScript` resolves, or page-level scripts that expect the globals to be there before any `loadScript` runs), opt into global mode:

```html
<hydra-element global="true"> osc(10, 0.2, 0.5).out() </hydra-element>
```

In global mode, `_hydra`, `synth`, and the DSL functions stay on `window` for the element's lifetime.

> **Warning:** You can only have one element with `global="true"` per page. With multiple elements, the last-initialized one wins.

### Advanced synth access

If you need full control over Hydra, access the synth instance:

```js
const el = document.querySelector('hydra-element')

// Initialize sources
el.synth.s0.initCam()
el.synth.s1.initScreen()

// Change BPM
el.synth.bpm = 120

// Access time
console.log(el.synth.time)

// Change resolution
el.synth.setResolution(800, 600)

// Add custom GLSL functions
el.synth.setFunction({
  name: 'myNoise',
  type: 'src',
  inputs: [
    { type: 'float', name: 'scale', default: 5 },
    { type: 'float', name: 'offset', default: 0.5 },
  ],
  glsl: `return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);`,
})

// Load an extension script from page JS (same transient-bridge behavior
// as the in-code loadScript)
await el.loadScript('https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-src.js')
```

### Events

You can listen for when Hydra is ready or when code is evaluated:

```js
const el = document.querySelector('hydra-element')

el.addEventListener('hydra-ready', e => {
  console.log('Hydra initialized:', e.detail.synth)
})

el.addEventListener('hydra-eval', e => {
  if (e.detail.success) {
    console.log('Code executed successfully')
  } else {
    console.error('Error:', e.detail.error)
  }
})
```

Or use the `ready` promise (safe to await even after connection):

```js
const { synth } = await el.ready
```

## API Reference

### Attributes

| Attribute   | Type    | Default    | Description                                                                     |
| ----------- | ------- | ---------- | ------------------------------------------------------------------------------- |
| `width`     | number  | CSS width  | Canvas width in pixels (takes precedence over ResizeObserver)                   |
| `height`    | number  | CSS height | Canvas height in pixels (takes precedence over ResizeObserver)                  |
| `audio`     | boolean | `false`    | Enable microphone input                                                         |
| `loop`      | boolean | `true`     | Enable animation loop (the element manages its own RAF loop, not hydra-synth's) |
| `global`    | boolean | `false`    | Make Hydra functions global                                                     |
| `sources`   | number  | `4`        | Number of source buffers                                                        |
| `outputs`   | number  | `4`        | Number of output buffers                                                        |
| `precision` | string  | `null`     | Shader precision: `highp`, `mediump`, or `lowp` (`null` = hydra-synth default)  |

### Properties

| Property    | Type              | Description                                                                                                              |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `code`      | string            | Get or set the scene code                                                                                                |
| `canvas`    | HTMLCanvasElement | Custom canvas element to render on. Setting this property recreates the Hydra instance and re-evaluates the code.        |
| `synth`     | HydraSynth        | Read-only access to the synth instance                                                                                   |
| `ready`     | Promise           | Resolves with `{ synth }` when Hydra is initialized; always reflects the live synth                                      |
| `destroy()` | method            | Full teardown — stops the loop, destroys the synth, removes analyzer canvases. Element can be re-added to re-initialize. |

### Events

| Event                  | Detail                | Description                                                  |
| ---------------------- | --------------------- | ------------------------------------------------------------ |
| `hydra-ready`          | `{ synth }`           | Fired when Hydra is initialized                              |
| `hydra-eval`           | `{ success, error? }` | Fired after code evaluation                                  |
| `hydra-element-resize` | `{ width, height }`   | Fired when the canvas backing-store resolution changes       |
| `hydra-context-lost`   | —                     | Fired when the WebGL context for the internal canvas is lost |

## DOM manipulation

You can move `<hydra-element>` around in the DOM without losing state. The element initializes once when first connected and won't re-initialize if moved:

```js
const el = document.querySelector('hydra-element')
const newParent = document.createElement('div')
document.body.appendChild(newParent)
newParent.appendChild(el) // Safe — no re-initialization
```

To tear down an element without removing it from the DOM, call `el.destroy()`. This stops the loop, destroys the Hydra instance, and removes analyzer canvases. If you re-add the element to the DOM afterward, it will re-initialize fresh.

## Limitations

### WebGL context limit

Each `<hydra-element>` creates its own WebGL context. Browsers typically allow ~16 WebGL contexts before older ones are lost. If you need more than ~12 elements on a page, you may hit this limit. There's no workaround within this library — it's a browser constraint.

### Audio isolation

When using `audio="true"` on multiple elements, they share the same `AudioContext` internally. This usually works fine, but if you need truly isolated audio processing per element, you'll need to manage `AudioContext` instances manually via the `synth` property.

### Eval security

The code evaluation uses `new Function()` + `with(proxy)` to provide Hydra DSL syntax. **This is not a sandbox.** User code has full access to browser globals (`document`, `localStorage`, `fetch`, etc.). Only evaluate trusted code. If you need to run untrusted code, use a proper sandbox like an iframe with a separate origin.

## For developers

If you want to contribute or modify the project:

```sh
npm install
npm run dev     # Dev server with hot reload
npm test        # Run tests
npm run build   # Generate distribution bundle
npm run lint    # Lint code
npm run format  # Format code
```

## Credits

- [Olivia Jack](https://ojack.xyz/) for creating Hydra
- The Hydra community for making this so much fun

## License

GNU Affero General Public License (AGPL-3.0-or-later)
