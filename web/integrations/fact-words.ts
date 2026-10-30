import type { Plugin } from 'vite'
import '../src/lib/sentences/catalog-shell'
import '../src/lib/sentences/catalog-region'
import { loadFactPages } from '../src/lib/facts/pages'
import { FACT_UI_PHRASES } from '../src/lib/facts/page-ui'
import { catalogSubset, type CatalogSubset, type PhrasePart } from '../src/lib/sentences/phrase'
import { DEFAULT_LOCALE, template } from '../src/lib/sentences/catalog'

export const FACT_WORDS_VIRTUAL_ID = 'virtual:fact-words'

/**
 * The words the calculation page's client draws with (private#214): the subset of the catalog that the page's fixed words and every record's sentence of this build ask
 * for, in both registers. It is cut from the same records the data files are written from, so a key a file asks for is always in it, and the browser never carries the catalog.
 */
export async function factWords(): Promise<CatalogSubset> {
  const parts: PhrasePart[] = [...FACT_UI_PHRASES]
  for (const p of await loadFactPages()) parts.push(p.subtitle, ...(p.note === undefined ? [] : [p.note]), ...p.facts.map((f) => f.say))
  return catalogSubset(parts, DEFAULT_LOCALE, template)
}

/** `virtual:fact-words`: the subset as the default export of a module of the page script. */
export function factWordsModule(): Plugin {
  const id = `\0${FACT_WORDS_VIRTUAL_ID}`
  return {
    name: 'voto-fact-words',
    resolveId: (source) => (source === FACT_WORDS_VIRTUAL_ID ? id : undefined),
    load: async (source) => (source === id ? `export default ${JSON.stringify(await factWords())}` : undefined),
  }
}
