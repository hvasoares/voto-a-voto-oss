import { DEFAULT_LOCALE, REGISTERS, message, type Locale, type MessageKey, type Register } from '../../lib/sentences/catalog'
import type { Fact } from '../../lib/curiosities'
import { html, type Raw } from '../../shared/html'

/** The cycles of a fact as the card prints them: "2022 → 2026" for a change, "2026", "2018, 2022 e 2026". */
function cyclesText(f: Fact, voice: { locale: Locale; register: Register }): string {
  if (f.code === 'td' || f.code === 'tu') return message(voice, 'curio.cycles.change', { from: f.cycles[0]!, to: f.cycles[1]! })
  return new Intl.ListFormat(voice.locale, { style: 'long', type: 'conjunction' }).format(f.cycles.map(String))
}

/**
 * The curiosities card of one city (#33), in both registers: the title, up to three facts (the rank, what it is the rank
 * of, the group size and the cycles compared) and the line that says it is a comparison, not a finding. `id` keeps the
 * card's two uses (inside the city card on desktop, the phone's own screen) apart for a11y labels.
 */
export function curiosityCard(facts: readonly Fact[], id: string, locale: Locale = DEFAULT_LOCALE): Raw {
  if (!facts.length) return html``
  const voices = REGISTERS.map((register) => ({ locale, register }))
  const text = (key: MessageKey, params?: Record<string, string | number>) => voices.map((v) => html`<span data-register="${v.register}">${message(v, key, params)}</span>`)
  const items = facts.map(
    (f) =>
      html`<li class="curio__fact"><p class="curio__rank">${message(voices[0]!, 'curio.rank', { n: f.rank })}</p><p class="curio__what">${voices.map((v) => html`<span data-register="${v.register}">${message(v, `curio.${f.code}`)}</span>`)}</p><p class="curio__group">${voices.map((v) => html`<span data-register="${v.register}">${message(v, 'curio.group', { n: f.n, cycles: cyclesText(f, v) })}</span>`)}</p></li>`,
  )
  return html`<section class="curio" aria-labelledby="curio-title-${id}"><h2 class="curio__title" id="curio-title-${id}">${text('curio.title')}</h2><ul class="curio__facts">${items}</ul><p class="curio__note">${text('curio.note')}</p></section>`
}
