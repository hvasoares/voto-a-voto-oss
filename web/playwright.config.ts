import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4176)
const base = process.env.SITE_BASE ?? '/'
// local-bundle build (default) or production build: see README "CDN". Output directory differs so both can exist.
const mode = process.env.E2E_MODE === 'production' ? 'production' : 'local'
const outDir = mode === 'production' ? 'dist-production' : 'dist'
// E2E_SKIP_BUILD=1 serves the build already in the output directory instead of rebuilding: re-running one spec
// after a build starts in seconds. Default (unset, CI) stays a fresh build; url, reuse and timeout are unchanged.
const skipBuild = process.env.E2E_SKIP_BUILD === '1'
const build = `OUT_DIR=${outDir} BUILD_TARGET=${mode} npx astro build`
const serve = `OUT_DIR=${outDir} npx tsx scripts/serve.ts`

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
    command: skipBuild ? serve : `${build} && ${serve}`,
    url: `http://localhost:${PORT}${base}`,
    reuseExistingServer: false,
    // The fixture build is ~0.5 s; the real-data build (5.760 cities × the card, three-cycle, share and, since G6, the fact
    // pages: 64.302 pages) takes ~5 min, so the boot budget has to cover its slowest variant.
    timeout: 600_000,
    env: { PORT: String(PORT) },
  },
  projects: [
    { name: 'phone', testIgnore: /real-data|capture|cdn|desktop-/, use: { browserName: 'chromium' } },
    // The desktop suites (G10): a 1440x900 pointer-and-keyboard browser; each spec resizes for its own 390/768 checks.
    { name: 'desktop', testMatch: /desktop-/, use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false } },
    { name: 'capture', testMatch: /capture/, use: { browserName: 'chromium' } },
    { name: 'real', testMatch: /real-data/, use: { browserName: 'chromium' } },
  ],
})
