import { playwrightLauncher } from '@web/test-runner-playwright'
import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin'

const isCI = !!process.env.CI

export default {
  files: 'src/**/*.spec.js',
  plugins: [vitePlugin()],
  browsers: [
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        args: isCI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      },
    }),
  ],
}
