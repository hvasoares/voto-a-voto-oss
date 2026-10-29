/**
 * Everything the sequence of a state needs, PURE: for each card its picture, text alternative, message text, address (with its position, `#2`), file name and caption. The cards are
 * `storyPlan` (`story.ts`); the recap card (#28) is reused as it is (its own picture and words) where the plan says `recap`. Used at build time by the page, which pre-renders every card.
 */
import type { Recap } from './recap'
import { recapContent } from './recap-content'
import { storyCardSvg } from './story-card'
import { storyPlan, storyText, storySay, storyFits, STORY_MAX, STORY_MIN, type StoryInput, type StoryKind } from './story'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { shortAddress } from './share-text'

export interface StoryCardContent {
  /** 1-based position in the sequence: the number in the address (`#2`). */
  n: number
  kind: StoryKind
  surprising: boolean
  svg: string
  /** The text alternative and the message text, per register (the message ends with the link to this card). */
  variants: Record<Register, { alt: string; text: string }>
  /** `https://votoavoto.exemplo.br/sp/historia/#2` */
  url: string
  /** `votoavoto.exemplo.br/sp/historia#2` */
  address: string
  filename: string
  /** "Cartão 2 de 7 · o fato mais surpreendente" */
  caption: string
}

export interface StoryContentOptions extends Omit<StoryInput, 'recap'> {
  uf: string
  stateName: string
  origin: string
  base: string
  fixture: boolean
  recapData?: Recap
  edition?: string
  locale?: Locale
}

/** `https://votoavoto.exemplo.br/sp/historia/` */
export function storyUrl(origin: string, base: string, uf: string): string {
  const b = base.endsWith('/') ? base : `${base}/`
  return `${origin}${b.startsWith('/') ? b : `/${b}`}${uf}/historia/`
}

export { STORY_MAX, STORY_MIN, storyFits }

/** The cards of a state, or undefined when the sequence would not have six to eight cards (the page is not made). */
export function storyContent(o: StoryContentOptions): StoryCardContent[] | undefined {
  const locale = o.locale ?? DEFAULT_LOCALE
  const plan = storyPlan({ cities: o.cities, arcs: o.arcs, recap: !!o.recapData })
  if (!storyFits(plan)) return undefined
  const base = storyUrl(o.origin, o.base, o.uf)
  const recap = o.recapData && recapContent(o.recapData, { stateName: o.stateName, origin: o.origin, base: o.base, fixture: o.fixture, edition: o.edition, locale })
  return plan.map((step, i) => {
    const n = i + 1
    const url = `${base}#${n}`
    const address = `${shortAddress(base)}#${n}`
    const text = storyText(step, { name: o.stateName, cards: plan.length }, { locale })
    const variants = Object.fromEntries(
      REGISTERS.map((register) => {
        const t = storyText(step, { name: o.stateName, cards: plan.length }, { locale, register })
        const alt = step.kind === 'recap' && recap ? recap.variants[register].alt : [t.big, t.sentence].filter(Boolean).join(' ')
        return [register, { alt, text: `${alt} ${url}` }]
      }),
    ) as StoryCardContent['variants']
    const svg =
      step.kind === 'recap' && recap
        ? recap.svg
        : storyCardSvg({ kicker: `${o.uf.toUpperCase()} · ${text.kicker}`, big: text.big, sentence: text.sentence, address, alt: variants.standard.alt, fixture: o.fixture, locale })
    return {
      n,
      kind: step.kind,
      surprising: !!step.surprising,
      svg,
      variants,
      url,
      address,
      filename: `voto-a-voto-${o.uf}-historia-${n}.png`,
      caption: storySay(step.surprising ? 'story.caption.surprising' : 'story.caption', { locale }, { n, total: plan.length }),
    }
  })
}
