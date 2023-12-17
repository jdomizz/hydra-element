import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin'

export default {
    files: 'src/**/*.spec.js',
	plugins: [ vitePlugin() ],
}