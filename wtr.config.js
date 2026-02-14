import { playwrightLauncher } from '@web/test-runner-playwright';
import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin'

export default {
  files: 'src/**/*.spec.js',
  plugins: [vitePlugin()],
  browsers: [
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        executablePath: '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      },
    }),
  ],
};