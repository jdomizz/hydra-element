# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `destroy()` method for explicit teardown without removing from DOM
- `hydra-element-resize` event when the canvas backing-store resolution changes
- `hydra-context-lost` event for internal canvas context loss
- `synth` property and `hydraEval` standalone export via the `hydra-element/eval` subpath
- `hydra-ready` and `hydra-eval` events
- `ready` promise — resolves with `{ synth }` once Hydra is initialized; always reflects the live synth
- Canvas re-evaluation when the `canvas` property changes
- Canvas resolution follows element CSS size via `ResizeObserver`; explicit `width`/`height` attributes take precedence
- CSS parts: `::part(canvas)` and `::part(analyzer)`
- Reconnection safety — moving the element in the DOM no longer re-initializes synth
- `loadScript()` works in non-global mode (and `el.loadScript(url)` is exposed as a sugar method)
- TypeScript declarations via `dist/hydra-element.d.ts` and `dist/eval.d.ts`
- Internal canvas has `role="img"` and `aria-label="Hydra visual"`; analyzer canvases are `aria-hidden="true"`
- `ARCHITECTURE.md` describing modules, eval proxy, transient bridge, lifecycle, and build
- `CONTRIBUTING.md` reorganized for maintainers (commands, tests, spec workflow, release process)

### Changed

- **BREAKING**: `hydraEval` now returns a Promise — always `await` it
- `build` and `plan` agents pinned to `opencode-go/minimax-m3` via project overrides
- `/fix` command now delegates to the default `build` agent
- Removed custom `coder` agent; defaults are sufficient
- **BREAKING**: animation loop is managed by the element, not hydra-synth's `autoLoop`
- **BREAKING**: default canvas size is 0×0 (falls back to 1280×720)
- Eval uses a Proxy for scoped DSL access; identifier-level lookups resolve scope → synth → `globalThis`
- Disconnecting the element no longer destroys the synth — moving the element in the DOM preserves state
- `sources`/`outputs` are bounded to 16 (values above revert to default)
- Multiple synth-reset attribute changes in one tick are coalesced into a single reset
- Async evaluations are now serialized in submission order
- Undefined identifiers in user code emit a one-time `console.warn`
- `loadScript` (and `el.loadScript`) transiently publish the element's Hydra on `window` while a script loads and restore the prior state when it settles
- Non-global elements no longer bind `_hydra`, `synth`, or DSL functions on `window`
- `width`/`height` attributes now coerce with strict `Number()` instead of `parseInt`. A `console.warn` fires once per session for non-numeric values like `width="500px"`; the canvas falls back to its previous resolution. Empty attributes (`width=""`) are treated as absent and fall back too.
- README is oriented at the creative coder; implementation details moved to `ARCHITECTURE.md`
- Dev playground: `<log-panel>.clear()` is private (`#clear`) — only the clear button uses it

### Fixed

- `time`, `speed`, `bpm` now resolve dynamically in non-global mode
- Multi-element isolation — no more last-writer-wins on `window._hydra`/`window.synth` in non-global mode
- Removing the `loop` attribute now restores the default `loop="true"` instead of stopping the loop
- Removing `width`/`height` returns the canvas to CSS-based sizing instead of forcing 0×0
- Old Hydra instances are destroyed before creating a new one (no more WebGL context leaks)
- WebGL context loss on internal canvases now triggers automatic re-initialization

### Removed

- **BREAKING**: `tick()` method — use `el.synth.tick(dt)`
- **BREAKING**: `transforms` property — use `el.synth.setFunction()`
- **BREAKING**: `analyzer` attribute — use `::part(analyzer) { display: none }`
- **BREAKING**: `pb` option — access via `el.synth.pb`

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
