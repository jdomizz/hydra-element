# \<hydra-element>

A custom element for wrapping the [hydra-ts](https://github.com/folz/hydra-ts) engine.

## Rationale

[Hydra](https://github.com/ojack/hydra) is a set of tools for livecoding networked visuals developed by [Olivia Jack](https://github.com/ojack). It stands out for its elegant DSL, modeled on a fluent interface.

[hydra-ts](https://github.com/folz/hydra-ts) is a fork of [hydra-synth](https://github.com/ojack/hydra-synth) (hydra's video synthesizer and shader compiler) developed by [Rodney Folz](https://github.com/folz). It is focused on interoperability, adding great value to the already excellent original library.

This custom element wraps [hydra-ts](https://github.com/folz/hydra-ts) exposing the _synth engine_ and the _canvas stream_ through a custom event.

> For differences between `hydra-ts` and `hydra-synth`, refer to [`hydra-ts`'s documentation](https://github.com/folz/hydra-ts#readme).

## Installation

```bash
npm install hydra-element
```

## Usage

Import the custom element and the hydra generators:

```js
import "hydra-element";
import { generators } from 'hydra-ts';
```

Use the custom tag:

```html
<hydra-element width="1080" height="1080" precision="highp"></hydra-element>
<hydra-element id="mySketch" num-outputs="16"></hydra-element>
```

Listen to the custom events:

```js
window.addEventListener('hydra-element', (event) => {
  const { hydra } = event.detail
  const { osc } = generators
  const [o0] = hydra.outputs

  osc().out(o0)
})

window.addEventListener('hydra-element:mySketch', (event) => {
  const { outputs } = event.detail.hydra
  const { noise } = generators

  noise().out(outputs[15])
  render(outputs[15])
})
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
| `density`                 | `density`            | `1`                  |

## Development

The following `npm` scripts are available:

- `dev`: runs the project for _development_ (reloading on file changes)
- `test`: executes a single test run
- `build`: builds the custom element for _distribution_ (in the `dist` directory)

## License

Distributed under the GNU Affero General Public License.
