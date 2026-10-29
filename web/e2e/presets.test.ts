/**
 * Unit side of #132: the presets keep their exact values (and stay in sync with the census script's
 * PRESET_VALUES), the notice helper writes the product key/value through an init script, and the data guard
 * skips, counts, or throws in CI exactly per its contract.
 */
import type { Page } from '@playwright/test'
import { afterEach, describe, expect, it } from 'vitest'
import { NOTICE_ACKNOWLEDGED_VALUE, NOTICE_STORAGE_KEY } from '../src/lib/storage-keys'
import { PRESET_VALUES } from '../scripts/e2e-literals'
import * as presets from './presets'

const { acknowledgeNotice, dataGuard, noJs, viewport, PHONE, DESKTOP } = presets

const ENV_KEYS = ['CI', 'DATA_DIR'] as const
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

describe('presets', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('the census script maps every exported viewport constant to its exact value', () => {
    const exported = Object.fromEntries(
      Object.entries(presets).filter(([, v]) => v !== null && typeof v === 'object' && 'width' in v && 'height' in v),
    )
    expect(exported).toEqual(PRESET_VALUES)
  })

  it('viewport(w, h) is the parameterised form', () => {
    expect(viewport(768, 600)).toEqual({ width: 768, height: 600 })
  })

  it('PHONE and DESKTOP are the two frames of the projects', () => {
    expect(PHONE).toEqual({ width: 390, height: 844 })
    expect(DESKTOP).toEqual({ width: 1440, height: 900 })
  })

  it('noJs() is the no-JavaScript context option, spreadable with more options', () => {
    expect(noJs()).toEqual({ javaScriptEnabled: false })
    expect(noJs({ viewport: PHONE, locale: 'pt-BR' })).toEqual({ javaScriptEnabled: false, viewport: PHONE, locale: 'pt-BR' })
  })

  it('acknowledgeNotice writes NOTICE_STORAGE_KEY as acknowledged through an init script', async () => {
    let capturedFn: ((arg: [string, string]) => void) | undefined
    let capturedArg: [string, string] | undefined
    const page = {
      addInitScript(fn: (arg: [string, string]) => void, arg: [string, string]) {
        capturedFn = fn
        capturedArg = arg
        return Promise.resolve()
      },
    } as unknown as Page
    await acknowledgeNotice(page)
    const written: Record<string, string> = {}
    ;(globalThis as Record<string, unknown>).localStorage = {
      setItem: (key: string, value: string) => {
        written[key] = value
      },
    }
    capturedFn!(capturedArg!)
    delete (globalThis as Record<string, unknown>).localStorage
    expect(capturedArg).toEqual([NOTICE_STORAGE_KEY, NOTICE_ACKNOWLEDGED_VALUE])
    expect(written).toEqual({ [NOTICE_STORAGE_KEY]: NOTICE_ACKNOWLEDGED_VALUE })
  })

  it('dataGuard runs when the dataset is there and skips with its reason when it is not', () => {
    delete process.env.DATA_DIR
    delete process.env.CI
    expect(dataGuard('cities.csv', 'fixtures/data')[0]).toBe(false)
    expect(dataGuard('votes.csv', 'fixtures/data')[0]).toBe(false)
    const [skip, reason] = dataGuard('no-such-file.csv', 'fixtures/data')
    expect(skip).toBe(true)
    expect(reason).toBe('no fixtures/data/no-such-file.csv')
  })

  it('dataGuard defaults to DATA_DIR, else ../data', () => {
    delete process.env.CI
    process.env.DATA_DIR = 'fixtures/data'
    expect(dataGuard()[0]).toBe(false)
    delete process.env.DATA_DIR
    const [skip, reason] = dataGuard('no-such-file.csv')
    expect(skip).toBe(true)
    expect(reason).toBe('no ../data/no-such-file.csv')
  })

  it('a null dir means the run must name its data: always skipped without DATA_DIR, in any environment', () => {
    delete process.env.DATA_DIR
    const [skip, reason] = dataGuard('cities.csv', process.env.DATA_DIR ?? null)
    expect(skip).toBe(true)
    expect(reason).toBe('no DATA_DIR/cities.csv')
  })

  it('in CI a missing tracked directory is an error, not a skip', () => {
    process.env.CI = 'true'
    expect(() => dataGuard('no-such-file.csv', '../data')).toThrow('data directory ../data missing in CI')
    expect(() => dataGuard('no-such-file.csv', 'fixtures/data')).toThrow('data directory fixtures/data missing in CI')
    // the DATA_DIR-required guards stay skips in CI (npm run test:real is not a CI job)
    delete process.env.DATA_DIR
    expect(dataGuard('cities.csv', null)[0]).toBe(true)
  })
})
