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
import "hydra-element"
```

## Usage

Include your code between the element tags.

```html
<hydra-element>
  s0.initImage("https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg")

  osc(30,0.01,1)
    .mult(osc(() => (100 * Math.sin(time * 0.1)),-0.1,1).modulate(noise(3,1)).rotate(0.7))
    .blend(src(s0))
    .posterize([3,10,2].fast(0.5).smooth(1))
    .modulateRotate(o0, () => mouse.x * 0.003)
    .out()
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
pb: null
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

If you set the `global` attribute to `true` all sources, functions and outputs of the synthesizer will be stored in the `window` object, so they will be directly available. You should use this option if you need to extend the functionality of the synthesizer by loading extensions or external libraries with `loadScript`.

```html
<hydra-element global="true">
  await loadScript("https://cdn.statically.io/gl/metagrowing/extra-shaders-for-hydra/main/lib/lib-noise.js")
  
  warp().out()
</hydra-element>
```

> **Warning**
> You must not use more than one `hydra-element` with `global` set to `true` in the same HTML document.

### Attribute `audio`

Hydra's audio capabilities are disabled by default because they require requesting microphone permissions and not all scripts use them, so don't forget to set the `audio` attribute to `true` if you use the `a` object in your script.

```html
<hydra-element audio="true">
  a.show()

  osc(10, 0, () => a.fft[0]*4).out()
</hydra-element>
```

### Attribute `sources`

You can use the `sources` attribute to set the number of source buffers available for multimedia resources. The default value is `4`. Extra buffers are available via the `synth` object.

```html
<hydra-element sources="8">
  const { s6, s7 } = synth

  s0.initCam()
  s1.initScreen()
  s6.initImage('https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg')
  s7.initVideo('https://media.giphy.com/media/AS9LIFttYzkc0/giphy.mp4')

  src(s0)
    .blend(src(s1))
    .blend(src(s6))
    .blend(src(s7))
    .out()
</hydra-element>
```

### Attribute `outputs`

You can use the `outputs` attribute to set the number of output buffers to use. The default value is `4`. Extra buffers are available via the `synth` object.

```html
<hydra-element outputs="8">
  const { o7 } = synth

  osc().out(o7)

  render(o7)
</hydra-element>
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
document.querySelector('hydra-element').transforms = [{
  name: 'yourNoise',
  type: 'src',
  inputs: [
    { type: 'float', name: 'scale', default: 5 },
    { type: 'float', name: 'offset', default: 0.5 }
  ],
  glsl: `return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);`
}]
```

Once done, you can use the new functions in your script. Generator functions (those of type `src`) will be available via the `synth` object.

```html
<hydra-element>
  const { yourNoise } = synth

  yourNoise().out()
</hydra-element>
```

### Property `pb`

If you have access to an instance of `rtc-patch-bay` for streaming, you can assign it to the `pb` property with JavaScript.

```js
document.querySelector('hydra-element').pb = yourRtcPatchBayInstance
```

## Limitations

- The `loadScript` function is only available when `global` is `true`.
- It is not possible to work with [p5.js](https://p5js.org) as in the Hydra web editor.

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
