/**
 * Everything the head-to-head card needs for one pair, pure: the self-describing picture, the generated sentence in both registers, the
 * share text and link (the address reproduces the card: level, the two places, nothing else), the short address the picture prints and the
 * file name. The page's island (browser) and the tests use the same function, so a card and its recomputation are one picture.
 */
import { candidateName } from '@/shared/candidate-name'
import { duelCardSvg } from './duel-card'
import { buildMeasures, duelQuery, type DuelData, type DuelPlace, type Level, type Measure } from './duel-model'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { duelAlt, duelSay } from './sentences/duel'
import { shortAddress } from './share-text'

export interface DuelContent {
  level: Level
  measures: Measure[]
  svg: string
  height: number
  variants: Record<Register, { alt: string; text: string }>
  /** The card's own address: what "Compartilhar" sends. */
  url: string
  /** `votoavoto.exemplo.br/cara-a-cara`: what the picture prints (no query: it must stay short). */
  address: string
  filename: string
  /** The note under the rows when a measure is signed ("Virada: ..."), in the standard register. */
  note?: string
}

export interface DuelContentOptions {
  origin: string
  base: string
  fixture: boolean
  locale?: Locale
}

export const duelPageUrl = (origin: string, base: string) => `${origin}${base.endsWith('/') ? base : `${base}/`}cara-a-cara/`

/** The names the signed measure's note uses for the two candidates ("Lula", "Flavio Bolsonaro"; the fixture's "Candidato A"). */
export function pairLabels(data: Pick<DuelData, 'pair'>): [string, string] {
  return [candidateName(data.pair.a.nome), candidateName(data.pair.b.nome)]
}

export function duelContent(level: Level, a: DuelPlace, b: DuelPlace, data: DuelData, o: DuelContentOptions): DuelContent {
  const locale = o.locale ?? DEFAULT_LOCALE
  const measures = buildMeasures(level, a, b)
  const [nameA, nameB] = pairLabels(data)
  const signed = measures.some((m) => m.key === 'virada' || m.key === 'viradaTurnos')
  const noteFor = (register: Register) => (signed ? duelSay({ locale, register }, 'duel.note.virada', { a: nameA, b: nameB }) : undefined)
  const pageUrl = duelPageUrl(o.origin, o.base)
  const url = `${pageUrl}${duelQuery({ level, a: a.code, b: b.code })}`
  const address = shortAddress(pageUrl)
  const variants = Object.fromEntries(
    REGISTERS.map((register) => {
      const alt = duelAlt(level, a, b, measures, data, { locale, register })
      return [register, { alt, text: `${alt} ${url}` }]
    }),
  ) as DuelContent['variants']
  const drawn = duelCardSvg(a, b, measures, {
    address,
    alt: variants.standard.alt,
    subtitle: duelSay({ locale }, `duel.sub.${level}` as 'duel.sub.cidade', { ano: data.ano }),
    note: noteFor('standard'),
    ano: data.ano,
    prev: data.prev,
    kind: duelSay({ locale }, `duel.kind.${level}` as 'duel.kind.cidade'),
    fixture: o.fixture,
    locale,
  })
  return { level, measures, svg: drawn.svg, height: drawn.height, variants, url, address, filename: `voto-a-voto-cara-a-cara-${level}.png`, note: noteFor('standard') }
}
