import { defineConfig } from 'vite'

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
