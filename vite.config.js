import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'index.js',
      formats: ['es'],
      fileName: 'hydra-element'
    },
    rollupOptions: {
      // external: /^hydra-synth/
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})