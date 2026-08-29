# 🍬 \<hydra-element>

A custom element for wrapping the [hydra-synth](https://github.com/hydra-synth/hydra-synth) engine.

## Rationale

[Hydra](https://hydra.ojack.xyz/) is a video synth and coding environment that runs in the browser. It stands out for its elegant DSL, modeled on a fluent interface.

This project aims to simplify the render of Hydra scripts in HTML documents embedding [hydra-synth](https://github.com/hydra-synth/hydra-synth) (Hydra's video synthesizer and shader compiler) in a [custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

By default each `hydra-element` contains its own `hydra-synth` (with its own sources, functions and outputs). In this way, several elements can be used in the same HTML document without collisions.

## Installation

This package is published in the [npm](https://www.npmjs.com/) registry as `hydra-element`. You can load it via CDN (the easiest way) or install it with a package manager.

### CDN

Load the custom element via CDN adding the following script to your HTML file.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/hydra-element"></script>
```

### Package

Install the package from [npm](https://docs.npmjs.com/cli/commands/npm) with the following command.

```sh
npm install hydra-element
```

Once you’ve done that, import the custom element in your JavaScript module.

```js
import 'hydra-element'
```

### Standalone eval (without custom element)

If you only need isolated eval for multi-instance hydra-synth setups (without the custom element), import just the `hydraEval` function:

```js
import { hydraEval } from 'hydra-element/eval'
```

This is useful for projects that manage their own hydra-synth instances and need per-instance code isolation without polluting the global scope. See [Advanced usage](#advanced-usage) for examples.

## Usage

Include your code between the element tags.

```html
<hydra-element>
  s0.initImage("https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg") osc(30, 0.01,
  1) .mult(osc(() => 100 * Math.sin(time * 0.1), -0.1, 1).modulate(noise(3, 1)).rotate(0.7))
  .blend(src(s0)) .posterize([3, 10, 2].fast(0.5).smooth(1)) .modulateRotate(o0, () => mouse.x *
  0.003) .out()
</hydra-element>
```

If you need to update the code, use the `code` property with JavaScript.

```js
document.querySelector('hydra-element').code = 'osc().out()'
```

Finally, use CSS to style the element.

```css
hydra-element {
  width: 15rem;
  height: 15rem;
  color: white;
}
```

You can see and remix a live example [here](https://glitch.com/edit/#!/hydra-element).

## Configuration

By default the embedded `hydra-synth` engine is created with these settings:

```js
canvas: null,
width: window.innerWidth,
height: window.innerHeight,
autoLoop: true,
makeGlobal: false,
detectAudio: false,
numSources: 4,
numOutputs: 4,
extendTransforms: [],
precision: null,
pb: null,
useAudioAnalyzer: true
```

You can use the following attributes and properties to configure these options. Read the `hydra-synth` [API](https://github.com/hydra-synth/hydra-synth#api) documentation for more information.

### Attributes `width` and `height`

In addition to the engine, the custom element also takes care of the canvas. By default it creates one the size of the window, which is useful for many cases. If this is not yours, you can use the `width` and `height` attributes to modify the canvas size.

```html
<hydra-element width="250" height="250"></hydra-element>
```

### Property `canvas`

If you prefer to take care of the canvas yourself, use the `canvas` property to specify a canvas element to render on. In this case the component does not create any canvas but uses the assigned one.

```js
document.querySelector('hydra-element').canvas = yourCanvasElement
```

### Attribute `loop`

If you want to use your own render loop for triggering Hydra updates, set the `loop` attribute to `false`.

```html
<hydra-element loop="false"></hydra-element>
```

Note you will need to call the `tick` method, where `dt` is the time elapsed in milliseconds since the last update.

```js
document.querySelector('hydra-element').tick(dt)
```

### Attribute `global`

If you set the `global` attribute to `true` all sources, functions and outputs of the synthesizer will be stored in the `window` object, so they will be directly available.

```html
<hydra-element global="true">
  await
  loadScript("https://cdn.statically.io/gl/metagrowing/extra-shaders-for-hydra/main/lib/lib-noise.js")
  warp().out()
</hydra-element>
```

> **Warning**
> You must not use more than one `hydra-element` with `global` set to `true` in the same HTML document.

**Note:** `loadScript` is now available in both global and non-global modes. You can load external libraries without polluting the global scope.

### Property `synth`

The `synth` property provides read-only access to the hydra-synth instance for advanced use cases:

```js
const el = document.querySelector('hydra-element')

// Access sources and outputs
el.synth.s0.initCam()
el.synth.o1 // output buffer

// Access dynamic properties
el.synth.time
el.synth.bpm = 120

// Advanced methods
el.synth.setFunction({ name: 'custom', type: 'src', ... })
el.synth.setResolution(800, 600)
```

### Events

The element dispatches custom events for lifecycle hooks:

```js
const el = document.querySelector('hydra-element')

// Fired when hydra is initialized
el.addEventListener('hydra-ready', e => {
  console.log('Hydra initialized:', e.detail.synth)
})

// Fired after code evaluation
el.addEventListener('hydra-eval', e => {
  if (e.detail.success) {
    console.log('Code evaluated successfully')
  } else {
    console.error('Eval failed:', e.detail.error)
  }
})
```

### Attribute `audio`

Hydra's audio capabilities are disabled by default because they require requesting microphone permissions and not all scripts use them, so don't forget to set the `audio` attribute to `true` if you use the `a` object in your script.

```html
<hydra-element audio="true"> a.show() osc(10, 0, () => a.fft[0] * 4).out() </hydra-element>
```

### Attribute `analyzer`

You can use the `analyzer` attribute if you need to disable the Hydra audio analyzer UI.

```html
<hydra-element audio="true" analyzer="false"></hydra-element>
```

### Attribute `sources`

You can use the `sources` attribute to set the number of source buffers available for multimedia resources. The default value is `4`. Extra buffers (s4-s7) are available directly in your code.

```html
<hydra-element sources="8">
  s0.initCam() s1.initScreen()
  s6.initImage('https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg')
  s7.initVideo('https://media.giphy.com/media/AS9LIFttYzkc0/giphy.mp4') src(s0) .blend(src(s1))
  .blend(src(s6)) .blend(src(s7)) .out()
</hydra-element>
```

### Attribute `outputs`

You can use the `outputs` attribute to set the number of output buffers to use. The default value is `4`. Extra buffers (o4-o7) are available directly in your code.

```html
<hydra-element outputs="8"> osc().out(o7) render(o7) </hydra-element>
```

> **Warning**
> Note that `hydra-synth` itself has only been tested with `4` outputs, so use this attribute with caution.

### Attribute `precision`

You can use the `precision` attribute to force precision of shaders. By default no precision is specified, so the engine will use `highp` for iOS and `mediump` for everything else. Avaiblable options are `highp`, `mediump` and `lowp`.

```html
<hydra-element precision="highp"></hydra-element>
```

### Property `transforms`

You can add custom GLSL functions setting the `transforms` property with JavaScript.

```js
document.querySelector('hydra-element').transforms = [
  {
    name: 'yourNoise',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 5 },
      { type: 'float', name: 'offset', default: 0.5 },
    ],
    glsl: `return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);`,
  },
]
```

Once done, you can use the new functions in your script directly.

```html
<hydra-element> yourNoise().out() </hydra-element>
```

### Property `pb`

If you have access to an instance of `rtc-patch-bay` for streaming, you can assign it to the `pb` property with JavaScript.

```js
document.querySelector('hydra-element').pb = yourRtcPatchBayInstance
```

## Advanced usage

### Multi-instance hydra-synth with `hydraEval`

If you're building a tool that needs multiple hydra-synth instances (e.g., a VJ app with multiple outputs, a split-screen visualizer, or a live coding environment with independent scenes), you can use `hydraEval` to evaluate code in an isolated scope per instance:

```js
import Hydra from 'hydra-synth'
import { hydraEval } from 'hydra-element/eval'

// Create multiple hydra instances, all with makeGlobal: false
const canvas1 = document.getElementById('canvas1')
const canvas2 = document.getElementById('canvas2')

const hydra1 = new Hydra({ canvas: canvas1, makeGlobal: false, autoLoop: false })
const hydra2 = new Hydra({ canvas: canvas2, makeGlobal: false, autoLoop: false })

// Evaluate code in each instance's isolated scope
hydraEval('osc(10, 0.5, 0.1).out()', hydra1.synth)
hydraEval('noise(5, 0.3).out()', hydra2.synth)

// Each instance has its own time, bpm, sources, outputs
hydraEval('bpm = 120', hydra1.synth)
hydraEval('bpm = 90', hydra2.synth)

// Manual tick loop
function loop() {
  hydra1.tick(16)
  hydra2.tick(16)
  requestAnimationFrame(loop)
}
loop()
```

This approach:

- **No global pollution**: each instance's `osc`, `noise`, `s0`, `o0`, etc. are isolated
- **No `rebindSynthGlobals` hacks**: the Proxy-based eval resolves properties per-instance
- **Works with `loadScript`**: inject it into the context if needed:
  ```js
  const context = { ...hydra.synth, loadScript: url => import(url) }
  hydraEval(code, context)
  ```

## Limitations

- It is not possible to work with [p5.js](https://p5js.org) as in the Hydra web editor. However, you can load p5.js via `loadScript` and create a canvas manually:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.min.js") const p5Canvas =
  document.createElement('canvas') document.body.appendChild(p5Canvas) new p5((p) => { p.setup = ()
  => p.createCanvas(400, 400, p.WEBGL, p5Canvas) p.draw = () => { p.background(220) p.ellipse(0, 0,
  100, 100) } }) s0.init({ src: p5Canvas }) src(s0).out()
</hydra-element>
```

## Development

This project uses [Vite](https://vitejs.dev/) for development and [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) for testing. The following `npm` scripts are available:

- `dev`: serves `index.html` for _development_ (reloading on file changes)
- `test`: runs the test suites in a headless chrome
- `build`: bundles the custom element for _distribution_ (in the `dist` directory)

## Credits

- [Naoto Hieda](https://naotohieda.com/) for improving the usability of the custom element 🪄
- [Olivia Jack](https://ojack.xyz/) for creating such a fun tool as Hydra 🌈
- The Hydra community for turning the tool into something even more fun 🧩

## License

Distributed under the GNU Affero General Public License.
