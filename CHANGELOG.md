# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `destroy()` method for explicit teardown without removing from DOM
- `hydra-element-resize` event when the canvas backing-store resolution changes
- `hydra-context-lost` event for internal canvas context loss
- Custom canvases are now adopted into the shadow root with `part="canvas"`
- TypeScript declarations via `dist/hydra-element.d.ts` and `dist/eval.d.ts`
- Internal canvas has `role="img"` and `aria-label="Hydra visual"`
- Analyzer canvases are marked `aria-hidden="true"`

### Changed

- Disconnecting the element no longer destroys the synth — moving in the DOM preserves state
- `sources`/`outputs` attributes are bounded to 16 (values above revert to default)
- Multiple synth-reset attribute changes in one tick are coalesced into a single reset
- Async evaluations are now serialized in submission order
- Undefined identifiers in user code emit a one-time warning to `console.warn`

### Fixed

- Removing `loop` attribute now restores the default `loop="true"` instead of stopping the loop
- Removing `width`/`height` attributes now returns the canvas to CSS-based sizing
- `ready` always resolves to the live synth, even after a synth reset
- Old Hydra instances are destroyed before creating a new one (no more WebGL context leaks)
- WebGL context loss on internal canvases now triggers automatic re-initialization

## [0.7.0] - 2026-08-29

### Added

- `synth` property for direct access to hydra-synth instance
- `hydra-ready` and `hydra-eval` events
- `hydraEval` exported as standalone function via `hydra-element/eval` subpath
- `ready` promise property — resolves with `{ synth }` when initialized
- `loadScript()` now works in non-global mode
- Canvas resolution follows element CSS size via ResizeObserver
- CSS parts: `::part(canvas)` and `::part(analyzer)`
- Re-evaluation when `canvas` property changes
- Reconnection safety — moving element in DOM no longer re-initializes
- `window._hydra` exposed for community extensions compatibility (geikha/hyper-hydra, etc.)

### Fixed

- `time`, `speed`, `bpm` now resolve dynamically in non-global mode
- Multi-element isolation (removed `globalThis._hydra` leak)
- `loop` attribute now functional

### Changed

- **BREAKING**: `hydraEval` now returns a Promise (always `await` it)
- Eval uses Proxy for better isolation
- Animation loop managed by element (not hydra-synth's `autoLoop`)
- Default canvas size is 0×0 (falls back to 1280×720)
- Explicit `width`/`height` attributes take precedence over ResizeObserver

### Removed

- **BREAKING**: `tick()` method — use `el.synth.tick(dt)`
- **BREAKING**: `transforms` property — use `el.synth.setFunction()`
- **BREAKING**: `analyzer` attribute — use `::part(analyzer) { display: none }`
- **BREAKING**: `pb` option — access via `el.synth.pb`

### Notes

- `window._hydra` is re-exposed for community extensions compatibility. With multiple elements, only the last initialized element's synth will be accessible via `window._hydra`. For multi-element isolation, use `el.synth` instead.

## [0.6.0] - 2026-02-14

### Added

- New `analyzer` attribute to disable the Hydra audio analyzer UI.

### Changed

- Update dependencies

## [0.5.1] - 2024-04-07

### Fixed

- Update dependencies

## [0.5.0] - 2023-12-17

### Changed

- Now to use the `loadScript` function you have to activate the `global` mode

## [0.4.1] - 2023-12-17

### Fixed

- Exception thrown when using `loadScript` in local mode
- Exception thrown when using `setFunction` in local mode

## [0.4.0] - 2023-12-16

### Changed

- Attribute `global` is now `false` by default so each element uses its own private `hydra-synth` engine

## [0.3.1] - 2023-12-12

### Added

- JSDoc for documentation and typing
- Unit tests

### Fixed

- Exception thrown when parsing an invalid JSON string with `parseJSON`

## [0.3.0] - 2023-11-12

### Added

- Now the component evaluates the code between the element tags
- New `code` property
- New `global` attribute
- New `transforms` property
- New `pb` property
- New `canvas` property
- New `loop` attribute and `tick` method

### Fixed

- The component is already reactive to attribute changes 🎉

### Changed

- The bundler has been changed from webpack to vite

## [0.2.0] - 2021-09-04

### Changed

- Ensure the hydra-synth is created only once. As a result the component loses reactivity to attribute changes 😒

### Fixed

- Use valid SPDX license identifier in package.json.

## [0.1.2] - 2021-08-17

### Fixed

- Distribute the correct bundle 😅

## [0.1.1] - 2021-08-17

### Changed

- Attributes are now initialized in the constructor to prevent webpack from defining them before the super() call.

## [0.1.0] - 2021-08-13

### First public release.
