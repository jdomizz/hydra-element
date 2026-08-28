# AGENTS.md

## Commands

- `npm run dev` — serve `index.html` with Vite (HMR)
- `npm test` — run all tests via Web Test Runner (headless Chromium)
- `npm run build` — bundle to `dist/hydra-element.js` (ES module only)
- No lint or typecheck scripts exist

## Test runner quirks

- Tests are `src/**/*.spec.js`, colocated with source (not in a `test/` dir)
- Uses `@open-wc/testing` + `sinon`; assertions use `.to.be` / `.to.equal` (Chai style)
- `wtr.config.js` hardcodes `executablePath: '/usr/bin/chromium-browser'` — override or remove if Chromium lives elsewhere
- Tests register the custom element themselves via `window.customElements.define`

## Architecture

- Single-package web component library wrapping `hydra-synth`
- Entry: `index.js` registers `<hydra-element>` from `src/element.js`
- `src/eval.js` — destructures synth properties and `eval()`s user code (avoids treeshaking via `log` flag)
- `src/helper.js` — pure parsing utilities (`parseNumber`, `parseJSON`, `parseOption`)
- Build output: `dist/hydra-element.js` (ESM only, per `vite.config.js`)

## Conventions

- No TypeScript, no lint config — follow existing JSDoc + plain JS style
- `hydra-synth` is the sole runtime dependency; keep it that way
- `index.html` is a dev playground, not part of the library — don't import from it
