/**
 * The records of a page of the calculation (`/fato/...`) as the cards the desktop highlight (#62) shows beside a figure. Since private#214 the page is a stub and
 * its records are in the data file the page draws from, so the island reads that file (`factCardsOf`) instead of the page's HTML, and a phone still downloads none of it.
 * The sentences are drawn by the same module the page uses (`sentences/phrase.ts`), with the same subset of the catalog.
 */
import { drawPhrase, subsetTemplate, type CatalogSubset } from '../sentences/phrase'
import type { FactPageRecord } from './page-record'

export interface FactCard {
  anchor: string
  title: string
  sentences: { standard: string; plain: string }
  inputs: { label: string; value: string }[]
  formula: string
  worked: string[]
  /** The figure as the card prints it, when the record shows one apart from its title. */
  shown: string
}

export function factCardsOf(data: Pick<FactPageRecord, 'facts'>, words: CatalogSubset): FactCard[] {
  const template = subsetTemplate(words)
  const say = (part: Parameters<typeof drawPhrase>[0], register: 'standard' | 'plain') => drawPhrase(part, { locale: 'pt-BR', register }, template)
  return data.facts.map((f) => ({
    anchor: f.anchor,
    title: f.title,
    sentences: { standard: say(f.say, 'standard'), plain: say(f.say, 'plain') },
    inputs: f.inputs.map((i) => ({ label: i.label, value: i.value })),
    formula: f.calculation?.formula ?? '',
    worked: f.calculation?.worked ?? [],
    shown: f.shown && f.shown !== f.title ? f.shown : '',
  }))
}
