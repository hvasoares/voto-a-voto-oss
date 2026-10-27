import { DEFAULT_LOCALE, REGISTERS, message, type Locale, type MessageKey, type Register } from '../../lib/sentences/catalog'
import type { Fact } from '../../lib/curiosities'
import { html, type Raw } from '../../shared/html'
import { calcLink } from '../../lib/facts/link'
import type { FactLinks } from './card'

/** The cycles of a fact as the card prints them: "2022 → 2026" for a change, "2026", "2018, 2022 e 2026". */
function cyclesText(f: Fact, voice: { locale: Locale; register: Register }): string {
  if (f.code === 'td' || f.code === 'tu') return message(voice, 'curio.cycles.change', { from: f.cycles[0]!, to: f.cycles[1]! })
  return new Intl.ListFormat(voice.locale, { style: 'long', type: 'conjunction' }).format(f.cycles.map(String))
}

/** What a fact ranks and the group it ranks in, in one register: the words of the card, also the sentence of the fact record. */
export function curiosityLine(f: Fact, register: Register, locale: Locale = DEFAULT_LOCALE): { what: string; group: string } {
  const voice = { locale, register }
  return { what: message(voice, `curio.${f.code}`), group: message(voice, 'curio.group', { n: f.n, cycles: cyclesText(f, voice) }) }
}

/**
 * The curiosities card of one city (#33), in both registers: the title, up to three facts (the rank, what it is the rank
 * of, the group size and the cycles compared) and the line that says it is a comparison, not a finding. `id` keeps
 * the heading's a11y label unique on the page.
 */
export function curiosityCard(facts: readonly Fact[], id: string, links: FactLinks, locale: Locale = DEFAULT_LOCALE): Raw {
  if (!facts.length) return html``
  const voices = REGISTERS.map((register) => ({ locale, register }))
  const text = (key: MessageKey, params?: Record<string, string | number>) => voices.map((v) => html`<span data-register="${v.register}">${message(v, key, params)}</span>`)
  const items = facts.map(
    (f) =>
      html`<li class="curio__fact"><p class="curio__rank">${message(voices[0]!, 'curio.rank', { n: f.rank })}</p><p class="curio__what">${voices.map((v) => html`<span data-register="${v.register}">${message(v, `curio.${f.code}`)}</span>`)}</p><p class="curio__group">${voices.map((v) => html`<span data-register="${v.register}">${message(v, 'curio.group', { n: f.n, cycles: cyclesText(f, v) })}</span>`)}</p>${calcLink(links(f.code), locale)}</li>`,
  )
  return html`<section class="curio" aria-labelledby="curio-title-${id}"><h2 class="curio__title" id="curio-title-${id}">${text('curio.title')}</h2><ul class="curio__facts">${items}</ul><p class="curio__note">${text('curio.note')}</p></section>`
}
