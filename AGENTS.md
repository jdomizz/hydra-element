# AGENTS.md

Quick reference for agent workflows in this repo. The full developer
guide is [CONTRIBUTING.md](./CONTRIBUTING.md); the implementation map
is [ARCHITECTURE.md](./ARCHITECTURE.md).

## Commands

- `pnpm dev` — serve `playground/index.html` with Vite (HMR). A dev-only Vite alias resolves `hydra-element/editor` → `src/editor/index.js` so the playground imports the new `<hydra-editor>` element from source; no pre-build needed.
- `pnpm test` — run all tests via Web Test Runner (headless Chromium). The glob covers `src/**/*.spec.js`, `src/editor/**/*.spec.js`, and `playground/**/*.spec.js` (incl. `playground/editor-panel-extensions.spec.js` for the extension-aware `addWords` demo and `playground/extensions.spec.js` for the catalog data shape + panel rendering + click/keyboard dispatch).
- `pnpm build` — bundles three artifacts: `dist/hydra-element.js` (main element, unchanged), `dist/eval.js` (standalone eval, unchanged), `dist/hydra-editor.js` (new, ~25 KB gzip). All three hand-written `.d.ts` files (`src/hydra-element.d.ts`, `src/eval.d.ts`, `src/hydra-editor.d.ts`) are copied to `dist/` by the `copyDeclarations` Vite plugin. `postbuild` asserts all three `.d.ts` exist.
- `pnpm lint` — lint with oxlint
- `pnpm format` — format with oxfmt
- Pre-commit hook (husky + lint-staged) auto-fixes `*.{js,mjs}` with `oxlint --fix`, then runs `oxfmt` on staged JS and `*.md` files; bypass with `git commit --no-verify`

## Agents

- Agent configuration (build/plan agents, /fix command, skills, system-prompt)
  ships from the workspace registry at `/home/domi/code/.opencode/`, not this
  repo. Build/plan remain pinned to `opencode-go/minimax-m3`; fallback chain
  `mimo-v2.5 → qwen3.6-plus` (see `~/.config/opencode/model-fallback.json`).
- When working on this repo, launch opencode from `/home/domi/code/` so the
  registry's agents and skills load; `.opencode/` does not exist in this repo.
- `/fix` delegates to the `build` agent. No per-project `coder` agent.

## Agent integration policy

**No AI agent merges, fast-forwards, force-pushes, or directly commits to `main` — ever.** Agents work on feature branches (`chore/...`, `feat/...`, `fix/...`, `test/...` — see all 13 branches on origin) off `dev`, then PR or merge into `dev`. `main` is human-only because this is an npm-published public package: a bad commit on `main` would propagate to consumers the moment the next release is cut. Tags (`v0.7.0`, etc.) are human-only — agents prepare on `dev` but never push them.

If you find yourself sitting on `main` with uncommitted work, switch to a feature branch first (`git switch -c <topic>`) and replay the work there before pushing. Same rule across every repo in the workspace — see root AGENTS.md for the canonical statement.

## Test runner quirks

- Tests are `src/**/*.spec.js`, `src/editor/**/*.spec.js`, and `playground/**/*.spec.js`, colocated with source (not in a `test/` dir). The WTR glob in `wtr.config.js` covers all three.
- Uses `@open-wc/testing` + `sinon`; assertions use `.to.be` / `.to.equal` (Chai style). The `<hydra-editor>` element is registered via side-effect import on `editor-panel.js` (or its own `index.js` in editor specs).
- `wtr.config.js` uses Playwright's bundled Chromium — install with `pnpm exec playwright install chromium` if tests fail to launch
- Tests register the custom element themselves via `window.customElements.define`
- **A failing sinon-chai assertion hangs the session instead of reporting red.** `expect(spy).to.have.been.calledOnce` etc., when false, makes WTR time out after 120s ("Browser tests did not finish", 0 passed 0 failed) — the AssertionError carries the cyclic spy object and the reporter never settles. Plain chai failures (`expect(1).to.equal(2)`) report fine. When debugging a suspected assertion failure, assert on primitives instead (`expect(spy.callCount).to.equal(1)`) or wrap the assertion in try/catch to print `e.message`
- WTR + the Vite plugin occasionally fail a file with "Failed to fetch dynamically imported module" on the first run after files are added/removed (stale dep cache) — a clean re-run passes. The new `src/editor/` module + the Vite alias trigger this more often; if a fresh `src/editor/*.spec.js` or `playground/editor-panel-extensions.spec.js` test fails on first run, re-run once before debugging.

## Conventions

- No TypeScript — follow existing JSDoc + plain JS style
- Linting: oxlint (config in `.oxlintrc.json`)
- Formatting: oxfmt (config in `.oxfmtrc.json`)
- `hydra-synth` is the sole runtime dependency; keep it that way
- `playground/index.html` is a dev playground, not part of the library — don't import from it

## Spec workflow

Specs live in the workspace registry (private, this repo is not the home of
spec docs). The per-project index for hydra-element is at
`/home/domi/code/.opencode/specs/hydra-element/roadmap.md`; layouts follow
the standard `backlog/ → active/ → archive/` with movement into `archive/`
requiring explicit user approval. The seven-step process (move + implement

- approve + archive + update docs) below mirrors the workspace convention;
  see `CONTRIBUTING.md → Spec workflow` for the canonical text used by external
  contributors.

When a change here implements a registry spec:

1. Move the spec from `backlog/` to `active/` in the workspace registry
2. Implement according to the spec's "Done when" criteria
3. Get explicit user approval for the archive move
4. Move to `archive/`, append `## Status: accepted` with this commit hash
5. Update docs:
   - **README** — reflect any new/changed features
   - **CHANGELOG** — add an entry under `## [Unreleased]`
   - **ARCHITECTURE.md** — amend if the implementation shape changed
   - **CONTRIBUTING.md** — amend if commands, dependencies, or workflow changed
   - **AGENTS.md** — amend if commands, dependencies, architecture, or workflow changed
6. Commit the registry repo alongside this repo's commit (don't ship them separately)

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
