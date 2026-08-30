# AGENTS.md

Quick reference for agent workflows in this repo. The full developer
guide is [CONTRIBUTING.md](./CONTRIBUTING.md); the implementation map
is [ARCHITECTURE.md](./ARCHITECTURE.md).

## Commands

- `npm run dev` — serve `index.html` with Vite (HMR)
- `npm test` — run all tests via Web Test Runner (headless Chromium)
- `npm run build` — bundle to `dist/hydra-element.js` (ES module only)
- `npm run lint` — lint with oxlint
- `npm run format` — format with oxfmt
- Pre-commit hook (husky + lint-staged) auto-fixes `*.{js,mjs}` with `oxlint --fix`, then runs `oxfmt` on staged JS and `*.md` files; bypass with `git commit --no-verify`

## Test runner quirks

- Tests are `src/**/*.spec.js`, colocated with source (not in a `test/` dir)
- Uses `@open-wc/testing` + `sinon`; assertions use `.to.be` / `.to.equal` (Chai style)
- `wtr.config.js` uses Playwright's bundled Chromium — install with `node node_modules/playwright/cli.js install chromium` if tests fail to launch
- Tests register the custom element themselves via `window.customElements.define`

## Conventions

- No TypeScript — follow existing JSDoc + plain JS style
- Linting: oxlint (config in `.oxlintrc.json`)
- Formatting: oxfmt (config in `.oxfmtrc.json`)
- `hydra-synth` is the sole runtime dependency; keep it that way
- `index.html` is a dev playground, not part of the library — don't import from it

## Spec workflow

Specs live in `.opencode/specs/` (index in `roadmap.md`):

```
backlog/ → active/ → archive/
```

When implementing a spec:

1. Move it from `backlog/` to `active/`
2. Implement according to the spec's "Done when" criteria
3. User reviews and approves
4. Move to `archive/`, append `## Status: accepted` with the commit hash
5. Update docs:
   - **README** — reflect any new/changed features
   - **CHANGELOG** — add an entry under `## [Unreleased]`
   - **ARCHITECTURE.md** — amend if the implementation shape changed
   - **CONTRIBUTING.md** — amend if commands, dependencies, or workflow changed

Specs can only move to `archive/` after explicit user approval, even if
implementation is complete.

See [CONTRIBUTING.md → Spec workflow](./CONTRIBUTING.md#spec-workflow)
for the full process.

## Language conventions

- **Project language: English** — all code, specs, docs, and commits in English
- **Agent responses**: respond in the user's language when chatting
- **Code artifacts**: always in English (variable names, comments, commit messages, spec documents)

## Commit conventions

Conventional commit prefixes:

- `feat(scope): …` — new user-visible feature
- `fix(scope): …` — bug fix
- `refactor(scope): …` — internal change, no behavior delta
- `docs(scope): …` — docs only
- `test(scope): …` — tests only

One spec per commit. Don't batch unrelated specs.
