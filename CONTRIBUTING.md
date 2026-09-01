# Contributing

Thanks for your interest in contributing! This document is for
maintainers and contributors. End users don't need to read this —
[README.md](./README.md) is enough.

For how the library is put together, read
[ARCHITECTURE.md](./ARCHITECTURE.md) instead.

## How to contribute

- **Report bugs** — open an [issue](https://github.com/jdomizz/hydra-element/issues) with a clear description and steps to reproduce
- **Suggest features** — open an issue to discuss the idea first; the roadmap is maintained in a private workspace registry and is not visible here. If you want context on in-flight work, ask in the issue before submitting a PR.
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

The dev server serves `playground/index.html`, the manual playground
for `<hydra-element>`. It exposes preset sketches (osc, noise, cam+blend,
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

| Command       | What it does                                                                    |
| ------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`    | Serve `playground/index.html` with Vite (HMR)                                   |
| `pnpm test`   | Run all tests via Web Test Runner (headless Chromium)                           |
| `pnpm build`  | Bundle to `dist/hydra-element.js`, `dist/eval.js`, `dist/hydra-editor.js` (ESM) |
| `pnpm lint`   | Lint with oxlint (auto-fixes where safe)                                        |
| `pnpm format` | Format with oxfmt                                                               |
| `pnpm check`  | `lint` + `test` + `build` in order — the pre-PR gate CI runs                    |

`pnpm build` produces three artifacts:

- `dist/hydra-element.js` (≈ 327 KB) — the main `<hydra-element>` element; bundles `hydra-synth` + regl.
- `dist/eval.js` — the `hydraEval` standalone eval subpath.
- `dist/hydra-editor.js` (≈ 25 KB gzip) — the `<hydra-editor>` element; bundles `codejar` + `prismjs` as devDeps.

The main entry's runtime dependency stays `hydra-synth` only; `codejar` and `prismjs` are devDependencies bundled into the editor entry. Consumers who don't import `'hydra-element/editor'` pay zero cost for it. The `postbuild` script asserts all three `.d.ts` declarations exist (`dist/hydra-element.d.ts`, `dist/eval.d.ts`, `dist/hydra-editor.d.ts`); if any is missing the build fails.

The playground dev server uses a Vite alias (`hydra-element/editor` → `src/editor/index.js`) so `pnpm dev` resolves the element from source — no pre-build of the lib entry is needed for dev.

## Conventions

- **Plain JavaScript** with JSDoc — no TypeScript source
- Linting: oxlint (config in `.oxlintrc.json`)
- Formatting: oxfmt (config in `.oxfmtrc.json`); a pre-commit hook runs `oxlint --fix` and `oxfmt` on staged files automatically (bypass with `git commit --no-verify`)
- `hydra-synth` is the sole runtime dependency of the main entry — keep it that way. The `hydra-element/editor` subpath bundles `codejar` and `prismjs` as devDependencies into the editor entry only; consumers who don't import `'hydra-element/editor'` pay zero cost for them.
- `playground/index.html` is the dev playground, not part of the library — don't import from it
- Source modules are `src/*.js` (lib) and `src/editor/*.js` (the `<hydra-editor>` public element + grammar + completion + index barrel). Tests live next to them as `*.spec.js` (plus `playground/*.spec.js` for playground-data fixtures and the editor-panel adoption tests).

## Test strategy

Tests are colocated with source (`src/**/*.spec.js`), use
`@open-wc/testing` + `sinon`, and assert with Chai style
(`.to.equal`, `.to.be.a('function')`). Playground tests
(`playground/**/*.spec.js`) use the same setup — picked up by
the WTR glob in `wtr.config.js` — for cases where the fixture
is playground data (e.g. `playground/presets.spec.js` pinning
preset self-containment) rather than lib behavior.

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

Specs and roadmap for this project live in a **private workspace registry**
and are not browsable here. The maintained list of in-flight work, archived
specs, and decision history is the maintainer's working record and is not
exposed publicly. External contributors should rely on GitHub issues and
discussions for context.

If you propose a change that maps to an existing spec, mention the issue
number in the PR description; the maintainer will reconcile the registry
locally when accepting the change.

Each change ships as its **own commit** (no batching unrelated changes).
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
5. Move shipped specs from `active/` to `archive/` in the workspace registry (private, maintainer-only)
6. Commit the registry repo alongside this repo's release commit
7. Tag the commit and push the tag

## Questions?

Open a [discussion](https://github.com/jdomizz/hydra-element/discussions)
or an issue.
