/**
 * The "conferido" seal as markup (#62): the one place its element is written. `components/Seal.astro` prints it in the pages that are built with the seal, and the
 * calculation page's client (`lib/fact-page-draw.ts`, private#214) draws the same block from the seal lines of the data file: a seal is never recomputed in the
 * browser, the lines arrive finished from the build's checks (`lib/facts/checks.ts`). PURE, with escaping; the title and the note are the catalog's, handed in.
 */
import { html } from '../../shared/html'

export interface SealWords {
  title: string
  note: string
}

export function sealMarkup(lines: readonly string[], words: SealWords): string {
  if (lines.length === 0) return ''
  return html`<aside class="seal" data-seal aria-labelledby="seal-title"><h2 class="seal__title" id="seal-title"><span aria-hidden="true">✓ </span>${words.title}</h2><ul class="seal__lines">${lines.map((l) => html`<li>${l}</li>`)}</ul><p class="seal__note">${words.note}</p></aside>`.toString()
}
