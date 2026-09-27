import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es'],
      fileName: () => 'hydra-element.js',
    },
  },
})
