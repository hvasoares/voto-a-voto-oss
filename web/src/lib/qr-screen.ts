/**
 * The Mostrar QR screen as DATA and as MARKUP (private#208, the pilot of the lighter-site milestone): the one template of the three QR routes and the
 * one record of the city's data file.
 *
 *  - `QrScreenRecord`   what `data/v<fingerprint>/qr/<uf>/<slug>.json` holds for a city: the words, the two links, the fixture flag and the QR
 *                       matrix (packed module bits, `qr-glyph.ts`), so the browser needs no encoder;
 *  - `cityQrRecord`     PURE, build time: the record of a city from its facts (the writer in `integrations/qr-pages.ts` and the city scope of
 *                       `screen-scopes.ts` both call it, so the words and links are written once);
 *  - `qrScreenHtml`     the screen and the poster as a string: `components/QrScreen.astro` prints it for the demo and Brasil routes, and
 *                       `drawQrScreen` puts it in the stub's area for the city route. No other copy of this markup exists;
 *  - `drawQrScreen`     the QR family's `draw(data, host)` for `loadPageData` (`lib/page-data-loader.ts`): see `scripts/qr-page.ts`.
 * No file system, no fetch, no encoder: it runs in Node and in the browser.
 */
import { glyphSvg, packModules, unpackModules, type QrGlyph } from './qr-glyph'
import { linkHref } from '@/paths'
import { shortAddress } from './short-address'

export interface QrScreenRecord {
  cityName: string
  /** The canonical address the QR encodes, scheme included. */
  url: string
  /** The address a reader sees, scheme and trailing slash off. */
  address: string
  fixture: boolean
  closeHref: string
  backHref: string
  /** Side of the matrix in modules and its packed bits (`packModules`). */
  size: number
  modules: string
}

export interface CityQrFacts {
  uf: string
  slug: string
  cityName: string
  fixture: boolean
  glyph: QrGlyph
}


/** The links of a city's QR screen: "Fechar" to the city card, "Voltar" to its share sheet (base path injected, so the build writer and the page agree). */
export function cityQrLinks(uf: string, slug: string, base: string): { closeHref: string; backHref: string } {
  return { closeHref: linkHref(`/${uf}/${slug}/`, base), backHref: linkHref(`/${uf}/${slug}/compartilhar/`, base) }
}

