/**
 * The unit half of #133: the pure halves of the capture helper (captureFiles, sidecar, captureRef) and the
 * effect shell against a stub page in a temp dir — nested dirs, the contract keys in order, the unwritable
 * directory error, the fonts timeout recorded as fontsReady:false.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { afterEach, describe, expect, it } from 'vitest'
import { capture, captureDir, captureFiles, captureRef, findRawCaptureSteps, sidecar, waitFonts } from './capture'

const tmpDirs: string[] = []
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'capture-133-'))
  tmpDirs.push(d)
  return d
}
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

/** A page whose fonts never settle; evaluates everything else to 0; the "screenshot" is a fixed byte. */
const stubPage = (fonts: 'ready' | 'never'): Page =>
  ({
    evaluate: (fn: () => unknown) => (String(fn).includes('fonts') ? (fonts === 'ready' ? Promise.resolve(true) : new Promise(() => {})) : Promise.resolve(0)),
    screenshot: ({ path }: { path: string }) => Promise.resolve(writeFileSync(path, 'png-bytes')),
    viewportSize: () => ({ width: 390, height: 844 }),
  }) as unknown as Page

describe('captureFiles / captureRef', () => {
  it('builds the nested png/json pair under the root', () => {
    const { png, json } = captureFiles('slot-phone-full', 'reports/fixture', '/tmp/root')
    expect(png).toBe(resolve('/tmp/root', 'reports/fixture', 'slot-phone-full.png'))
    expect(json).toBe(resolve('/tmp/root', 'reports/fixture', 'slot-phone-full.json'))
  })

  it('the sidecar ref is the path relative to the root, with forward slashes', () => {
    expect(captureRef(resolve('/tmp/root', 'home', 'default.png'), '/tmp/root')).toBe('home/default.png')
  })
})

describe('sidecar', () => {
  it('writes the standard keys in contract order, extras last, pretty-printed with a trailing newline', () => {
    const text = sidecar({
      route: 'rj/',
      viewport: { width: 390, height: 844 },
      scrollY: 0,
      fullPage: false,
      capture: 'state/default.png',
      fontsReady: true,
      extra: { slot: 'state', state: 'default' },
    })
    expect(text).toBe(
      '{\n' +
        '  "route": "rj/",\n' +
        '  "viewport": {\n    "width": 390,\n    "height": 844\n  },\n' +
        '  "scrollY": 0,\n' +
        '  "fullPage": false,\n' +
        '  "capture": "state/default.png",\n' +
        '  "fontsReady": true,\n' +
        '  "slot": "state",\n' +
        '  "state": "default"\n' +
        '}\n',
    )
  })

  it('omits the keys the block never records', () => {
    expect(sidecar({ route: 'rf/', viewport: { width: 1, height: 2 }, fontsReady: true })).toContain('"fontsReady"')
    expect(sidecar({ route: 'rf/', viewport: { width: 1, height: 2 } })).not.toContain('fontsReady')
    expect(sidecar({ route: 'rf/', viewport: { width: 1, height: 2 } })).not.toContain('capture')
  })
})

