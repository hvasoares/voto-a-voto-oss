/**
 * The fixed words of the calculation page as phrases (private#214): the headings, the labels, the seal's title and note, the fixture banner and the source line. PURE
 * (the catalog is only a type here), so the client names the keys it needs without carrying the catalog: `integrations/fact-words.ts` cuts the subset of the catalog
 * that these phrases and the records' own sentences ask for, and `lib/fact-page-draw.ts` draws them with `sentences/phrase.ts`, the same code the build uses.
 */
import { phrase, type PhrasePart } from '../sentences/phrase'

export const FACT_UI = {
  title: phrase('fact.title'),
  inputs: phrase('fact.inputs'),
  formula: phrase('fact.formula'),
  id: phrase('fact.id'),
  rounding: phrase('fact.rounding'),
  neutral: phrase('fact.neutral'),
  source: phrase('fact.source'),
  sourceTse: phrase('fact.source.tse'),
  sourceFixture: phrase('fact.source.fixture'),
  sealTitle: phrase('seal.title'),
  sealNote: phrase('seal.note'),
  banner: phrase('shell.fixtureBanner'),
} as const

export const shownPhrase = (value: string) => phrase('fact.shown', { value })
export const editionPhrase = (date: string) => phrase('fact.edition', { date })
/** The accessible name of a place link (`place-words.ts` `placeName` fills `name`). */
export const placeLabelPhrase = (kind: 'uf' | 'regiao', name: string) => phrase(kind === 'uf' ? 'place.uf' : 'place.region', { name })

/** Every phrase the page asks for besides the records' own, for the subset of the catalog. */
export const FACT_UI_PHRASES: readonly PhrasePart[] = [
  ...Object.values(FACT_UI),
  shownPhrase(''),
  editionPhrase(''),
  placeLabelPhrase('uf', ''),
  placeLabelPhrase('regiao', ''),
]
