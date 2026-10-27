import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4176)
const base = process.env.SITE_BASE ?? '/'
// local-bundle build (default) or production build: see README "CDN". Output directory differs so both can exist.
const mode = process.env.E2E_MODE === 'production' ? 'production' : 'local'
const outDir = mode === 'production' ? 'dist-production' : 'dist'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results',
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
    command: `OUT_DIR=${outDir} BUILD_TARGET=${mode} npx astro build && OUT_DIR=${outDir} npx tsx scripts/serve.ts`,
    url: `http://localhost:${PORT}${base}`,
    reuseExistingServer: false,
    // The fixture build is ~0.5 s; the real-data build (5.760 cities × the card, three-cycle and share
    // pages) takes ~2 min, so the boot budget has to cover its slowest variant.
    timeout: 300_000,
    env: { PORT: String(PORT) },
  },
  projects: [
    { name: 'phone', testIgnore: /real-data|capture|cdn/, use: { browserName: 'chromium' } },
    { name: 'capture', testMatch: /capture/, use: { browserName: 'chromium' } },
    { name: 'real', testMatch: /real-data/, use: { browserName: 'chromium' } },
  ],
})
