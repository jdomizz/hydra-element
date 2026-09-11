import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin'

const isCI = !!process.env.CI

/**
 * Browser launch is opt-in via `pnpm test:browser` (which sets WTR_BROWSER=1)
 * or `WTR_BROWSER=1 pnpm test` directly. Default is launcher-less — DOM-bound
 * specs fail legibly, but the run exits immediately instead of hanging on
 * chromium launch.
 */
const shouldLaunchBrowser = process.env.WTR_BROWSER === '1' || process.env.WTR_BROWSER === 'true'

let browsers = []
if (shouldLaunchBrowser) {
  const { playwrightLauncher } = await import('@web/test-runner-playwright')
  browsers = [
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        args: isCI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      },
    }),
  ]
}

export default {
  files: ['src/**/*.spec.js', 'playground/**/*.spec.js'],
  plugins: [vitePlugin()],
  browsers,
  // The WebGL-heavy specs (canvas init + real hydra-synth + rAF waits) flake
  // at mocha's 2s default under load; 15s gives them headroom without masking
  // real hangs (which the sinon-chai quirk surfaces as a 120s browser timeout).
  testFramework: {
    config: {
      timeout: 15000,
    },
  },
}
