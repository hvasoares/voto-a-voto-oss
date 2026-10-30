// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { drawFactPage, lightFragment } from '../src/lib/fact-page-draw'
import { drawBoth } from '../src/lib/facts/model'
import { loadFactPages } from '../src/lib/facts/pages'
import type { FactPageRecord } from '../src/lib/facts/page-record'
import { editionLabel } from '../src/lib/editions'
import { placeExceptions } from '../src/lib/place-except'
import { placeLinkHtml, splitPlaces } from '../src/lib/place-link'
import { message } from '../src/lib/sentences/catalog'
import { REGISTERS } from '../src/lib/sentences/voice'
import type { Phrase, PhrasePart } from '../src/lib/sentences/phrase'
import { pageDataFiles } from './page-data'
import { FACT_FAMILY, factPageRecords } from './fact-pages'
import { factWords } from './fact-words'

/**
 * The calculation page drawn on the client (private#214), compared with the records it is drawn from. The file is the only input: the records go through JSON as
 * the writer does, the words are the subset the build cuts (`integrations/fact-words.ts`), and the expected text is what the build printed for the same record
 * (`Fact.sentences`, the formula, the inputs, the seal lines), with the place links the old page made through `PlaceText` (`placeLinkHtml`, the catalog's own anchor).
 * Sampled by kind: one page of each family of pages, then pages added until every kind of record (the catalog key a sentence is made of) is drawn at least once.
 */
const FP = '0123456789abcdef'
const std = { locale: 'pt-BR', register: 'standard' } as const
const kindOf = (part: PhrasePart): string => (Array.isArray(part) ? kindOf(part[0]!) : (part as Phrase).k)
const familyOf = (p: { scope: string }) => p.scope.split('/')[0] === 'relatorios' ? p.scope : /^[a-z]{2}$/.test(p.scope.split('/')[0]!) && p.scope.includes('/') ? 'cidade' : p.scope.split('/')[0]!

const draw = (data: FactPageRecord, words: Awaited<ReturnType<typeof factWords>>) => {
  document.body.innerHTML = '<main><h1>Cálculo dos números · x · Voto a Voto</h1><div data-stub-area><div data-stub-content id="host"></div></div><a data-stub-back href="#">‹ Cartão da cidade</a></main>'
  const host = document.getElementById('host')!
  drawFactPage(words)(data, host)
  return host
}

async function sample() {
  const files = new Map((await pageDataFiles(FP, FACT_FAMILY, await factPageRecords())).map((f) => [f.path.slice(`v${FP}/${FACT_FAMILY}/`.length, -'.json'.length), JSON.parse(f.json).data as FactPageRecord]))
  const pages = await loadFactPages()
  const picked = new Map<string, (typeof pages)[number]>()
  for (const p of pages) if (!picked.has(familyOf(p))) picked.set(familyOf(p), p)
  const seen = new Set([...picked.values()].flatMap((p) => p.facts.map((f) => kindOf(f.say))))
  for (const p of pages) {
    const kinds = p.facts.map((f) => kindOf(f.say))
    if (kinds.some((k) => !seen.has(k))) {
      picked.set(`more:${p.scope}/${p.page}`, p)
      kinds.forEach((k) => seen.add(k))
    }
  }
  const all = new Set(pages.flatMap((p) => p.facts.map((f) => kindOf(f.say))))
  return { picked: [...picked.values()], files, seen, all }
}

