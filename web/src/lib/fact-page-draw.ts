/**
 * The calculation page DRAWN from its data file (private#214, the lighter-site milestone): the draw function of the `fato` family for `loadPageData`
 * (`lib/page-data-loader.ts`; the page script is `scripts/fact-page.ts`).
 *
 * Nothing new is decided here. The page prints what the old page printed, for each record its sentence in both registers, its inputs, its formula, its worked
 * lines and its id, then the seal, the rounding and neutrality notes, the page's limits, the sources, the edition and the method notes:
 *  - every SENTENCE is `sentences/phrase.ts` drawing the phrase of the file with the page's subset of the catalog (`virtual:fact-words`, handed in as `words`): the
 *    browser carries the words the page asks for and not the catalog, and the text is the one the build printed (pinned by `fact-page-draw.test.ts`);
 *  - every place mention is a link, as `PlaceText` made it (`place-words.ts`, with the exceptions the file lists for this page);
 *  - the seal is `facts/seal-markup.ts` over the file's lines: never recomputed;
 *  - the way back is the stub's own link (its words are the stub's, printed by the build); the stub's heading becomes the page's.
 * After the content is in the page the record named by the fragment (`#<medida>`) is lit: the address is navigated to again, so the browser scrolls to it and
 * `:target` matches the record that did not exist when the page loaded.
 */
import { esc, html, raw, Raw } from '@/shared/html'
import { sourceFooter } from '@/shared/footer'
import { siteHref } from '@/paths'
import { editionLabel, editionPath, releasePath } from '@/lib/editions'
import { placeAnchor, placeName, splitPlaces } from '@/lib/place-words'
import { drawPhrase, subsetTemplate, type CatalogSubset, type PhrasePart, type Template } from '@/lib/sentences/phrase'
import { FACT_UI, editionPhrase, placeLabelPhrase, shownPhrase } from '@/lib/facts/page-ui'
import { sealMarkup } from '@/lib/facts/seal-markup'
import type { FactPageRecord, FactRecord } from '@/lib/facts/page-record'
import { REGISTERS, type Register } from '@/lib/sentences/register'

const LOCALE = 'pt-BR' as const

/** The page's words: what the file's phrases are drawn with, in the standard register unless a sentence asks for another. */
function wordsOf(words: CatalogSubset) {
  const template: Template = subsetTemplate(words)
  const say = (part: PhrasePart, register: Register = 'standard') => drawPhrase(part, { locale: LOCALE, register }, template)
  return { say }
}

export function factPageHtml(data: FactPageRecord, words: CatalogSubset): string {
  const { say } = wordsOf(words)
  const except = data.except
  const placed = (text: string): Raw =>
    raw(splitPlaces(text, except).map((s) => ('place' in s && s.place ? placeAnchor(s.place, say(placeLabelPhrase(s.place.kind, placeName(s.place))), { text: s.text }).toString() : esc(s.text))).join(''))
  const { facts } = data
  const fact = (f: FactRecord) => {
    const calc = f.calculation!
    return html`<section class="fact" id="${f.anchor}" data-fact="${f.id}">
<h2 class="fact__title">${placed(f.title)}</h2>
${REGISTERS.map((register) => html`<p class="fact__sentence" data-register="${register}">${placed(say(f.say, register))}</p>`)}
<h3 class="fact__label">${say(FACT_UI.inputs)}</h3>
<dl class="fact__inputs">${f.inputs.map((i) => html`<div><dt>${placed(i.label)}${i.field && html`<small>${i.field}</small>`}</dt><dd>${placed(i.value)}</dd></div>`)}</dl>
<h3 class="fact__label">${say(FACT_UI.formula)}</h3>
<p class="fact__formula">${placed(calc.formula)}</p>
<ol class="fact__worked">${calc.worked.map((w) => html`<li>${placed(w)}</li>`)}</ol>
${f.shown && f.shown !== f.title && html`<p class="fact__shown">${placed(say(shownPhrase(f.shown)))}</p>`}
<p class="fact__id">${say(FACT_UI.id)}: <code>${f.id}</code></p>
</section>`
  }
  const sources = [...new Map(facts.map((f) => [f.source!.url + f.source!.name, f.source!])).values()]
  const methods = [...new Map(facts.flatMap((f) => (f.method ? [[f.method.href, f.method] as const] : []))).values()]
  const banner = say(FACT_UI.banner).replace(' · ', '  ·  ')
  const footer = sourceFooter({ source: say(data.fixture ? FACT_UI.sourceFixture : FACT_UI.sourceTse), aboutHref: siteHref('sobre-os-dados/') })
  return html`${data.fixture && html`<div class="banner" role="note">${banner}</div>`}
<p class="page__subtitle">${placed(say(data.subtitle))}</p>
<div class="facts">${facts.map(fact)}</div>
${raw(sealMarkup(data.seal, { title: say(FACT_UI.sealTitle), note: say(FACT_UI.sealNote) }))}
<p class="fact__rounding">${say(FACT_UI.rounding)}</p>
<p class="fact__neutral">${say(FACT_UI.neutral)}</p>
${data.note !== undefined && html`<p class="fact__neutral" data-limits>${placed(say(data.note))}</p>`}
<h2 class="fact__block">${say(FACT_UI.source)}</h2>
<ul class="fact__links">
${sources.map((s) => html`<li><a href="${s.url}">${s.name} ›</a></li>`)}
<li><a href="${siteHref(editionPath(data.edition.id))}" data-edition-link>${say(editionPhrase(editionLabel(data.edition)))} ›</a></li>
<li><a href="${siteHref(`${releasePath(data.edition.id)}dicionario.csv`)}">dicionario.csv ›</a></li>
${methods.map((m) => html`<li><a href="${m.href}">${m.name} ›</a></li>`)}
</ul>
${raw(footer)}`.toString()
}

/**
 * Lights the record the fragment names, once it is in the page: the address is navigated to again by following a link to its own fragment (a same-address
 * navigation replaces the history entry, adds none), which scrolls to the record and sets `:target`. Assigning `location.hash` the same value would do nothing.
 */
export function lightFragment(doc: Document = document): void {
  const win = doc.defaultView
  const id = win ? decodeURIComponent(win.location.hash.slice(1)) : ''
  if (!win || !id || !doc.querySelector('[data-stub-content]')?.contains(doc.getElementById(id))) return
  const link = doc.createElement('a')
  link.setAttribute('href', win.location.hash)
  link.click()
}

/** The draw function of the `fato` family: `bootPageData({ family: 'fato', draw: drawFactPage(words) })`. */
export const drawFactPage =
  (words: CatalogSubset) =>
  (data: FactPageRecord, host: HTMLElement): void => {
    host.innerHTML = factPageHtml(data, words)
    // The stub's heading becomes the page's own ("Cálculo dos números"); its title stays the document's.
    const heading = host.closest('main')?.querySelector('h1')
    if (heading) heading.textContent = wordsOf(words).say(FACT_UI.title)
    lightFragment(host.ownerDocument)
  }
