<!-- ![Logo](/logo.png) -->

# \<hydra-element>

A custom element for wrapping the [hydra-synth](https://github.com/ojack/hydra-synth) video engine.

[Hydra](https://github.com/ojack/hydra) is a set of tools for livecoding networked visuals developed by [Olivia Jack](https://ojack.xyz/).

## Rationale

## Usage

### In a web page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Hydra Sketch</title>
    <script>
      window.addEventListener("load", function () {
        gradient(0.5).colorama(0.5).pixelate(20, 20).out(o0);
      });
    </script>
  </head>
  <body>
    <hydra-element></hydra-element>
    <script src="https://unpkg.com/hydra-element"></script>
  </body>
</html>
```

### In a wep app

Install the module:

```bash
npm i hydra-element
```

Import the custom element:

```js
import "hydra-element";
```

Use the custom tag:

```html
<hydra-element></hydra-element>
```

## Configuration

```
'code',
'width', // ? canvas element width, defaults to 1280
'height', // ? canvas element height, defaults to 720
// 'auto-loop': defaults to true, if false you must implement a loop function using the tick() method
'audio', // autodetect microphones (asks for permission), defaults to false
'sources', // number of initial source buffers, defaults to 4
'outputs', // number of available output buffers, defaults to 4
'transforms', // array of transforms to be added to the synth, defaults to []
// ?? [['ios','lowp']] 'precision', // 'highp' or 'mediump' or 'lowp' (recommended for ios), defaults to 'mediump' except for ios ('highp')
'pb', // instance of rtc-patch-bay to use for streaming, defaults to null
```

## License

Distributed under the GNU Affero General Public License, the same as Hydra.
