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

If you don't want to see the audio analyzer, use `analyzer="false"`:

```html
<hydra-element audio="true" analyzer="false"></hydra-element>
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

## Configuration

### More buffers (sources and outputs)

By default you get 4 source buffers (`s0`-`s3`) and 4 output buffers (`o0`-`o3`). If you need more:

```html
<hydra-element sources="8" outputs="8">
  s0.initCam() s6.initImage('https://example.com/image.jpg')
  s7.initVideo('https://example.com/video.mp4') src(s0).blend(src(s6)).blend(src(s7)).out()
</hydra-element>
```

### Global mode

By default, each element has its own isolated scope. If you want Hydra functions available globally (like in the Hydra editor):

```html
<hydra-element global="true">
  await
  loadScript("https://cdn.statically.io/gl/metagrowing/extra-shaders-for-hydra/main/lib/lib-noise.js")
  warp().out()
</hydra-element>
```

> **Warning:** You can only have one element with `global="true"` per page.

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

## API Reference

### Attributes

| Attribute   | Type    | Default       | Description                                     |
| ----------- | ------- | ------------- | ----------------------------------------------- |
| `width`     | number  | window width  | Canvas width in pixels                          |
| `height`    | number  | window height | Canvas height in pixels                         |
| `audio`     | boolean | `false`       | Enable microphone input                         |
| `analyzer`  | boolean | `true`        | Show audio analyzer UI                          |
| `loop`      | boolean | `true`        | Auto-render loop                                |
| `global`    | boolean | `false`       | Make Hydra functions global                     |
| `sources`   | number  | `4`           | Number of source buffers                        |
| `outputs`   | number  | `4`           | Number of output buffers                        |
| `precision` | string  | auto          | Shader precision: `highp`, `mediump`, or `lowp` |

### Properties

| Property | Type              | Description                            |
| -------- | ----------------- | -------------------------------------- |
| `code`   | string            | Get or set the scene code              |
| `canvas` | HTMLCanvasElement | Custom canvas element to render on     |
| `synth`  | HydraSynth        | Read-only access to the synth instance |
| `pb`     | object            | rtc-patch-bay instance for streaming   |

### Events

| Event         | Detail                | Description                     |
| ------------- | --------------------- | ------------------------------- |
| `hydra-ready` | `{ synth }`           | Fired when Hydra is initialized |
| `hydra-eval`  | `{ success, error? }` | Fired after code evaluation     |

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
