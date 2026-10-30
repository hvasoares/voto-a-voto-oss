/**
 * The scopes of the QR screens and the share sheets (ticket #137), as PURE DATA built outside the components.
 *
 * Six routes draw two components: `components/QrScreen.astro` and `components/ShareScreen.astro`. What differs between the
 * demo (`/qr/`, `/compartilhar/`), the city (`/:uf/:slug/qr/`, `/:uf/:slug/compartilhar/`) and Brasil (`/brasil/qr/`,
 * `/brasil/compartilhar/`) lives here, one builder per scope in a record typed over the scope names: a fourth scope is a
 * type error until its builder exists, and a name that is not a scope does not compile. The components never branch on
 * the scope; they draw the config they are handed.
 *
 *  - `qrScreenConfig(scope)`    the props of QrScreen (the city name, the link, the QR drawing, the two hrefs);
 *  - `shareScreenConfig(scope)` the config of ShareScreen: the wrapper, the backdrop, the sheet frame, the close link, the body
 *                               (what the sheet's island needs) and the footer.
 * The hydration directive and its timing belong to the body kind (`sheet`: `client:load`, `actions`: `client:idle`) and are
 * written once in ShareScreen; they do not move per scope.
 */
import type { ComponentProps } from 'react'
import type ShareSheet from '@/components/ShareSheet'
import { displayName } from '@/shared/city-search'
import { FOOTER_LINK } from '@/shared/link-classes'
import { siteBase, siteHref } from '@/paths'
import { qrGlyph } from '@/lib/qr-code'
import { cityQrLinks, qrSvgOf } from '@/lib/qr-screen'
import { cityUrl, siteOrigin } from '@/lib/share-url'
import { datasetFixture, fixtureCityShards, loadCityShard } from '@/lib/shard-files'
import { cityShardResult } from '@/lib/city-shard'
import { shareContent } from '@/lib/share-model'
import { currentEdition } from '@/lib/editions-load'
import { brasilContent, brasilUrl } from '@/lib/brasil-content'
import { isFixtureDataset, loadBrasil } from '@/lib/brasil-load'
import { brasilNoJs, brasilShareNote } from '@/lib/sentences/brasil'
import { cityTexts, type CityTexts } from '@/lib/city-texts-build'
import { pickQuestion } from '@/lib/question'
import { defaultView } from '@/slots/city/city-view'

/** The scope of a screen. `scope` is the discriminant; the city carries its route params and name. */
export type ScreenScope = { scope: 'demo' } | { scope: 'city'; uf: string; slug: string; nome: string } | { scope: 'brasil' }
type ScopeOf<K extends ScreenScope['scope']> = Extract<ScreenScope, { scope: K }>
/** One builder per scope: the mapped type is the exhaustiveness check. */
type Builders<Config> = { [K in ScreenScope['scope']]: (scope: ScopeOf<K>) => Promise<Config> }
const run = <Config, S extends ScreenScope>(builders: Builders<Config>, scope: S): Promise<Config> =>
  (builders[scope.scope] as (s: S) => Promise<Config>)(scope)

/** The demo always draws the fixture city, whichever DATA_DIR the build uses (a real-data build has no cidade-exemplo). */
async function demoCity() {
  const shard = (await fixtureCityShards()).find((s) => s.city.uf === 'rj' && s.city.slug === 'cidade-exemplo')!
  return { shard, fixture: await datasetFixture({ DATA_DIR: undefined }) }
}

// --- Mostrar QR ------------------------------------------------------------------------------------------------------

/** The props of `components/QrScreen.astro`. */
export interface QrScreenConfig {
  cityName: string
  url: string
  qr: string
  fixture: boolean
  closeHref: string
  backHref: string
  /** The demo is a stand-in to look at, not a page to find. */
  noindex: boolean
}

/** The QR drawing of a link: the SVG draws 1 module of quiet zone and the card's padding completes it (docs/checkpoints/issue-09.md). */
const qrOf = (url: string) => qrSvgOf(qrGlyph(url))

