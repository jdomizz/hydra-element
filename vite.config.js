import { defineConfig } from 'vite'

/**
 * The library build (`build.lib`) emits `dist/hydra-element.js` +
 * `dist/eval.js` for npm. `package.json` declares
 * `"files": ["dist", ...]` — *anything* we add to `dist/` ships to npm.
 *
 * `root` is intentionally not set here: this config is consumed by
 * `pnpm build` (lib mode) and by `@remcovaes/web-test-runner-vite-plugin`
 * (which spins up a Vite instance to serve `src/*.spec.js`). Setting
 * `root` would break both. The playground's dev server is configured in
 * `vite.playground.config.js` instead, which `pnpm dev` uses directly.
 */
export default defineConfig({
  build: {
    lib: {
      entry: {
        'hydra-element': 'index.js',
        eval: 'src/eval.js',
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
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
