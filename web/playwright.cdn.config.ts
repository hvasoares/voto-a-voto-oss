import { defineConfig } from '@playwright/test'
import { offsetFrom, portFor, tcpTaken } from './scripts/e2e-port'

/*
 * CDN mechanism tests: a fake CDN (test double, scripts/fake-cdn.ts), then a PRODUCTION build that takes React from it.
 * Ports derive per checkout (#124) at offsets 2 and 3 above the base checkout port, so the legs stay clear of each
 * other and of a plain e2e run in the same checkout. Run: npm run test:cdn. The real config (cdn.config.json) stays
 * empty until the user chooses a provider.
 */
const offset = offsetFrom(process.env)
// The explicit E2E_PORT targets the site server; the fake CDN is a test double and always derives its own port.
const FAKE = portFor(process.cwd(), { ...process.env, E2E_PORT: undefined }, tcpTaken, offset + 2)
const SITE = portFor(process.cwd(), process.env, tcpTaken, offset + 3)
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