const QR_SCOPES: Builders<QrScreenConfig> = {
  // "Fechar" of the demo has no city card to return to: it points at home; "Voltar" goes to the demo sheet.
  demo: async () => {
    const { shard, fixture } = await demoCity()
    const url = cityUrl(siteOrigin(), siteBase(), shard.city.uf, shard.city.slug)
    return { cityName: displayName(shard.city.nome), url, qr: qrOf(url), fixture, closeHref: siteHref('/'), backHref: siteHref('/compartilhar/'), noindex: true }
  },
  city: async ({ uf, slug, nome }) => {
    const url = cityUrl(siteOrigin(), siteBase(), uf, slug)
    return { cityName: displayName(nome), url, qr: qrOf(url), fixture: await datasetFixture(), ...cityQrLinks(uf, slug, siteBase()), noindex: false }
  },
  brasil: async () => {
    const url = brasilUrl(siteOrigin(), siteBase())
    return { cityName: 'Brasil', url, qr: qrOf(url), fixture: await datasetFixture(), closeHref: siteHref('/brasil/'), backHref: siteHref('/brasil/compartilhar/'), noindex: false }
  },
}

export const qrScreenConfig = (scope: ScreenScope): Promise<QrScreenConfig> => run(QR_SCOPES, scope)

// --- Compartilhar ----------------------------------------------------------------------------------------------------

/** What the sheet holds between its title and the Mostrar QR link: a hydrated island and its inputs. */
export type ShareBody =
  /** The city sheet: the island `ShareSheet` (`client:load`) draws the picture, the text and the actions itself. */
  | { kind: 'sheet'; props: ComponentProps<typeof ShareSheet> }
  /** The demo and Brasil sheets: the pre-rendered picture and note, then the island `ShareActions` (`client:idle`). */
  | { kind: 'actions'; svg: string; pictureAttrs: Record<string, string>; note: string; noJs: string; text: string; filename: string; link: string }

/** The config of `components/ShareScreen.astro`. */
export interface ShareScreenConfig {
  title: string
  description?: string
  /** `<meta name="robots" content="noindex">`: the demo is a stand-in to look at, not a page to find. */
  noindex: boolean
  wrapper: { tag: 'main' | 'div'; class?: string }
  /** The dimmed element the sheet floats over (its content is the page's `backdrop` slot). */
  backdrop: { class: string; ticket?: string }
  /** The dimming layer behind a centred dialog (from 768 px). */
  dim: boolean
  sheet: { class: string; uf?: string; slug?: string; view: string; filename?: string }
  close: { href: string; class: string; cross: boolean }
  body: ShareBody
  qrHref: string
  /** "Criar um cartão com uma medida": absent on the sheets that have no city to prefill. */
  generatorHref?: string
  /** The "Textos prontos" block of a city. */
  texts?: { texts: CityTexts; stateHref: string }
  footer: { source: string; aboutClass: string }
}

/** The bottom sheet (a centred dialog from 768 px) of the real routes; the demo's sheet sits in the flow. */
const FIXED_SHEET =
  'fixed inset-x-0 bottom-0 z-50 max-h-[100dvh] overflow-y-auto rounded-t-2xl border border-border bg-background px-5 pt-2 pb-6 shadow-[0_-4px_16px_rgba(28,27,24,0.25)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-[110px] md:max-h-[calc(100dvh-140px)] md:w-[480px] md:-translate-x-1/2 md:rounded-2xl md:px-7 md:pb-7 md:pt-6'
const FLOW_SHEET =
  '-mt-4 relative rounded-t-2xl border border-border bg-background px-5 pt-2 pb-6 shadow-[0_-4px_16px_rgba(28,27,24,0.25)] md:mx-auto md:mt-6 md:max-w-[480px] md:rounded-2xl md:px-7 md:pt-6'
const BACKDROP = 'pointer-events-none select-none opacity-35'
const CLOSE = 'min-h-11 px-1 pt-1 text-step-2 font-bold'
const CLOSE_FLEX = 'inline-flex min-h-11 items-center px-1 text-step-2 font-bold'
/** The round of the Sketch frame "3 Folha de compartilhamento". */
const DEMO_VIEW = { ano: 2026, turno: 1 as const }
const DEMO_NOTE = 'O link vai no texto da mensagem; a imagem leva só o endereço curto, sem QR.'
const DEMO_NOJS = 'Compartilhar e baixar a imagem precisam de JavaScript; o texto abaixo pode ser copiado e enviado com o endereço.'
const footerSource = (fixture: boolean) => (fixture ? 'Dados fictícios para ilustrar o layout. Fonte real: TSE.' : 'Fonte: TSE, dados finais')

