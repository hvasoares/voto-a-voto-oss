import { defineConfig } from '@playwright/test'

/*
 * CDN mechanism tests: a fake CDN (test double, scripts/fake-cdn.ts) on 4179, then a PRODUCTION build that takes React from it,
 * served on 4180. Run: npm run test:cdn. The real config (cdn.config.json) stays empty until the user chooses a provider.
 */
const SITE = 4180
const FAKE = 4179
const config = 'test-results/cdn-fake.config.json'
const env = { FAKE_CDN_PORT: String(FAKE), FAKE_CDN_CONFIG: config, CDN_CONFIG: config, E2E_MODE: 'production' }

process.env.CDN_CONFIG = config
process.env.E2E_MODE = 'production'

export default defineConfig({
  testDir: 'e2e',
  testMatch: /cdn\.spec/,
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results/cdn',
  use: {
    baseURL: `http://localhost:${SITE}`,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    browserName: 'chromium',
  },
  webServer: [
    { command: 'npx tsx scripts/fake-cdn.ts', url: `http://localhost:${FAKE}/react@19.3.1/react.js`, reuseExistingServer: false, timeout: 120_000, env },
    {
      command: 'BUILD_TARGET=production OUT_DIR=dist-cdn-test npx astro build && OUT_DIR=dist-cdn-test npx tsx scripts/serve.ts',
      url: `http://localhost:${SITE}/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...env, PORT: String(SITE) },
    },
  ],
})
