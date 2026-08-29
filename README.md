# 🍬 \<hydra-element>

Create generative visuals with [Hydra](https://hydra.ojack.xyz/) directly in your web pages.

`hydra-element` lets you embed Hydra scenes in HTML with a single tag. Each element runs independently, so you can have multiple visuals on the same page without conflicts.

## Quick Start

The fastest way to get started:

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

### Audio

Hydra can react to sound, but it needs microphone permission. Enable it with the `audio` attribute:

```html
<hydra-element audio="true"> a.show() osc(10, 0, () => a.fft[0] * 4).out() </hydra-element>
```

If you don't want to see the audio analyzer, use `analyzer="false"`:

```html
<hydra-element audio="true" analyzer="false"></hydra-element>
```

### More buffers (sources and outputs)

By default you get 4 source buffers (`s0`-`s3`) and 4 output buffers (`o0`-`o3`). If you need more:

```html
<hydra-element sources="8" outputs="8">
  s0.initCam() s6.initImage('https://example.com/image.jpg')
  s7.initVideo('https://example.com/video.mp4') src(s0).blend(src(s6)).blend(src(s7)).out()
</hydra-element>
```

### Manual render control

If you want to control when the scene updates (useful for frame-by-frame animations):

```html
<hydra-element loop="false"></hydra-element>

<script>
  const el = document.querySelector('hydra-element')
  function animate() {
    el.tick(16) // 16ms = ~60fps
    requestAnimationFrame(animate)
  }
  animate()
</script>
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

### Custom GLSL functions

You can create your own functions with JavaScript:

```js
document.querySelector('hydra-element').transforms = [
  {
    name: 'myNoise',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 5 },
      { type: 'float', name: 'offset', default: 0.5 },
    ],
    glsl: `return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);`,
  },
]
```

Then use it in your scene:

```html
<hydra-element> myNoise().out() </hydra-element>
```

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

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | number | window width | Canvas width in pixels |
| `height` | number | window height | Canvas height in pixels |
| `audio` | boolean | `false` | Enable microphone input |
| `analyzer` | boolean | `true` | Show audio analyzer UI |
| `loop` | boolean | `true` | Auto-render loop |
| `global` | boolean | `false` | Make Hydra functions global |
| `sources` | number | `4` | Number of source buffers |
| `outputs` | number | `4` | Number of output buffers |
| `precision` | string | auto | Shader precision: `highp`, `mediump`, or `lowp` |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `code` | string | Get or set the scene code |
| `canvas` | HTMLCanvasElement | Custom canvas element to render on |
| `synth` | HydraSynth | Read-only access to the synth instance |
| `transforms` | array | Custom GLSL functions |
| `pb` | object | rtc-patch-bay instance for streaming |

### Methods

| Method | Description |
|--------|-------------|
| `tick(dt)` | Manual render update (when `loop="false"`) |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `hydra-ready` | `{ synth }` | Fired when Hydra is initialized |
| `hydra-eval` | `{ success, error? }` | Fired after code evaluation |

## Using p5.js

Hydra can work alongside p5.js. Load p5 and create a canvas manually:

```html
<hydra-element>
  await loadScript("https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.min.js") const p5Canvas =
  document.createElement('canvas') document.body.appendChild(p5Canvas) new p5((p) => { p.setup = ()
  => { p.createCanvas(400, 400, p.WEBGL, p5Canvas) } p.draw = () => { p.background(220) p.ellipse(0,
  0, 100 * Math.sin(time), 100) } }) s0.init({ src: p5Canvas }) src(s0).out()
</hydra-element>
```

## For developers

If you want to contribute or modify the project:

```sh
npm install
npm run dev     # Dev server with hot reload
npm test        # Run tests
npm run build   # Generate distribution bundle
```

## Credits

- [Olivia Jack](https://ojack.xyz/) for creating Hydra
- The Hydra community for making this so much fun

## License

GNU Affero General Public License (AGPL-3.0-or-later)
