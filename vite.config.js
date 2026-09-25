import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  define: {
    global: 'globalThis',
  },
  build: {
    emptyOutDir: mode !== 'context',
    lib: {
      entry: mode === 'context' ? 'src/context.js' : 'index.js',
      formats: ['es'],
      fileName: () => (mode === 'context' ? 'context.js' : 'hydra-element.js'),
    },
  },
}))
