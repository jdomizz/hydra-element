# Contributing

Thanks for your interest in contributing! This document is for
maintainers and contributors. End users don't need to read this —
[README.md](./README.md) is enough.

For how the library is put together, read
[ARCHITECTURE.md](./ARCHITECTURE.md) instead.

## How to contribute

- **Report bugs** — open an [issue](https://github.com/jdomizz/hydra-element/issues) with a clear description and steps to reproduce
- **Suggest features** — open an issue to discuss the idea first; check the existing [specs](./.opencode/specs/roadmap.md) to see if it's already in flight
- **Submit code** — fork the repo, create a branch off `dev`, and open a pull request

## Development setup

The repo pins Node 20 via `.nvmrc` — run `nvm use` (or let your version
manager auto-switch) before installing deps to match CI. The package
manager is **pnpm** (pinned in `package.json` via `packageManager`).
If you don't have it yet, the fastest path is Corepack (bundled with
Node 20+):

```sh
corepack enable                  # one-time per machine
pnpm install                     # uses the version pinned in package.json
pnpm dev                         # vite dev server with HMR — http://localhost:5173
```

`corepack enable` is enough on every modern Node — Corepack reads the
`packageManager` field and fetches the pinned pnpm release on first
use. If Corepack is unavailable, install pnpm any other way
(`npm i -g pnpm`, your distro package, etc.) and make sure its version
matches the pin.

`.editorconfig` mirrors `oxfmt`'s whitespace rules (LF, 2-space indent,
final newline), so editors without an `oxfmt` plugin still produce
conformant files.

The dev server serves `index.html`, the manual playground for
`<hydra-element>`. It exposes preset sketches (osc, noise, cam+blend,
custom GLSL, plus a deliberate-typo preset to exercise the eval error
path), toggles for the element's `audio` / `global` / `loop` /
`sources` / `outputs` attributes, and a live log of every event the
element dispatches (`hydra-ready`, `hydra-eval`, `hydra-element-resize`,
`hydra-context-lost`). The playground lives in `playground/`
(`main.js`, `presets.js`, `style.css`, and `components/` for the
editor, preset selector, config form, log panel, and stats strip) and
does not import anything from `src/` — it talks to `<hydra-element>`
purely through its public API.

If `pnpm test` fails to launch Chromium, install the bundled browser:

```sh
pnpm exec playwright install chromium
```

## Commands

| Command       | What it does                                                    |
| ------------- | --------------------------------------------------------------- |
| `pnpm dev`    | Serve `index.html` with Vite (HMR)                              |
| `pnpm test`   | Run all tests via Web Test Runner (headless Chromium)           |
| `pnpm build`  | Bundle to `dist/hydra-element.js` and `dist/eval.js` (ESM only) |
| `pnpm lint`   | Lint with oxlint (auto-fixes where safe)                        |
| `pnpm format` | Format with oxfmt                                               |
| `pnpm check`  | `lint` + `test` + `build` in order — the pre-PR gate CI runs    |

## Conventions

- **Plain JavaScript** with JSDoc — no TypeScript source
- Linting: oxlint (config in `.oxlintrc.json`)
- Formatting: oxfmt (config in `.oxfmtrc.json`); a pre-commit hook runs `oxlint --fix` and `oxfmt` on staged files automatically (bypass with `git commit --no-verify`)
- `hydra-synth` is the sole runtime dependency — keep it that way
- `index.html` is the dev playground, not part of the library — don't import from it
- Source modules are `src/*.js`, tests live next to them as `src/*.spec.js`

## Test strategy

Tests are colocated with source (`src/**/*.spec.js`), use
`@open-wc/testing` + `sinon`, and assert with Chai style
(`.to.equal`, `.to.be.a('function')`).

Each spec registers the custom element itself:

```js
if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}
```

WTR uses Playwright's bundled Chromium. Tests run headless by default
(`wtr.config.js`); for debugging, open `http://localhost:8000` after
running `pnpm test --watch`.

See [AGENTS.md](./AGENTS.md) for the test-runner quirks the agent
workflow relies on (Playwright install path, etc.).

## Spec workflow

Specs live in `.opencode/specs/` (see [roadmap](./.opencode/specs/roadmap.md)):

```
backlog/ → active/ → archive/
```

- **backlog/** — pending implementation
- **active/** — work in progress (multiple allowed)
- **archive/** — shipped, with a `Status: accepted` footer

When implementing a spec:

1. Move it from `backlog/` to `active/`
2. Implement per the spec's "Done when" criteria
3. Get user approval (a spec only moves to `archive/` after explicit approval)
4. Move to `archive/`, append `## Status` with the commit hash
5. Update docs:
   - **README** — reflect any new/changed features
   - **CHANGELOG** — add an entry (Keep a Changelog format)
   - **AGENTS.md** — amend if commands, dependencies, or architecture changed
   - **ARCHITECTURE.md** — amend if the implementation shape changed

Each spec ships as **its own commit** (no batching unrelated specs).
Conventional commit prefixes:

- `feat(scope): …` — new user-visible feature
- `fix(scope): …` — bug fix
- `refactor(scope): …` — internal change, no behavior delta
- `docs(scope): …` — docs only
- `test(scope): …` — tests only

## Pull request process

1. Branch off `dev`: `git checkout -b my-feature`
2. Make focused commits with the conventional prefix
3. Run `pnpm check` before pushing — lint, tests, and build must be green
4. Push to your fork and open a PR against `dev`
5. Address review feedback; the spec's "Done when" list is the acceptance criteria

## Release process

1. Pick the spec(s) shipped since the last release — verify `pnpm test` is green on `dev`
2. Update **CHANGELOG** under `## [Unreleased]`, then bump the heading to the new version + date
3. Update `version` in `package.json`
4. Update **README** and **ARCHITECTURE** if user-visible behavior or internals changed
5. Move specs from `active/` to `archive/`
6. Commit everything as `docs(release): vX.Y.Z …`
7. Tag the commit and push the tag

## Questions?

Open a [discussion](https://github.com/jdomizz/hydra-element/discussions)
or an issue.
