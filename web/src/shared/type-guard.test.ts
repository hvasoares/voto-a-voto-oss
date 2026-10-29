import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RULES } from './type-guard-rules'

/*
 * The contract of the type scale (#86, #87): the UI code carries NO one-off typographic value. Sizes, line heights and weights come from
 * the tokens (`--step-n`, `--lh-n`, `--fw-*`, Tailwind `text-step-n`, `font-normal`/`font-bold`); this test reads every source file and
 * fails on a value that is not one of them. The expand-contract refactor of the type scale is closed by it: add a size and it fails.
 *
 * ALLOW-LIST (each entry says why; nothing else is allowed):
 *  - src/lib/share-card.ts, src/lib/press-kit.ts: they WRITE the 1080-wide print pictures (share poster, link preview, press seal) as SVG files;
 *    those pictures have their own scale in picture units and are saved and shared, never read as page text.
 *  - src/shared/type-guard-rules.ts: it IS the list of forbidden patterns, so it names them (#130).
 *  - `mm` and viewport units (`vh`, `vw`, `vmin`) are not px values: the print sheets (`/imprensa/cartaz/`, `/imprensa/folha/`) are sized in
 *    millimetres, the broadcast overlay and the duel stage in viewport units; the rules below only look for px/rem/em one-offs.
 *  - `clamp(...vh...)` sizes: the duel stage (`styles/duel.css`) is a full-screen display for a projector, sized by the screen height, like the overlay;
 *  - map labels are `fontSize={LABEL}`/`calc(var(--step-1) * var(--uk))`: expressions, not literals: they are the step AS DRAWN (see labelUnits).
 */
const SRC = join(__dirname, '..')
const PICTURE_WRITERS = ['lib/share-card.ts', 'lib/press-kit.ts']

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(astro|tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}


describe('no one-off typography in the UI code (type scale contract, #87)', () => {
  const all = files(SRC).map((path) => ({ rel: relative(SRC, path), text: readFileSync(path, 'utf8') }))

  it('reads the source tree', () => {
    expect(all.length).toBeGreaterThan(200)
  })

  for (const { what, re } of RULES) {
    it(`no source file has ${what}`, () => {
      const hits = all
        .filter(({ rel }) => !PICTURE_WRITERS.includes(rel) && !rel.endsWith('shared/tokens.ts') && !rel.endsWith('shared/type-guard-rules.ts'))
        .flatMap(({ rel, text }) => text.split('\n').flatMap((line, i) => (re.test(line) && !line.includes('clamp(') ? [`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`] : [])))
      expect(hits).toEqual([])
    })
  }

  it('every rule catches the value it is written for (the guard is not vacuous)', () => {
    const bad = ['text-[13px]', 'leading-[18px]', 'text-sm', 'text-small', 'font-medium', 'font-weight: 600', 'font-size: 14px', 'font: 700 13px var(--f)', 'line-height: 18px', 'fontSize={12}', '--fs-body', '--sketch-text-body']
    expect(RULES.map(({ re }) => bad.filter((b) => re.test(b)).length).every((n) => n > 0)).toBe(true)
    expect(RULES.some(({ re }) => ['text-step-2', 'font-bold', 'font: 400 var(--step-1)/var(--lh-1) x', 'fontSize={LABEL}', 'leading-none-x'].slice(0, 4).some((ok) => re.test(ok)))).toBe(false)
  })

  it('the picture writers are the only files with literal SVG font sizes', () => {
    const writers = all.filter(({ rel }) => PICTURE_WRITERS.includes(rel))
    expect(writers.length).toBe(PICTURE_WRITERS.length)
  })
})
