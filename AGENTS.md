# AGENTS.md

Quick reference for agent workflows in this repo. The full developer
guide is [CONTRIBUTING.md](./CONTRIBUTING.md); the implementation map
is [ARCHITECTURE.md](./ARCHITECTURE.md).

## Commands

- `pnpm dev` — serve `index.html` with Vite (HMR)
- `pnpm test` — run all tests via Web Test Runner (headless Chromium)
- `pnpm build` — bundle to `dist/hydra-element.js` (ES module only)
- `pnpm lint` — lint with oxlint
- `pnpm format` — format with oxfmt
- Pre-commit hook (husky + lint-staged) auto-fixes `*.{js,mjs}` with `oxlint --fix`, then runs `oxfmt` on staged JS and `*.md` files; bypass with `git commit --no-verify`

## Agents

- Default `build` and `plan` agents are pinned to `opencode-go/minimax-m3`
  via `.opencode/agents/{build,plan}.md`. Fallback chain:
  `mimo-v2.5 → qwen3.6-plus` (see `~/.config/opencode/model-fallback.json`).
- `/fix` delegates to the `build` agent. No dedicated `coder` agent.

## Test runner quirks

- Tests are `src/**/*.spec.js`, colocated with source (not in a `test/` dir)
- Uses `@open-wc/testing` + `sinon`; assertions use `.to.be` / `.to.equal` (Chai style)
- `wtr.config.js` uses Playwright's bundled Chromium — install with `pnpm exec playwright install chromium` if tests fail to launch
- Tests register the custom element themselves via `window.customElements.define`
- **A failing sinon-chai assertion hangs the session instead of reporting red.** `expect(spy).to.have.been.calledOnce` etc., when false, makes WTR time out after 120s ("Browser tests did not finish", 0 passed 0 failed) — the AssertionError carries the cyclic spy object and the reporter never settles. Plain chai failures (`expect(1).to.equal(2)`) report fine. When debugging a suspected assertion failure, assert on primitives instead (`expect(spy.callCount).to.equal(1)`) or wrap the assertion in try/catch to print `e.message`
- WTR + the Vite plugin occasionally fail a file with "Failed to fetch dynamically imported module" on the first run after files are added/removed (stale dep cache) — a clean re-run passes

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
