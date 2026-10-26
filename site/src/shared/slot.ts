import type { Analytics } from '../analytics'
import type { DataStore } from '../data'
import { withBase } from '../paths'
import { fillPattern, type Params } from '../routes'
import { html, Raw } from './html'

/** Everything a slot may use. Slots get data and analytics ONLY through this context. */
export interface SlotContext {
  /** Site base path, e.g. '/' or '/voto-a-voto/'. Build links with `ctx.href()`. */
  base: string
  /** Values of the route's `:params`, e.g. { uf: 'rj', slug: 'cidade-exemplo' }. */
  params: Params
  /** Query string of the current URL (e.g. ?vista=mapa). */
  query: URLSearchParams
  data: DataStore
  analytics: Analytics
  /**
   * true when the URL has ?fixture=sketch: render the numbers drawn in the Sketch frame
   * (src/slots/<slot>/fixture.ts `frameTexts`) instead of reading the dataset. Used for aggregate
   * screens whose frame shows national/state figures that the small fixture dataset cannot produce.
   */
  useFrameFixture: boolean
  /** Base-aware real-path link: href('/:uf/:slug/', { uf, slug }). Missing params fall back to the fixture city. */
  href(pattern: string, params?: Params): string
}

export interface SlotLink {
  /** Text shown in the Sketch frame (Portuguese). */
  label: string
  /** Route pattern the link goes to. */
  to: string
  /** Params to override; the rest come from the current route, then from FIXTURE_DEFAULTS. */
  params?: Params
  /** Optional query string, e.g. 'vista=mapa'. */
  query?: string
}

export interface SlotMeta {
  /** Stable id, also the directory name under src/slots/. */
  id: string
  /** Page title (Portuguese, as in the frame). */
  title: string
  /** Route pattern. Real path, trailing slash, no hash. */
  route: string
  /** Values to pre-render for params not derived from the dataset (e.g. report slugs). */
  paramValues?: Record<string, string[]>
  /** Exact name of the frame in Sketch page "Election SPA v2". */
  sketchFrame: string
  /** Reference image(s) under site/reference/ (390x844). First one is the default. */
  references: string[]
  /** Ticket that owns hydration of this slot. */
  ticket: number
  /** Dataset parts the hydrated screen reads. */
  reads: string[]
  /** What the hydrated screen must show (short bullets, from the frame). */
  mustShow: string[]
  /** Navigation shown in the prototype ("Fluxo" page and link texts inside the frame). */
  links: SlotLink[]
  /** Path (+ query) used for fixture-state screenshots and the route smoke test. */
  fixtureRoute: string
  /** Extra fixture-state routes, e.g. the "Mapa" view of the map screens. Each has its own reference image. */
  extraFixtures?: { name: string; route: string; reference: string }[]
  /** Short text of what the blank is waiting for. */
  note?: string
}

export interface SlotPage {
  /** Document title (<title>), without the site suffix. */
  title: string
  /** Body markup for #app: the page frame with the screen inside. */
  html: Raw
}

export interface Slot {
  meta: SlotMeta
  /**
   * false while the slot is a blank placeholder. The hydrating agent sets it to true
   * (and replaces `render`). The slot test flips from `it.fails` to `it` at the same time.
   */
  hydrated: boolean
  /** Returns the whole page (use pageFrame()). Runs in Node (pre-render) and in the browser (404 fallback, ?fixture=sketch). */
  render(ctx: SlotContext): Promise<SlotPage> | SlotPage
  /** Optional: attach event handlers after the HTML is in the page. Browser only. */
  mount?(root: HTMLElement, ctx: SlotContext): void | Promise<void>
}

export const FIXTURE_DEFAULTS: Params = {
  uf: 'rj',
  slug: 'cidade-exemplo',
  regiao: 'sudeste',
  report: 'maiores-viradas',
}

export function makeHref(base: string, current: Params) {
  return (pattern: string, params: Params = {}) => {
    const merged = { ...FIXTURE_DEFAULTS, ...current, ...params }
    // A city needs uf AND slug from the same place: with no slug in sight, fall back to the fixture city as a pair.
    if (pattern.includes(':slug') && !current.slug && !params.slug) Object.assign(merged, { uf: params.uf ?? FIXTURE_DEFAULTS.uf, slug: FIXTURE_DEFAULTS.slug })
    return withBase(base, fillPattern(pattern, merged))
  }
}

export function linkHref(ctx: SlotContext, l: SlotLink): string {
  return ctx.href(l.to, l.params) + (l.query ? `?${l.query}` : '')
}

/** Marker text. The slot test and the e2e smoke test look for exactly this phrase. */
export const NOT_YET_HYDRATED = 'not yet hydrated'

export function notHydratedMarker(meta: SlotMeta): Raw {
  return html`<aside class="not-hydrated" data-not-hydrated="${meta.id}" role="note">
    <strong>NÃO HIDRATADO · ${NOT_YET_HYDRATED}</strong>
    <span>Tela em branco, só o esqueleto. Slot <code>${meta.id}</code>, ticket #${meta.ticket}. Quadro do Sketch: “${meta.sketchFrame}”.</span>
    ${meta.note ? html`<span>${meta.note}</span>` : ''}
  </aside>`
}

/** Links list. The '‹ ...' back links are skipped by default: the page frame already draws that back button. */
export function navLinks(ctx: SlotContext, meta: SlotMeta, skip: (l: SlotLink) => boolean = (l) => l.label.startsWith('‹')): Raw {
  const items = meta.links.filter((l) => !skip(l))
  return html`<nav class="slot-links" aria-label="Navegação do protótipo">
    <ul>${items.map((l) => html`<li><a href="${linkHref(ctx, l)}">${l.label}</a></li>`)}</ul>
  </nav>`
}

/** Banner for pages rendered from the fixture dataset (manifest.fixture === true), as drawn in the Sketch frames. */
export async function fixtureBanner(ctx: SlotContext): Promise<string | undefined> {
  return (await ctx.data.manifest()).fixture ? 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS' : undefined
}