describe('capture', () => {
  it('creates the nested dir and writes both files with the contract keys', async () => {
    const root = tmp()
    const { png, json, fontsReady } = await capture(stubPage('ready'), {
      dir: 'reports/fixture',
      name: 'slot-phone-full',
      route: 'relatorios/',
      scrollY: 'page',
      fullPage: true,
      root,
    })
    expect(fontsReady).toBe(true)
    expect(readFileSync(png, 'utf8')).toBe('png-bytes')
    const written = JSON.parse(readFileSync(json!, 'utf8'))
    expect(Object.keys(written)).toEqual(['route', 'viewport', 'scrollY', 'fullPage', 'capture', 'fontsReady'])
    expect(written.capture).toBe('reports/fixture/slot-phone-full.png')
    expect(written.scrollY).toBe(0)
  })

  it('throws "cannot write capture to <path>: <reason>" naming the png when the dir is blocked by a file', async () => {
    const root = tmp()
    writeFileSync(join(root, 'blocked'), 'not a directory')
    await expect(capture(stubPage('ready'), { dir: 'blocked', name: 'x', route: 'r/', root })).rejects.toThrow(
      /^cannot write capture to .*blocked.x\.png: /,
    )
  })

  it('records fontsReady:false and still captures when the fonts promise never resolves', async () => {
    const root = tmp()
    const { png, json, fontsReady } = await capture(stubPage('never'), { dir: 'd', name: 'x', route: 'r/', root, fontsTimeout: 50 })
    expect(fontsReady).toBe(false)
    expect(readFileSync(png, 'utf8')).toBe('png-bytes')
    expect(JSON.parse(readFileSync(json!, 'utf8')).fontsReady).toBe(false)
  })

  it('writes the png buffer instead of screenshotting when bytes are given', async () => {
    const root = tmp()
    const { png } = await capture(stubPage('ready'), { dir: 'd', name: 'raster', route: 'r/', png: Buffer.from('raster-bytes'), fonts: false, root })
    expect(readFileSync(png, 'utf8')).toBe('raster-bytes')
  })

  it('writes no sidecar when sidecar:false, whatever the route', async () => {
    const root = tmp()
    const { json } = await capture(stubPage('ready'), { dir: 'd', name: 'plain', sidecar: false, root })
    expect(json).toBeUndefined()
  })

  it('captureDir mkdirs alone and rejects a blocked dir with the path in the message', () => {
    const root = tmp()
    expect(captureDir('a/b', root)).toBe(resolve(root, 'a/b'))
    writeFileSync(join(root, 'file'), 'x')
    expect(() => captureDir('file/inner', root)).toThrow(/^cannot write capture to /)
  })

  it('removes the png when the sidecar step fails, so no capture exists without its sidecar', async () => {
    const root = tmp()
    await expect(capture(stubPage('ready'), { dir: 'd', name: 'x', sidecar: true, root })).rejects.toThrow('route')
    expect(() => readFileSync(resolve(root, 'd', 'x.png'))).toThrow()
  })
})

describe('waitFonts', () => {
  it('resolves true on ready fonts and false on timeout', async () => {
    expect(await waitFonts(stubPage('ready'))).toBe(true)
    expect(await waitFonts(stubPage('never'), 30)).toBe(false)
  })
})

describe('findRawCaptureSteps (seeded violations)', () => {
  it('catches one fixture per raw step', () => {
    expect(findRawCaptureSteps("mkdirSync(resolve('.captures', 'home'), { recursive: true })", 'f.spec.ts').map((f) => f.step)).toEqual(['mkdir-captures'])
    expect(findRawCaptureSteps("writeFileSync(resolve(dir, 'default.json'), '{}')", 'f.spec.ts').map((f) => f.step)).toEqual(['sidecar-write'])
    expect(findRawCaptureSteps('await page.evaluate(() => document.fonts.ready)', 'f.spec.ts').map((f) => f.step)).toEqual(['fonts-ready'])
    expect(findRawCaptureSteps("await page.screenshot({ path: resolve('.captures', 'home', 'default.png'), animations: 'disabled' })", 'f.spec.ts').map((f) => f.step)).toEqual([
      'screenshot-to-captures',
    ])
  })

  it('names the file and the 1-based line in every finding', () => {
    const [finding] = findRawCaptureSteps('// a comment\ndocument.fonts.ready', 'capture-x.spec.ts')
    expect(finding!.file).toBe('capture-x.spec.ts')
    expect(finding!.line).toBe(2)
  })

  it('leaves non-capture screenshots and the helper spelling alone', () => {
    const clean = [
      "import { capture, captureDir } from './capture'",
      "await capture(page, { dir: 'home', name: 'default', route: base, scrollY: 'page' })",
      "const dir = captureDir('cards')",
      "await page.screenshot({ animations: 'disabled' }) // no path: a buffer for an in-test comparison",
      "await page.screenshot({ path: 'test-results/diff.png' }) // a comparison screenshot, not a capture",
      "writeFileSync(resolve('test-results', 'summary.txt'), 'x') // not a .json sidecar",
    ].join('\n')
    expect(findRawCaptureSteps(clean, 'f.spec.ts')).toEqual([])
  })
})
