# \<hydra-element>

A custom element for wrapping the [hydra-ts](https://github.com/folz/hydra-ts) engine.

## Rationale

[Hydra](https://github.com/ojack/hydra) is a set of tools for livecoding networked visuals developed by [Olivia Jack](https://github.com/ojack).

[hydra-ts](https://github.com/folz/hydra-ts) is a fork of [hydra-synth](https://github.com/ojack/hydra-synth) (hydra's video synthesizer and shader compiler) developed by [Rodney Folz](https://github.com/folz). It is focused on interoperability, adding great value to the already excellent original library.

This custom element wraps [hydra-ts](https://github.com/folz/hydra-ts) exposing the _sources_, _outputs_ and _public functions_ of the internal engine through a custom event.

> For differences between `hydra-ts` and `hydra-synth`, refer to [`hydra-ts`'s documentation](https://github.com/folz/hydra-ts#readme).

## Usage

### In a web page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Hydra Sketches</title>
    <script type="module">
      import { generators } from 'hydra-ts';
      const { src, osc, gradient, shape, voronoi, noise } = generators;

      window.addEventListener('hydra-element:1', (event) => {
        const { sources, outputs, hush, loop, render } = event.detail;
        const [o0, o1, o2, o3] = outputs;
        osc().out(o0);
        loop.start();
      });
      window.addEventListener('hydra-element:2', (event) => {
        const { sources, outputs, hush, loop, render } = event.detail;
        const [o0, o1, o2, o3] = outputs;
        noise().out(o0);
        loop.start();
      });
    </script>
  </head>
  <body>
    <hydra-element id="1" width="200" height="200"></hydra-element>
    <hydra-element id="2" width="200" height="200"></hydra-element>
    <script type="module" src="https://unpkg.com/hydra-element"></script>
  </body>
</html>
```

### In a wep app

Install the module:

```bash
npm i hydra-element
```

Import the custom element and the hydra generators (with destructuring):

```js
import "hydra-element";
import { generators } from 'hydra-ts';
const { src, osc, gradient, shape, voronoi, noise } = generators;
```

Use the custom tag:

```html
<hydra-element></hydra-element>
```

Listen to the custom event:

```js
window.addEventListener('hydra-element', (event) => {
  const { outputs, loop } = event.detail;
  noise().out(outputs[0]);
  loop.start();
});
```
The name of the event fired by a hydra-element is based on its associated identifier. For example, a hydra-element with `id="myElement"` will fire an event named `hydra-element:myElement` while one without an associated identifier will fire an event simply named `hydra-element`.

> For general information about using Hydra, refer to [hydra's documentation](https://github.com/ojack/hydra#readme).

## Configuration

Read the [`hydra-ts`'s documentation](https://github.com/folz/hydra-ts#readme) for more information about these options.

| `hydra-element` attribute | `hydra-ts` option    | Default value        |
| ------------------------- | -------------------- | -------------------- |
| `width`                   | `width`              | `window.innerWidth`  |
| `height`                  | `height`             | `window.innerHeight` |
| `num-sources`             | `numSources`         | `4`                  |
| `num-outputs`             | `numOutputs`         | `4`                  |
| `precision`               | `precision`          | `highp`              |

## Development

The following `npm` scripts are available:

- `dev`: runs the project for _development_ (reloading on file changes)
- `test`: executes a single test run
- `build`: builds the project for _production_ (in the `dist` directory)

## License

Distributed under the GNU Affero General Public License, the same as Hydra.
