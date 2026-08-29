# AGENTS.md

## Commands

- `npm run dev` — serve `index.html` with Vite (HMR)
- `npm test` — run all tests via Web Test Runner (headless Chromium)
- `npm run build` — bundle to `dist/hydra-element.js` (ES module only)
- `npm run lint` — lint with oxlint
- `npm run format` — format with oxfmt

## Test runner quirks

- Tests are `src/**/*.spec.js`, colocated with source (not in a `test/` dir)
- Uses `@open-wc/testing` + `sinon`; assertions use `.to.be` / `.to.equal` (Chai style)
- `wtr.config.js` uses Playwright's bundled Chromium — install with `node node_modules/playwright/cli.js install chromium` if tests fail to launch
- Tests register the custom element themselves via `window.customElements.define`

## Architecture

Single-package web component library wrapping `hydra-synth`.

- Entry: `index.js` registers `<hydra-element>` from `src/element.js`
- `src/element.js` — custom element that creates a canvas, instantiates Hydra, and evaluates user code
- `src/eval.js` — evaluates user code using `new Function()` + `with(proxy)` to provide Hydra DSL syntax (not a security sandbox)
- `src/helper.js` — pure parsing utilities (`parseNumber`, `parseJSON`, `parseOption`)
- Build output: `dist/hydra-element.js` (ESM only, per `vite.config.js`)

## Conventions

- No TypeScript — follow existing JSDoc + plain JS style
- Linting: oxlint (config in `.oxlintrc.json`)
- Formatting: oxfmt (config in `.oxfmtrc.json`)
- `hydra-synth` is the sole runtime dependency; keep it that way
- `index.html` is a dev playground, not part of the library — don't import from it

## Workflow

Specs live in `dev/roadmap/`:

```
backlog/ → active/ → archive/
```

- **backlog/** — Specs pending implementation
- **active/** — Specs being implemented (multiple allowed)
- **archive/** — Specs completed with user approval

When implementing a spec:
1. Move it from `backlog/` to `active/`
2. Implement according to the spec's "Done when" criteria
3. User reviews and approves
4. Move to `archive/` and update README status with commit hash

**Important:** Specs can only move to `archive/` after explicit user approval, even if implementation is complete.

## Language conventions

- **Project language: English** — All code, specs, docs, and commits are in English
- **Agent responses**: Respond in the user's language when chatting
- **Code artifacts**: Always in English (variable names, comments, commit messages, spec documents)
