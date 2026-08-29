# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Public `synth` property to access hydra-synth instance for advanced use cases
- `hydra-ready` event dispatched when synth is initialized
- `hydra-eval` event dispatched after code evaluation (success or error)
- `loadScript` method now works in non-global mode
- `parseNumber` now accepts optional `max` parameter (defaults to Infinity)

### Fixed

- `time`, `speed`, `bpm`, `width`, `height` now resolve dynamically in non-global mode (README example now works)
- Removed `globalThis._hydra` leak that broke multi-element isolation
- `loop` attribute now properly observed and functional
- `attributeChangedCallback` no longer recreates canvas/synth on every change (only for `global`, `audio`, `sources`, `outputs`, `precision`)
- Added `disconnectedCallback` to prevent memory leaks when element is removed
- Added error handling in `_evalCode` to catch user code errors
- Hydra instance is now destroyed on disconnect to prevent memory leaks

### Changed

- `src/eval.js` now uses Proxy for better isolation instead of raw `with(synth)`
- Animation loop now managed by element itself (RAF) instead of delegating to hydra-synth's `autoLoop`

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
