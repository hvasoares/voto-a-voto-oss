import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4174)
const base = process.env.SITE_BASE ?? '/'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results',
  // Baselines are per platform: fonts differ between macOS and Linux, so a baseline is only valid where it was approved.
  snapshotPathTemplate: '{testDir}/baselines/{platform}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0, animations: 'disabled' } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Phone viewport used by EVERY check and screenshot. Reference images are 390x844 at scale 1.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
  },
  webServer: {
    command: 'npx tsx scripts/build.ts && npx tsx scripts/serve.ts',
    url: `http://localhost:${PORT}${base}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { PORT: String(PORT) },
  },
  projects: [
    { name: 'phone', testIgnore: /baseline|slot-screenshot|real-data/, use: { browserName: 'chromium' } },
    { name: 'capture', testMatch: /slot-screenshot/, use: { browserName: 'chromium' } },
    { name: 'real', testMatch: /real-data/, use: { browserName: 'chromium' } },
    { name: 'baseline', testMatch: /baseline/, use: { browserName: 'chromium' } },
  ],
})