export function cityQrRecord(facts: CityQrFacts, base: string): QrScreenRecord {
  const { uf, slug, cityName, fixture, glyph } = facts
  return { cityName, url: glyph.text, address: shortAddress(glyph.text), fixture, ...cityQrLinks(uf, slug, base), size: glyph.size, modules: packModules(glyph.modules) }
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The QR drawing of a link: the SVG draws 1 module of quiet zone and the card's padding completes it (docs/checkpoints/issue-09.md). */
export const qrSvgOf = (glyph: QrGlyph): string => glyphSvg(glyph, { label: `QR de ${shortAddress(glyph.text)}`, margin: 1, paper: '#ffffff' })

export interface QrScreenView {
  cityName: string
  url: string
  address: string
  fixture: boolean
  closeHref: string
  backHref: string
  /** The drawn QR (`qrSvgOf`). */
  qr: string
  /** The Voto a Voto band on top: true where the page has no app header of its own (the demo and Brasil routes); the stub already draws one. */
  brand: boolean
}

const BANNER = 'EXEMPLO · QR ILUSTRATIVO, NÃO ESCANEÁVEL'

export function qrScreenHtml(v: QrScreenView): string {
  const city = esc(v.cityName)
  const brand = v.brand
    ? `<header class="flex items-baseline px-5 pt-2 lg:hidden" data-header>
        <span class="font-serif text-step-3 font-bold tracking-[-0.8px]">Voto a Voto</span>
        <span class="mx-[9.5px] h-[13px] w-px flex-none self-center bg-border" aria-hidden="true"></span>
        <span class="relative -top-1 font-sans text-step-1 font-normal text-muted-foreground">Presidente 2026</span>
      </header>`
    : ''
  const banner = v.fixture
    ? `<p class="mt-[7px] py-[7px] text-center text-step-1 font-bold tracking-wide lg:hidden" style="background: var(--c-flag); color: var(--c-ink)" data-banner>${BANNER}</p>`
    : ''
  const bannerDesktop = v.fixture
    ? `<p class="mx-auto mt-3 hidden w-fit rounded-sm px-2 py-[3px] text-step-1 font-bold tracking-wide lg:block" style="background: var(--c-flag); color: var(--c-ink)" data-banner-desktop>${BANNER}</p>`
    : ''
  return `<section data-qr-screen class="print:hidden" aria-label="Mostrar QR">
      ${brand}
      ${banner}
      <div class="px-5 pb-6 lg:mx-auto lg:flex lg:max-w-[720px] lg:flex-col lg:pt-6">
        <a class="mt-1 ml-[-8px] inline-flex min-h-11 items-center rounded-md border border-border bg-background pl-[11px] pr-[17px] text-step-2 text-foreground lg:hidden" href="${esc(v.closeHref)}" data-close>‹ Fechar</a>
        <a class="hidden min-h-8 items-center self-start text-step-1 text-primary lg:inline-flex" href="${esc(v.backHref)}" data-close-desktop>‹ Compartilhar</a>
        <h1 class="mt-[11px] text-center font-serif text-step-4 lg:mt-2">Mostrar QR</h1>
        <p class="text-center text-step-1 text-muted-foreground lg:text-step-2" data-subtitle>Presidente 2026 · ${city}</p>
        ${bannerDesktop}
        <div class="mx-auto mt-[30px] max-w-[280px] lg:mt-6 lg:max-w-[360px] rounded-md border border-border bg-white px-[7px] py-[7px] [&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" data-qr data-url="${esc(v.url)}">${v.qr}</div>
        <p class="mt-10 text-center text-step-2 font-bold wrap-anywhere lg:mt-8 lg:text-step-3" data-address>${esc(v.address)}</p>
        <p class="mx-auto mt-[19px] text-center text-step-1 text-muted-foreground lg:text-step-2" data-explain>
          Use esta tela para mostrar o QR a outra pessoa,<br />
          em outra tela, ou para imprimir. Se você vai<br />
          enviar por mensagem, use o botão Compartilhar.
        </p>
        <div class="lg:mt-9 lg:flex lg:justify-center lg:gap-5">
          <button type="button" class="hidden min-h-[52px] w-[200px] cursor-pointer items-center justify-center rounded-md border border-primary bg-primary text-step-2 font-bold text-primary-foreground lg:flex [@media(scripting:none)]:lg:hidden" onclick="window.print()" data-print>Imprimir cartaz</button>
          <a class="mt-[84px] flex min-h-12 items-center justify-center rounded-md border border-border bg-background text-step-2 text-foreground lg:mt-0 lg:min-h-[52px] lg:w-[200px]" href="${esc(v.backHref)}" data-back>Voltar</a>
        </div>
        <div data-events="qr_screen_shown,poster_printed" hidden></div>
      </div>
    </section>
    <section data-poster class="hidden print:block print:h-[273mm] print:flex print:flex-col" aria-label="Pôster para imprimir">
      <p class="text-[4.4mm] font-bold font-sans">Voto a Voto <span class="font-normal text-[3.6mm]">· Presidente 2026</span></p>
      <h1 class="mt-[18mm] text-center font-serif text-[13mm] leading-[16mm]" data-poster-city>${city}</h1>
      <p class="mt-[2mm] text-center text-[4.4mm] text-muted-foreground" data-poster-sub>Presidente 2026</p>
      <div class="mx-auto mt-[12mm] w-[140mm] [&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" data-poster-qr>${v.qr}</div>
      <p class="mt-[12mm] text-center text-[6mm] font-bold wrap-anywhere" data-poster-address>${esc(v.address)}</p>
      <p class="mx-auto mt-[6mm] max-w-[150mm] text-center text-[4.4mm] text-muted-foreground" data-poster-note>
        Aponte a câmera para o código para abrir a cidade no Voto a Voto.
      </p>
      <footer class="print:mt-auto pb-[2mm] text-center text-[3.6mm] text-muted-foreground" data-component="source-footer">
        ${v.fixture ? 'Dados fictícios para ilustrar o layout. Fonte real: TSE.' : 'Fonte: TSE, dados finais'}
      </footer>
    </section>`
}

/**
 * The QR family's draw function (the pattern of private#208: a family supplies its records and this one function). It puts the screen into the
 * stub's area, and, because the screen carries its own title, "Voltar" and poster, it hides the stub's `<h1>` and link back (the `hidden`
 * attribute, so a reader of the page hears the title once) and keeps the app header out of the printed poster.
 */
export function drawQrScreen(data: QrScreenRecord, host: HTMLElement): void {
  const glyph: QrGlyph = { text: data.url, version: (data.size - 17) / 4, size: data.size, modules: unpackModules(data.size, data.modules) }
  host.innerHTML = qrScreenHtml({ ...data, qr: qrSvgOf(glyph), brand: false })
  const main = host.closest('main')
  main?.querySelector('h1')?.setAttribute('hidden', '')
  main?.querySelector('[data-stub-back]')?.setAttribute('hidden', '')
  document.querySelector('[data-app-header]')?.classList.add('print:hidden')
}
