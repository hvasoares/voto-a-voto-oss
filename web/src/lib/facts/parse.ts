/**
 * Reads the records out of a page of the calculation (`/fato/...`), in the browser: the desktop highlight (#62) shows the calculation of a sentence
 * beside the figure it lights, and the calculation is already written on that page, so the island reads it from there instead of carrying a copy of the
 * records in every page that hosts it (a phone downloads none of it).
 */
export interface FactCard {
  anchor: string
  title: string
  sentences: { standard: string; plain: string }
  inputs: { label: string; value: string }[]
  formula: string
  worked: string[]
  /** "No cartão: 52%" without its lead, when the record has it. */
  shown: string
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

export function parseFactPage(html: string): FactCard[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return [...doc.querySelectorAll('section.fact')].map((s) => ({
    anchor: s.id,
    title: text(s.querySelector('.fact__title')),
    sentences: { standard: text(s.querySelector('.fact__sentence[data-register="standard"]')), plain: text(s.querySelector('.fact__sentence[data-register="plain"]')) },
    inputs: [...s.querySelectorAll('.fact__inputs > div')].map((d) => ({ label: text(d.querySelector('dt')?.firstChild as Element | null), value: text(d.querySelector('dd')) })),
    formula: text(s.querySelector('.fact__formula')),
    worked: [...s.querySelectorAll('.fact__worked li')].map(text),
    shown: text(s.querySelector('.fact__shown')).replace(/^[^:]*:\s*/, ''),
  }))
}