describe('the page drawn from the file is the page the records describe', () => {
  it('samples every kind of page and every kind of record', async () => {
    const { picked, seen, all } = await sample()
    expect(picked.length).toBeGreaterThan(5)
    expect([...all].filter((k) => !seen.has(k))).toEqual([])
  })

  it('draws, record by record, the sentence in both registers, the inputs, the formula, the worked lines and the id, with the place links of the build', async () => {
    const { picked, files } = await sample()
    const words = await factWords()
    const except = await placeExceptions()
    // The markup the old page made (`PlaceText`: the catalog's own anchor), as the browser serialises it.
    const placed = (text: string) => {
      const t = document.createElement('template')
      t.innerHTML = splitPlaces(text, except).map((s) => ('place' in s && s.place ? placeLinkHtml(s.place, { text: s.text }).toString() : s.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))).join('')
      return t.innerHTML
    }
    for (const page of picked) {
      const host = draw(files.get(`${page.scope}/${page.page}`)!, words)
      const sections = [...host.querySelectorAll<HTMLElement>('.fact')]
      expect(sections.map((s) => s.dataset.fact), page.scope).toEqual(page.facts.map((f) => f.id))
      page.facts.forEach((f, i) => {
        const s = sections[i]!
        expect(s.id).toBe(f.anchor)
        for (const register of REGISTERS) expect(s.querySelector(`.fact__sentence[data-register="${register}"]`)!.innerHTML, `${f.id} ${register}`).toBe(placed(f.sentences[register]))
        expect(s.querySelector('.fact__title')!.innerHTML).toBe(placed(f.title))
        expect(s.querySelector('.fact__formula')!.innerHTML).toBe(placed(f.calculation!.formula))
        expect([...s.querySelectorAll('.fact__worked li')].map((li) => li.innerHTML)).toEqual(f.calculation!.worked.map(placed))
        expect([...s.querySelectorAll('.fact__inputs > div')].map((d) => [d.querySelector('dt')!.firstChild!.textContent, d.querySelector('small')?.textContent ?? null, d.querySelector('dd')!.textContent])).toEqual(
          f.inputs.map((x) => [x.label, x.field ?? null, x.value]),
        )
        expect(s.querySelector('.fact__id code')!.textContent).toBe(f.id)
        expect(s.querySelector('.fact__shown') !== null).toBe(Boolean(f.shown && f.shown !== f.title))
      })
    }
  })

  it('draws the subtitle, the limits, the seal, the sources, the edition and the footer of the page from the file, the seal exactly as the build wrote it', async () => {
    const { picked, files } = await sample()
    const words = await factWords()
    for (const page of picked) {
      const data = files.get(`${page.scope}/${page.page}`)!
      const host = draw(data, words)
      expect(host.querySelector('.page__subtitle')!.textContent).toBe(drawBoth(page.subtitle).standard)
      expect(host.querySelector('[data-limits]')?.textContent ?? null).toBe(page.note === undefined ? null : drawBoth(page.note).standard)
      expect([...host.querySelectorAll('[data-seal] li')].map((li) => li.textContent)).toEqual(page.seal)
      if (page.seal.length > 0) {
        expect(host.querySelector('[data-seal] h2')!.textContent).toBe(`✓ ${message(std, 'seal.title')}`)
        expect(host.querySelector('.seal__note')!.textContent).toBe(message(std, 'seal.note'))
      }
      expect(host.querySelector('.fact__rounding')!.textContent).toBe(message(std, 'fact.rounding'))
      const links = [...host.querySelectorAll<HTMLAnchorElement>('.fact__links a')]
      for (const f of page.facts) expect(links.some((a) => a.textContent === `${f.source!.name} ›` && a.getAttribute('href') === f.source!.url)).toBe(true)
      expect(host.querySelector('[data-edition-link]')!.textContent).toBe(`${message(std, 'fact.edition', { date: editionLabel(data.edition) })} ›`)
      expect(host.querySelector('footer')!.textContent).toContain(message(std, page.fixture ? 'fact.source.fixture' : 'fact.source.tse'))
      expect(host.querySelector('.banner') !== null).toBe(page.fixture)
      expect(document.querySelector('main > h1')!.textContent).toBe(message(std, 'fact.title'))
    }
  })

  it('shows the file and not a copy: nothing the page says is in the stub, and a file with another seal draws that seal', async () => {
    const { files } = await sample()
    const words = await factWords()
    const [first] = [...files.values()]
    const host = draw({ ...first!, seal: ['uma linha qualquer'] }, words)
    expect([...host.querySelectorAll('[data-seal] li')].map((li) => li.textContent)).toEqual(['uma linha qualquer'])
  })
})

describe('the fragment', () => {
  it('lights the record the address names once the content is drawn, and does nothing for an address that names none', async () => {
    const { files } = await sample()
    const words = await factWords()
    const data = [...files.values()].find((d) => d.facts.length > 1)!
    const anchor = data.facts[1]!.anchor
    history.replaceState(null, '', `/fato/x/#${anchor}`)
    const host = draw(data, words)
    expect(document.querySelector(':target')).toBe(host.querySelector(`#${CSS.escape(anchor)}`))
    history.replaceState(null, '', '/fato/x/#nao-existe')
    expect(() => lightFragment(document)).not.toThrow()
  })
})

describe('the script of the page carries the words it draws with and not the catalog', () => {
  const SRC = resolve(import.meta.dirname, '../src')
  const imports = (file: string): string[] =>
    [...readFileSync(file, 'utf8').matchAll(/^(?:import|export)\s(?!type\b)[^'"\n]*?['"]([^'"]+)['"]/gm)].map((m) => m[1]!).filter((s) => s.startsWith('@/') || s.startsWith('.')).map((s) => {
      const abs = s.startsWith('@/') ? resolve(SRC, s.slice(2)) : resolve(dirname(file), s)
      return ['.ts', '.tsx', ''].map((e) => abs + e).find((c) => { try { return readFileSync(c) && c.match(/\.tsx?$/) } catch { return false } }) ?? abs
    })
  function graph(entry: string, seen = new Set<string>()): Set<string> {
    if (seen.has(entry)) return seen
    seen.add(entry)
    if (/\.tsx?$/.test(entry)) for (const next of imports(entry)) graph(next, seen)
    return seen
  }
  it('has no module of the catalog in its import graph', () => {
    const files = [...graph(resolve(SRC, 'scripts/fact-page.ts'))].map((f) => f.slice(SRC.length + 1))
    expect(files.filter((f) => /^lib\/sentences\/catalog/.test(f) || /^lib\/sentences\/(headline|margin)\.ts$/.test(f))).toEqual([])
    expect(files).toContain('lib/sentences/phrase.ts')
  })
})
