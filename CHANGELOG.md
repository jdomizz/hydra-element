# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Unreleased

### Added

- Each element now fires a custom event called `hydra-element:id` that exposes the sources, outputs and public functions of the element's engine.

### Changed

- The `sources` attribute is now called `num-sources`.
- The `outputs` attribute is now called `num-outputs`.
- Each element now works with its own private engine. No more globals 🎉 
- The engine has been changed from `hydra-synth` to `hydra-ts`.
- The bundler has been changed from `webpack` to `vite`.

### Fixed

-  The element is now fully reactive to attribute changes.

### Removed

- The `audio` attribute has been removed (`hydra-ts` has no audio capabilities).

## [0.2.0] - 2021-09-04

### Changed

- Ensure the `hydra-synth` is created only once. As a result the component loses reactivity to attribute changes 😒

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
