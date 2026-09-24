import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  build: {
    lib: {
      entry: {
        'hydra-element': 'index.js',
        context: 'src/context.js',
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
  },
})
