import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: 'hydra-element.js',
      formats: ['es']
    },
    rollupOptions: {
      external: /^hydra-ts/
    }
  }
})
