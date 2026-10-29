import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESKTOP, PHONE } from './e2e/presets'
import { readStamp, stampInputs } from './scripts/build-stamp'
import { offsetFrom, portFor, resolvedPort, tcpTaken } from './scripts/e2e-port'
import { loadSampleManifest, realDataSpecs, sampleTestMatch } from './scripts/sample-manifest'
import { ageText, webServerConfig, type WebServerDecision } from './scripts/web-server-config'

// One port per checkout (#124): two checkouts run specs at the same time without colliding on a fixed
// port, and this config passes its result to the server below through webServer.env.PORT. Explicit wins.
// resolvedPort probes once per invocation: workers re-evaluate this file and must agree with the runner.
const PORT = resolvedPort('MAIN', () => portFor(process.cwd(), process.env, tcpTaken, offsetFrom(process.env)))
const base = process.env.SITE_BASE ?? '/'
// local-bundle build (default) or production build: see README "CDN". Output directory differs so both can exist.
// OUT_DIR overrides it (#109: the sample build lives in dist-sample, alongside, never over dist).
const mode = process.env.E2E_MODE === 'production' ? 'production' : 'local'
const outDir = process.env.OUT_DIR ?? (mode === 'production' ? 'dist-production' : 'dist')
const webRoot = fileURLToPath(new URL('.', import.meta.url))

/**
 * E2E_PREBUILT=1 (#108) serves the build already in the output directory instead of rebuilding: re-running one
 * spec after a build starts in seconds. The existing build is only reused when its stamp
 * (`.build-stamps/<outDir>.json`, written by every `astro build`) still matches the environment and the tree —
 * any drift refuses to start and names the field. E2E_PREBUILT=force skips only the source-hash check.
 * Unset (CI) stays a fresh build. The decision itself lives in scripts/web-server-config.ts (pure, unit-tested).
 */
function webServerDecision(): WebServerDecision {
  const env = process.env
  const prebuilt = env.E2E_PREBUILT
  if (prebuilt === undefined || prebuilt === '') return webServerConfig(env, null, null)
  const stamp = readStamp(webRoot, outDir)
  const current = { ...stampInputs(env, webRoot, mode, outDir), outputExists: existsSync(resolve(webRoot, outDir)) }
  const decision = webServerConfig(env, stamp, current)
  if (decision.error) throw new Error(decision.error)
  // Playwright re-evaluates this file in every worker: announce once per invocation, like the port above.
  if (!env.E2E_PREBUILT_ANNOUNCED) {
    env.E2E_PREBUILT_ANNOUNCED = '1'
    if (prebuilt === 'force') console.log('E2E_PREBUILT=force: the source-hash check is skipped for this run')
    const age = ageText(Date.now() - Date.parse(stamp!.builtAt))
    console.log(
      `reusing build ${outDir} built ${age} ago: base ${stamp!.base}, mode ${stamp!.mode}, data ${stamp!.dataDir}, donation ${stamp!.donation === 'unset' ? 'unset' : 'set'}`,
    )
  }
  return decision
}

const server = webServerDecision()

export default defineConfig({
  testDir: 'e2e',
  // Only Playwright specs: the e2e/*.test.ts files are vitest (they are in the vitest include list).
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/data-guard-setup.ts',
  globalTeardown: './e2e/data-guard-teardown.ts',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Phone viewport used by EVERY check and screenshot. Reference images are 390x844 at scale 1.
    viewport: PHONE,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
  },
  webServer: {
    command: server.command,
    url: `http://localhost:${PORT}${base}`,
    reuseExistingServer: false,
    // Fresh build: the fixture build is ~0.5 s; the real-data build (5.760 cities × the card, three-cycle, share
    // and, since G6, the fact pages: 64.302 pages) takes ~5 min, so the budget covers its slowest variant.
    // E2E_PREBUILT drops it to one minute (scripts/web-server-config.ts).
    timeout: server.timeout,
    env: { PORT: String(PORT) },
  },
  projects: [
    { name: 'phone', testIgnore: /real-data|capture|cdn|desktop-/, use: { browserName: 'chromium' } },
    // The desktop suites (G10): a 1440x900 pointer-and-keyboard browser; each spec resizes for its own 390/768 checks.
    { name: 'desktop', testMatch: /desktop-/, use: { browserName: 'chromium', viewport: DESKTOP, isMobile: false, hasTouch: false } },
    { name: 'capture', testMatch: /capture/, use: { browserName: 'chromium' } },
    { name: 'real', testMatch: /real-data/, use: { browserName: 'chromium' } },
    // The real-data sample (#109): the real-data specs on disk minus sample.json's fullOnly, over the
    // .sample-data build. scripts/sample-manifest.test.ts guards the classification of every spec.
    { name: 'sample', testMatch: sampleTestMatch(loadSampleManifest(webRoot), realDataSpecs(webRoot)), use: { browserName: 'chromium' } },
  ],
})
