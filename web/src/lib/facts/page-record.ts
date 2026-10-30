/**
 * A calculation page as DATA (private#212, the lighter-site milestone): what `data/v<fingerprint>/fato/<scope>/<page>.json` holds. PURE, no file system.
 * It is the page's sealed record, made of what the page prints that is not a sentence: for each fact its id, anchor, title, the figure as shown, the
 * inputs (label, dataset field, value), the formula and its worked lines, the source, the method note and the checks it names; for the page the places
 * it belongs to, the rounds, the seal and the edition. The sentence of a fact is not stored as text: `say` holds the catalog keys and the numbers it is made
 * of (private#213), and `lib/sentences/phrase.ts` draws it in either register, the same code in the build and in the browser, so no wording is stored twice.
 * The subtitle, the way-back label and the page's limits note are not in the file yet. Nothing is computed here; it only drops the drawn sentences.
 */
import type { Fact } from './model'
import type { SealedPage } from './pages'

export type FactRecord = Omit<Fact, 'sentences' | 'scope' | 'page'>

export interface FactPageRecord {
  scope: string
  page: string
  /** The place or the page's name (what the page's title line is made of). */
  title: string
  /** Site-relative address of the page the numbers are on (the label is a catalog sentence). */
  backPath: string
  fixture: boolean
  rounds: SealedPage['rounds']
  /** The "conferido" seal lines, made by the build from its checks. */
  seal: string[]
  edition: { id: string; date: string }
  facts: FactRecord[]
}

const recordOf = ({ sentences: _sentences, scope: _scope, page: _page, ...rest }: Fact): FactRecord => rest

export function factPageRecord(page: SealedPage, edition: FactPageRecord['edition']): FactPageRecord {
  return {
    scope: page.scope,
    page: page.page,
    title: page.title,
    backPath: page.back.path,
    fixture: page.fixture,
    rounds: page.rounds,
    seal: page.seal,
    edition,
    facts: page.facts.map(recordOf),
  }
}
