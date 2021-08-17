![Logo](/logo.png)

# \<hydra-element>

A custom element for wrapping the [hydra-synth](https://github.com/ojack/hydra-synth) engine.

[Hydra](https://github.com/ojack/hydra) is a set of tools for livecoding networked visuals developed by [Olivia Jack](https://ojack.xyz/).

## Rationale

The purpose of this project is to embed a _global_ instance of `hydra-synth` in a [web component](https://developer.mozilla.org/en-US/docs/Web/Web_Components) _bundled_ as a native [ES module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

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
    <script type="module" src="https://unpkg.com/hydra-element"></script>
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
<hydra-element audio="true" precision="lowp"></hydra-element>
```

## Configuration

Read the [`hydra-synth` documentation](https://github.com/ojack/hydra-synth#api) for more information about these options.

| `hydra-element` attribute | `hydra-synth` option | Default value        |
| ------------------------- | -------------------- | -------------------- |
| `width`                   | `width`              | `window.innerWidth`  |
| `height`                  | `height`             | `window.innerHeight` |
| `audio`                   | `detectAudio`        | `false`              |
| `sources`                 | `numSources`         | `4`                  |
| `outputs`                 | `numOutputs`         | `4`                  |
| `precision`               | `precision`          | `highp`              |

## Development

The following `npm` scripts are available:

- `start`: runs the project for _development_ (reloading on file changes)
- `analyze`: displays documentation extracted from the source code
- `manifest`: generates the `custom-elements.json` manifest
- `build`: builds the project for _production_ (in the `dist` directory)

## License

Distributed under the GNU Affero General Public License, the same as Hydra.