const SHARE_SCOPES: Builders<ShareScreenConfig> = {
  demo: async () => {
    const { shard, fixture } = await demoCity()
    const city = shard.city
    const view = DEMO_VIEW
    const result = cityShardResult(shard, view.ano, view.turno)
    const edition = (await currentEdition()).id
    const content = result ? shareContent(result, city, { origin: siteOrigin(), base: siteBase(), fixture, edition }) : undefined
    if (!content) throw new Error('the demo share sheet needs the fixture city to have a result for 2026 1º turno')
    const cityName = displayName(city.nome)
    return {
      title: `Compartilhar · ${cityName}`,
      noindex: true,
      wrapper: { tag: 'main', class: 'min-w-0 flex-1' },
      backdrop: { class: 'pointer-events-none select-none px-5 pt-4 opacity-35', ticket: '50 to replace' },
      dim: false,
      sheet: { class: FLOW_SHEET, uf: city.uf, slug: city.slug, view: `${view.ano}-${view.turno}`, filename: content.filename },
      close: { href: siteHref('/'), class: CLOSE, cross: false },
      body: { kind: 'actions', svg: content.svg, pictureAttrs: {}, note: DEMO_NOTE, noJs: DEMO_NOJS, text: content.text, filename: content.filename, link: content.url },
      qrHref: siteHref('/qr/'),
      generatorHref: siteHref('/gerador/?cidade=rj/cidade-exemplo'),
      footer: { source: footerSource(fixture), aboutClass: '' },
    }
  },
  city: async ({ uf, slug, nome }) => {
    const base = siteBase()
    const shard = (await loadCityShard(uf, slug))!
    const city = shard.city
    const fixture = await datasetFixture()
    const currentEd = await currentEdition()
    const texts = cityTexts(shard, { origin: siteOrigin(), base, fixture, editionDate: currentEd.date })
    // The view the page pre-prints is the card's default; ?ciclo/?turno is the ShareSheet island's business.
    const view = defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
    const result = cityShardResult(shard, view.ano, view.turno)
    const content = result ? shareContent(result, city, { origin: siteOrigin(), base, fixture, edition: currentEd.id }) : null
    return {
      title: `Compartilhar · ${displayName(nome)}`,
      noindex: false,
      wrapper: { tag: 'div' },
      backdrop: { class: BACKDROP },
      dim: true,
      sheet: { class: FIXED_SHEET, uf: city.uf, slug: city.slug, view: `${view.ano}-${view.turno}`, filename: content?.filename },
      close: { href: siteHref(`/${uf}/${slug}/`), class: CLOSE, cross: true },
      body: { kind: 'sheet', props: { uf: city.uf, slug: city.slug, view, initial: content, origin: siteOrigin(), base, fixture, edition: currentEd.id, question: pickQuestion(shard), cityName: city.nome } },
      qrHref: siteHref(`/${uf}/${slug}/qr/`),
      generatorHref: siteHref(`/gerador/?cidade=${uf}/${slug}`),
      texts: { texts, stateHref: siteHref(`/textos/${uf}.txt`) },
      footer: { source: footerSource(fixture), aboutClass: '' },
    }
  },
  brasil: async () => {
    const view = await loadBrasil()
    const fixture = await isFixtureDataset()
    const edition = await currentEdition()
    const content = brasilContent(view, { origin: siteOrigin(), base: siteBase(), fixture, edition: edition.id })
    return {
      title: 'Compartilhar · Brasil e regiões',
      description: content.variants.standard.alt,
      noindex: false,
      wrapper: { tag: 'div' },
      backdrop: { class: BACKDROP },
      dim: true,
      sheet: { class: FIXED_SHEET, view: 'brasil', filename: content.filename },
      close: { href: siteHref('/brasil/'), class: CLOSE_FLEX, cross: true },
      body: { kind: 'actions', svg: content.svg, pictureAttrs: { 'data-card': 'brasil' }, note: brasilShareNote(), noJs: brasilNoJs(), text: content.variants.standard.text, filename: content.filename, link: content.url },
      qrHref: siteHref('/brasil/qr/'),
      footer: { source: footerSource(fixture), aboutClass: FOOTER_LINK },
    }
  },
}

export const shareScreenConfig = (scope: ScreenScope): Promise<ShareScreenConfig> => run(SHARE_SCOPES, scope)

/** The words of the demo sheet's stand-in backdrop (the Sketch frame's top): the fixture city and the frame's round. */
export async function demoSketch() {
  const { shard, fixture } = await demoCity()
  return { cityName: displayName(shard.city.nome), sub: `${fixture ? 'Município fictício' : 'Município'} · rj`, ano: DEMO_VIEW.ano, fixture }
}
