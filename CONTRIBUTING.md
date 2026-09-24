# Contributing

Thanks for your interest! This guide is for contributors and maintainers — if
you just want to use the element, [README.md](./README.md) is enough.

## How to contribute

- **Report bugs** — open an [issue](https://github.com/jdomizz/hydra-element/issues) with a clear description and steps to reproduce.
- **Suggest features** — open an issue to discuss the idea first.
- **Submit code** — fork, branch off `dev`, and open a pull request.

## Development setup

The package manager is **pnpm** (pinned in `package.json`).

```sh
pnpm install
pnpm dev     # vite dev server (HMR) — serves index.html
pnpm test    # vitest (node + happy-dom)
```

`.editorconfig` mirrors `oxfmt`'s rules (LF, 2-space indent, final newline), so
editors without an oxfmt plugin still produce conformant files.

`pnpm dev` serves `index.html`, the manual playground. It exposes a `sketches`
array (community/external-library examples) wired to `<select>`s and an eval
button, so you can run any sketch into any of the four live elements.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Serve `index.html` with Vite (HMR). |
| `pnpm test` | Run the test suites (Vitest). |
| `pnpm lint` | Lint + format (`oxlint --fix` + `oxfmt`). |
| `pnpm format:check` | Check formatting without writing. |
| `pnpm build` | Bundle `dist/hydra-element.js`. |
| `pnpm check` | `lint` + `format:check` + `test` + `build` — the gate. |

## Structure

The library is a single custom element with small, focused modules — see
[ARCHITECTURE.md](./ARCHITECTURE.md) for the module map and the extension
compatibility table.

## Conventions

- Plain JavaScript (JSDoc types on the public API).
- Lint/format via [oxc](https://oxc.rs/) (config in `.oxlintrc.json` / `.oxfmtrc.json`).
