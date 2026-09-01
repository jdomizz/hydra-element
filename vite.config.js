import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

/** Copy the hand-written .d.ts files into dist/ after each Vite build. */
function copyDeclarations() {
  return {
    name: 'hydra-element-copy-declarations',
    closeBundle() {
      const pairs = [
        ['src/hydra-element.d.ts', 'dist/hydra-element.d.ts'],
        ['src/eval.d.ts', 'dist/eval.d.ts'],
        ['src/hydra-editor.d.ts', 'dist/hydra-editor.d.ts'],
      ]
      for (const [src, dst] of pairs) {
        const dstDir = dirname(resolve(__dirname, dst))
        mkdirSync(dstDir, { recursive: true })
        copyFileSync(resolve(__dirname, src), resolve(__dirname, dst))
      }
    },
  }
}

export default defineConfig({
  plugins: [copyDeclarations()],
  build: {
    lib: {
      entry: {
        'hydra-element': 'index.js',
        eval: 'src/eval.js',
        // `<hydra-editor>` public element + subpath `hydra-element/editor`.
        // Bundles codejar + prismjs (devDeps) into the editor entry only;
        // the main entry keeps hydra-synth as the sole runtime dep. See
        // `.opencode/specs/hydra-element/active/hydra-editor.md` §2.5.
        'hydra-editor': 'src/editor/index.js',
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
