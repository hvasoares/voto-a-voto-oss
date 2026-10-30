import { DEFAULT_LOCALE, message, template, type Locale, type MessageKey, type Register } from '../../lib/sentences/catalog'
import { drawPhrase, phrase, type PhrasePart } from '../../lib/sentences/phrase'
import { CARD_REGISTER } from '../../lib/sentences/register'
import type { Fact } from '../../lib/curiosities'
import { html, type Raw } from '../../shared/html'

/** The cycles of a fact as the card prints them: "2022 → 2026" for a change, "2026", "2018, 2022 e 2026". */
function cyclesText(f: Fact, voice: { locale: Locale; register: Register }): string {
  return drawPhrase(cyclesSentence(f, voice.locale), voice, template)
}
function cyclesSentence(f: Fact, locale: Locale): PhrasePart {
  if (f.code === 'td' || f.code === 'tu') return phrase('curio.cycles.change', { from: f.cycles[0]!, to: f.cycles[1]! })
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(f.cycles.map(String))
}

/** What a fact ranks and the group it ranks in, as data (private#213): drawn in either register by `drawPhrase`, in the build and in the browser. */
export function curiosityLineSentence(f: Fact, locale: Locale = DEFAULT_LOCALE): { what: PhrasePart; group: PhrasePart } {
  return { what: phrase(`curio.${f.code}` as MessageKey), group: phrase('curio.group', { n: f.n, cycles: cyclesSentence(f, locale) }) }
}

/** What a fact ranks and the group it ranks in, in one register: the words of the card. */
export function curiosityLine(f: Fact, register: Register, locale: Locale = DEFAULT_LOCALE): { what: string; group: string } {
  const voice = { locale, register }
  const { what, group } = curiosityLineSentence(f, locale)
  return { what: drawPhrase(what, voice, template), group: drawPhrase(group, voice, template) }
}

/**
 * The curiosities card of one city (#33), in plain language: the title, up to three facts (the rank, what it is the rank
 * of, the group size and the cycles compared) and the line that says it is a comparison, not a finding. `id` keeps
 * the heading's a11y label unique on the page.
 */
export function curiosityCard(facts: readonly Fact[], id: string, locale: Locale = DEFAULT_LOCALE): Raw {
  if (!facts.length) return html``
  const voice = { locale, register: CARD_REGISTER }
  const text = (key: MessageKey, params?: Record<string, string | number>) => message(voice, key, params)
  const items = facts.map(
    (f) =>
      html`<li class="curio__fact"><p class="curio__rank">${message(voice, 'curio.rank', { n: f.rank })}</p><p class="curio__what">${message(voice, `curio.${f.code}`)}</p><p class="curio__group">${message(voice, 'curio.group', { n: f.n, cycles: cyclesText(f, voice) })}</p></li>`,
  )
  return html`<section class="curio" aria-labelledby="curio-title-${id}"><h2 class="curio__title" id="curio-title-${id}">${text('curio.title')}</h2><ul class="curio__facts">${items}</ul><p class="curio__note">${text('curio.note')}</p></section>`
}
