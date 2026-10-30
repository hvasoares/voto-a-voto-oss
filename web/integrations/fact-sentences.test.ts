import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, template } from '../src/lib/sentences/catalog'
import { catalogSubset, drawPhrase, subsetTemplate, type PhrasePart } from '../src/lib/sentences/phrase'
import { REGISTERS } from '../src/lib/sentences/voice'
import { loadFactPages } from '../src/lib/facts/pages'
import { pageDataFiles } from './page-data'
import { FACT_FAMILY, factPageRecords } from './fact-pages'

/**
 * The sentences of the records, drawn from the data file (private#213). `fact-sentences.golden.json` is the text the build printed for every fixture fact
 * before the sentences moved to one module (`lib/sentences/phrase.ts`), in both registers; a sentence that differs by one character fails here. The
 * file is the only input of the drawing: the sentences are drawn from the `say` of each fact with the SUBSET of the catalog the files need, which is
 * all the browser ships for them.
 */
const GOLDEN: Record<string, Record<'standard' | 'plain', string>> = JSON.parse(readFileSync(new URL('./__snapshots__/fact-sentences.golden.json', import.meta.url), 'utf8'))
const FP = '0123456789abcdef'
const filesOf = async () => pageDataFiles(FP, FACT_FAMILY, await factPageRecords())
type FileFact = { id: string; say: PhrasePart }
const factsOfFiles = async () => (await filesOf()).flatMap((f) => (JSON.parse(f.json).data.facts as FileFact[]).map((fact) => ({ path: f.path, ...fact })))

describe('the sentences drawn from the data files are the ones the build prints', () => {
  it('equal the golden for every fixture fact, in both registers, character by character', async () => {
    const facts = await factsOfFiles()
    const subset = catalogSubset(facts.map((f) => f.say), DEFAULT_LOCALE, template)
    const subsetOnly = subsetTemplate(subset)
    expect(facts.length).toBe(Object.keys(GOLDEN).length)
    for (const fact of facts)
      for (const register of REGISTERS) {
        const drawn = drawPhrase(fact.say, { locale: DEFAULT_LOCALE, register }, subsetOnly)
        expect(drawn, `${fact.id} (${register})`).toBe(GOLDEN[fact.id]![register])
      }
  })

  it('are the ones the records print on the pages (`sentences`), and the full catalog draws the same as the subset', async () => {
    const files = new Map((await factsOfFiles()).map((f) => [f.id, f.say]))
    for (const page of await loadFactPages())
      for (const fact of page.facts)
        for (const register of REGISTERS) {
          expect(fact.sentences[register], `${fact.id} (${register})`).toBe(GOLDEN[fact.id]![register])
          expect(drawPhrase(files.get(fact.id)!, { locale: DEFAULT_LOCALE, register }, template), `${fact.id} (${register})`).toBe(fact.sentences[register])
        }
  })

  it('cover every kind of record: the city card, the curiosities, Brasil e regiões, the comparisons, the state cycles and the reports', () => {
    const ids = Object.keys(GOLDEN)
    const kinds: Record<string, RegExp> = {
      'city card measures': /^\w\w\/[\w-]+\/2026-[12]\/(frase|votaram|naoVotaram|margem|abstencao)$/,
      curiosities: /\/comparacoes\//,
      'Brasil e regiões': /^(brasil|regiao\/[\w-]+)\//,
      comparisons: /^comparar\/\d+\//,
      'state cycles': /^estado\/\w\w\/tres-ciclos\//,
      'earlier cycles': /^metodo\/ciclos-anteriores\//,
      'state count': /^estado\/\w\w\/municipios\//,
      reports: /^relatorios\//,
    }
    for (const [kind, re] of Object.entries(kinds)) expect(ids.filter((id) => re.test(id)).length, kind).toBeGreaterThan(0)
  })

  it('differ between the registers where the catalog has two wordings, and both are drawn', () => {
    expect(Object.values(GOLDEN).some((s) => s.standard !== s.plain)).toBe(true)
    expect(Object.values(GOLDEN).every((s) => s.standard !== '' && s.plain !== '')).toBe(true)
  })
})

describe('what the browser ships for the sentences', () => {
  it('is a subset of the catalog: only the keys the records ask for, at most 8 KB gzipped', async () => {
    const facts = await factsOfFiles()
    const subset = catalogSubset(facts.map((f) => f.say), DEFAULT_LOCALE, template)
    const json = JSON.stringify(subset)
    const gz = gzipSync(json).length
    const keys = Object.keys(subset.standard).length
    console.info(`sentence subset: ${keys} keys, ${json.length} B raw, ${gz} B gzipped`)
    expect(keys).toBeGreaterThan(10)
    expect(keys).toBeLessThan(120)
    expect(gz).toBeLessThan(8 * 1024)
  })
})
