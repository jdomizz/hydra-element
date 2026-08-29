# Contributing to hydra-element

Thanks for your interest in contributing! This document will help you get started.

## How to contribute

- **Report bugs**: Open an [issue](https://github.com/jdomizz/hydra-element/issues) with a clear description and steps to reproduce
- **Suggest features**: Open an issue to discuss your idea first
- **Submit code**: Fork the repo, create a branch, and open a pull request

## Development setup

1. Fork and clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the dev server:
   ```sh
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser

## Code conventions

This project uses **ox-standard** for linting and formatting (JavaScript Standard Style). Before committing, your code will be automatically checked via pre-commit hooks.

You can also run linting manually:

```sh
npm run lint
```

## Testing

Tests run in a real browser using Web Test Runner and Playwright.

```sh
npm test
```

Tests are located alongside source files in `src/**/*.spec.js` and use `@open-wc/testing` + `sinon`.

## Pull request process

1. Create a branch for your changes: `git checkout -b my-feature`
2. Make your changes and commit them (pre-commit hooks will run automatically)
3. Ensure all tests pass: `npm test`
4. Push to your fork and open a pull request against the `dev` branch
5. Wait for review and address any feedback

## Questions?

Open a [discussion](https://github.com/jdomizz/hydra-element/discussions) or an issue.
