/**
 * A calculation page as DATA (private#212, the lighter-site milestone): what `data/v<fingerprint>/fato/<scope>/<page>.json` holds. PURE, no file system.
 * It is the page's sealed record, made of what the page prints that is not a sentence: for each fact its id, anchor, title, the figure as shown, the
 * inputs (label, dataset field, value), the formula and its worked lines, the source, the method note and the checks it names; for the page the places
 * it belongs to, the rounds, the seal and the edition. The sentence of a fact is not stored as text: `say` holds the catalog keys and the numbers it is made
 * of (private#213), and `lib/sentences/phrase.ts` draws it in either register, the same code in the build and in the browser, so no wording is stored twice.
 * The page's own sentences are data too (private#214): the subtitle and the limits note are phrases, drawn by the same module; the way-back label is the stub's
 * (a catalog sentence the build prints in the stub's link). `except` lists the stretches of the page's texts that hold a place word without naming the place (a
 * city called "Santa Cruz do Sul"), the ones that occur in this page, so the browser leaves them plain as the build did. Nothing is computed here; it only drops the drawn sentences.
 */
import type { PhrasePart } from '../sentences/phrase'
import { drawBoth, type Fact } from './model'
import type { SealedPage } from './pages'

export type FactRecord = Omit<Fact, 'sentences' | 'scope' | 'page'>

export interface FactPageRecord {
  scope: string
  page: string
  /** The place or the page's name (what the page's title line is made of). */
  title: string
  /** The line under the heading, as data. */
  subtitle: PhrasePart
  /** The page's limits line, as data, on the pages that have one. */
  note?: PhrasePart
  /** The place-word exceptions that occur in this page's texts (`PlaceText`'s `except`). */
  except: string[]
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

/** The texts of the page that the browser draws with place mentions as links (every one `PlaceText` wrapped on the old page). */
export function placeTextsOf(page: Pick<SealedPage, 'facts' | 'subtitle' | 'note'>): string[] {
  const own = [page.subtitle, ...(page.note === undefined ? [] : [page.note])].flatMap((part) => Object.values(drawBoth(part)))
  const facts = page.facts.flatMap((f) => [f.title, f.shown, ...Object.values(f.sentences), ...f.inputs.flatMap((i) => [i.label, i.value]), f.calculation?.formula ?? '', ...(f.calculation?.worked ?? [])])
  return [...own, ...facts]
}

/** `all` (the dataset's exceptions) reduced to the ones that occur in `texts`. */
export const exceptionsIn = (texts: readonly string[], all: readonly string[]): string[] => all.filter((e) => texts.some((t) => t.includes(e)))

export function factPageRecord(page: SealedPage, edition: FactPageRecord['edition'], except: readonly string[] = []): FactPageRecord {
  return {
    scope: page.scope,
    page: page.page,
    title: page.title,
    subtitle: page.subtitle,
    ...(page.note === undefined ? {} : { note: page.note }),
    except: exceptionsIn(placeTextsOf(page), except),
    backPath: page.back.path,
    fixture: page.fixture,
    rounds: page.rounds,
    seal: page.seal,
    edition,
    facts: page.facts.map(recordOf),
  }
}
