import { defineConfig } from 'vite'

/**
 * The library build (`build.lib`) emits `dist/hydra-element.js` +
 * `dist/context.js` for npm. Declaration files are emitted by
 * `tsc -p tsconfig.build.json` (not copied here) — see `tsconfig.build.json`.
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
        'hydra-element': 'src/index.ts',
        context: 'src/context.ts',
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
