# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.1] - 2026-09-25

### Fixed

- Build each entry as a self-contained bundle, so loading the package root URL (e.g. `https://cdn.jsdelivr.net/npm/hydra-element`) no longer 404s on a shared `globals-*.js` chunk

## [0.7.0] - 2026-09-24

### Added

- `synth` and `ready` properties plus a `destroy()` method
- `loadScript(url)` method — load extensions without the `global` attribute
- `hydra-ready` and `hydra-eval` events
- `dpr` attribute and `::part(canvas)`/`::part(analyzer)` CSS parts
- `bind(name, value)`, `bindLive(name, provider)`, and `unbind(name)` — feed static values or live getters into the eval scope; bound names win over engine-owned reads (`time`, `width`, `height`, `speed`, …)
- headless context module (`hydra-element/context`): `createContext(hydra, options)` exposing `eval`/`bind`/`bindLive`/`unbind`, plus `loadScript` and re-exports of `hydraEval`/`userCodeLine`
- `editorGlobals: false` option to `createContext` to skip binding `_hydra`/`hydraSynth` into the scope

### Changed

- `hydraEval` now resolves the DSL through a scope proxy, so `time`, `bpm`, `speed`, extra buffers and custom transforms work without `synth.`
- identifier resolution follows: bound name → live engine read → persistent scope → synth → `globalThis`
- evaluations are serialized through a queue
- `loop` attribute now toggles the loop without recreating the engine
- `width`/`height`/`dpr` changes resize without recreating the engine
- toolchain moved to pnpm + vitest + oxc-standard
- dev dependencies updated: vite 8, oxlint 1.85 (oxfmt stays on 0.48 for the oxc-standard peer)

### Fixed

- leaked running loops/WebGL contexts on re-initialization
- created one engine per initial attribute instead of one
- `parseJSON(null)` returned `null` instead of the default value
- `ready` kept resolving to a destroyed engine after `destroy()`
- warnings for invalid `width`/`height` attributes now dedupe per element instead of globally

### Removed

- `analyzer` attribute — hide the audio analyzer via `::part(analyzer)`

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
