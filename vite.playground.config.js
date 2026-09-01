import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * Playground build (static site) — separate from the library build because:
 *
 *   1. The library build (`vite.config.js`) is `build.lib` mode and emits
 *      `dist/hydra-element.js` + `dist/eval.js` + `dist/hydra-editor.js`
 *      for npm. `package.json` declares `"files": ["dist", ...]` —
 *      *anything* we add to `dist/` ships to npm.
 *   2. The playground uses app-mode multi-page output and serves
 *      `playground/index.html` (the unified playground — 4 isolated
 *      `<hydra-element>` + editor with target picker, the result of
 *      `active/playground-multi-instance-mode.md`).
 *
 * Output goes to `dist-site/` (deliberately not `dist/`) and is consumed
 * by `.github/workflows/deploy-pages.yml` for GitHub Pages.
 *
 * `gallery.html` is still emitted (as a 4-line static redirect to `./`)
 * so the public URL `https://jdomizz.github.io/hydra-element/playground/gallery.html`
 * doesn't 404 for anyone who linked to it during v0.7.0. Listed as a
 * Rollup input so Vite copies it through to `dist-site/` with the
 * `base`-relative URL rewrite applied to `url=./`.
 *
 * `base` is derived from `package.json#repository.url` so a fork with a
 * different GitHub repo name still resolves assets correctly (no silent
 * 404s on first deploy after a rename). For this repo the value is
 * `/hydra-element/` — the project-pages URL
 * `https://jdomizz.github.io/hydra-element/` resolves assets correctly.
 *
 * The `resolve.alias` map lets `playground/main.js` import the `<hydra-editor>`
 * element directly from source (`hydra-element/editor` → `src/editor/index.js`).
 * This means `pnpm dev` works without a pre-build of the lib entry. The
 * published subpath `hydra-element/editor` (used by external consumers) is
 * unaffected — it always resolves to `dist/hydra-editor.js` via the
 * `package.json` exports map.
 */
const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'))

// Tolerates: git+https://github.com/<org>/<repo>.git
//            https://github.com/<org>/<repo>
//            git@github.com:<org>/<repo>.git (via [/:] alternation)
const repoUrl = pkg.repository?.url ?? ''
const repoName = repoUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)?.[2] ?? pkg.name // safe fallback — for this repo equals "hydra-element"

const base = `/${repoName}/`

export default defineConfig(({ command }) => ({
  // In dev (`pnpm dev`) serve from `playground/` so `index.html` lives
  // at the URL root and relative paths (`./style.css`, `../index.js`)
  // resolve correctly. In build (`pnpm build:playground`) leave root
  // unset so `outDir: 'dist-site'` lands at the repo root and the GH
  // Pages artifact path is preserved.
  root: command === 'serve' ? 'playground' : undefined,
  // In dev serve at `/` (the usual `localhost:5173/` UX). In build
  // use the project-pages base so assets resolve under
  // `/hydra-element/assets/…` on GitHub Pages.
  base: command === 'serve' ? '/' : base,
  resolve: {
    alias:
      command === 'serve'
        ? {
            // Playground imports the element from source so `pnpm dev`
            // needs no pre-build of `dist/hydra-editor.js`. External
            // consumers resolve `hydra-element/editor` via the
            // `package.json` exports map (unaffected).
            'hydra-element/editor': resolve(projectRoot, 'src/editor/index.js'),
          }
        : {},
  },
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(projectRoot, 'playground/index.html'),
        gallery: resolve(projectRoot, 'playground/gallery.html'),
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}))
