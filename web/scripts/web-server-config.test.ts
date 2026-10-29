/**
 * Unit tests of the E2E webServer decision (ticket #108): pure, no build on disk. The default-path tests are
 * the regression guard CI depends on — the command and the 600 000 ms timeout are byte-for-byte what the
 * pre-#108 config produced.
 */
import { describe, expect, it } from 'vitest'
import { ageText, webServerConfig, type BuildStamp, type CurrentInputs } from './web-server-config'

const stamp: BuildStamp = {
  sourceHash: 'a'.repeat(64),
  base: '/',
  mode: 'local',
  dataDir: '/checkout/web/fixtures/data',
  dataHash: 'b'.repeat(64),
  donation: 'unset',
  outDir: 'dist',
  builtAt: '2026-10-28T12:00:00.000Z',
}

const current: CurrentInputs = {
  sourceHash: stamp.sourceHash,
  base: '/',
  mode: 'local',
  dataDir: '/checkout/web/fixtures/data',
  dataHash: stamp.dataHash,
  donation: 'unset',
  outDir: 'dist',
  outputExists: true,
}

describe('webServerConfig without the switch (default, CI)', () => {
  it('builds and serves, byte-for-byte the pre-#108 command, with the 10-minute build budget', () => {
    expect(webServerConfig({}, null, null)).toEqual({
      command: 'OUT_DIR=dist BUILD_TARGET=local npx astro build && OUT_DIR=dist npx tsx scripts/serve.ts',
      timeout: 600_000,
    })
  })

  it('E2E_MODE=production keeps the production build command and budget, also byte-for-byte', () => {
    expect(webServerConfig({ E2E_MODE: 'production' }, null, null)).toEqual({
      command: 'OUT_DIR=dist-production BUILD_TARGET=production npx astro build && OUT_DIR=dist-production npx tsx scripts/serve.ts',
      timeout: 600_000,
    })
  })

  it('an empty switch is the same as unset', () => {
    expect(webServerConfig({ E2E_PREBUILT: '' }, null, null).command).toContain('astro build')
  })
})

describe('webServerConfig with E2E_PREBUILT', () => {
  it('serves the existing build with no astro build and a one-minute budget when everything matches', () => {
    const decision = webServerConfig({ E2E_PREBUILT: '1' }, stamp, current)
    expect(decision.error).toBeUndefined()
    expect(decision.command).toBe('OUT_DIR=dist npx tsx scripts/serve.ts')
    expect(decision.command).not.toContain('astro build')
    expect(decision.timeout).toBe(60_000)
  })

  it('keeps dist-production apart: production runs read the production stamp and serve dist-production', () => {
    const env = { E2E_PREBUILT: '1', E2E_MODE: 'production' }
    const prodStamp = { ...stamp, mode: 'production', outDir: 'dist-production' }
    const prodCurrent = { ...current, mode: 'production', outDir: 'dist-production' }
    expect(webServerConfig(env, prodStamp, prodCurrent)).toEqual({
      command: 'OUT_DIR=dist-production npx tsx scripts/serve.ts',
      timeout: 60_000,
    })
    expect(webServerConfig(env, stamp, prodCurrent).error).toBe(
      'prebuilt dist-production was built for mode "local" but this run has "production"',
    )
  })

  it('refuses a base mismatch, naming the field and both values', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, stamp, { ...current, base: '/voto-a-voto-oss/' }).error).toBe(
      'prebuilt dist was built for base "/" but this run has "/voto-a-voto-oss/"',
    )
  })

  it('refuses a mode mismatch', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, { ...stamp, mode: 'production' }, current).error).toBe(
      'prebuilt dist was built for mode "production" but this run has "local"',
    )
  })

  it('refuses a data dir mismatch', () => {
    const decision = webServerConfig({ E2E_PREBUILT: '1' }, stamp, { ...current, dataDir: '/checkout/data' })
    expect(decision.error).toBe('prebuilt dist was built with data dir "/checkout/web/fixtures/data" but this run has "/checkout/data"')
  })

  it('refuses when the dataset changed since the build (same dir, different hash)', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, stamp, { ...current, dataHash: 'c'.repeat(64) }).error).toBe(
      'the dataset in /checkout/web/fixtures/data changed since the build of dist: run npm run build',
    )
  })

  it('refuses a donation mismatch', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, stamp, { ...current, donation: 'd'.repeat(64) }).error).toBe(
      'prebuilt dist was built with donation unset but this run has set',
    )
  })

  it('refuses when the source changed since the build', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, stamp, { ...current, sourceHash: 'e'.repeat(64) }).error).toBe(
      'source changed since the build: run npm run build',
    )
  })

  it('refuses a missing stamp', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, null, current).error).toBe(
      'no prebuilt site at dist: run "npm run build" first, or unset E2E_PREBUILT',
    )
  })

  it('refuses a missing output folder even when the stamp exists', () => {
    expect(webServerConfig({ E2E_PREBUILT: '1' }, stamp, { ...current, outputExists: false }).error).toBe(
      'no prebuilt site at dist: run "npm run build" first, or unset E2E_PREBUILT',
    )
  })

  it('force skips only the source-hash comparison', () => {
    const decision = webServerConfig({ E2E_PREBUILT: 'force' }, stamp, { ...current, sourceHash: 'e'.repeat(64) })
    expect(decision.error).toBeUndefined()
    expect(decision.command).toBe('OUT_DIR=dist npx tsx scripts/serve.ts')
    expect(decision.timeout).toBe(60_000)
    // …but a drifted base still refuses under force.
    expect(webServerConfig({ E2E_PREBUILT: 'force' }, stamp, { ...current, base: '/voto-a-voto/' }).error).toContain('base')
  })

  it('refuses any other spelling of the switch', () => {
    expect(webServerConfig({ E2E_PREBUILT: 'yes' }, stamp, current).error).toBe('E2E_PREBUILT must be 1 or force (got "yes")')
  })
})

describe('ageText', () => {
  it('shortens the age for the reusing-build line', () => {
    expect(ageText(41_000)).toBe('41s')
    expect(ageText(3 * 60_000)).toBe('3m')
    expect(ageText(5 * 3_600_000)).toBe('5h')
    expect(ageText(2 * 86_400_000)).toBe('2d')
    expect(ageText(-1_000)).toBe('0s')
  })
})
