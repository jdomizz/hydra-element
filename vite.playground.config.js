import { defineConfig } from 'vite'

/**
 * Playground build (static site) — separate from the library build because:
 *
 *   1. The library build (`vite.config.js`) is `build.lib` mode and emits
 *      `dist/hydra-element.js` + `dist/eval.js` for npm. `package.json`
 *      declares `"files": ["dist", ...]` — *anything* we add to `dist/`
 *      ships to npm.
 *   2. The playground uses app-mode multi-page output and serves
 *      `index.html` (the dev playground) and `gallery.html` (the
 *      multi-instance money shot).
 *
 * Output goes to `dist-site/` (deliberately not `dist/`) and is consumed
 * by `.github/workflows/deploy-pages.yml` for GitHub Pages.
 *
 * `base` is `/hydra-element/` so the project pages URL
 * (https://jdomizz.github.io/hydra-element/) resolves assets correctly.
 */
export default defineConfig({
  base: '/hydra-element/',
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'index.html',
        gallery: 'gallery.html',
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
})
