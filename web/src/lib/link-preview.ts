/**
 * What a city page says about itself in its `<head>` (ticket #8), PURE: the document title, the meta
 * description and the preview (og/twitter) tags — plus the path and URL of the pre-rendered preview image.
 * Every string is built from the city's own CityResult (the card's default view), never hard-coded; a city
 * the dataset has no result for gets a page and tags without og:image, and the build draws no image for it.
 * The image itself is the share picture (`shareCardSvg`, through `shareContent` — ticket #7's drawing,
 * the same function the share sheet uses), rasterised at build time by `integrations/preview-images.ts`.
 */
import type { City } from '@/data'
import { displayName, ufLabel } from '@/shared/city-search'
import type { CityResult } from '@/shared/city-model'
import { linkHref } from '@/paths'
import { cityUrl, siteOrigin } from './share-url'
import { SHARE_CARD_SIZE } from './share-card'
import { DEFAULT_VOICE, message } from './sentences/catalog'
import { headline } from './sentences/headline'
import './sentences/catalog-preview'
import { shareContent } from './share-model'

/** Path segment (root-relative, base included by callers) of the generated preview rasters. */
export const PREVIEW_DIR = 'preview'
export const PREVIEW_TYPE = 'image/png'

/** og:image size: the card's drawing scaled down (flat colours and coarse text keep it sharp); the raster is written at this size. */
export const PREVIEW_WIDTH = 480
export const PREVIEW_HEIGHT = Math.round((SHARE_CARD_SIZE.height * PREVIEW_WIDTH) / SHARE_CARD_SIZE.width)

/** `rj/cidade-exemplo.png` — the preview file's path INSIDE the preview directory (and inside the cache). */
export function previewFile(uf: string, slug: string): string {
  return `${uf}/${slug}.png`
}

/** `preview/rj/cidade-exemplo.png` — unique because slugs are unique within each UF (locked by the shard builder). */
export function previewPath(uf: string, slug: string): string {
  return `${PREVIEW_DIR}/${previewFile(uf, slug)}`
}

/** Absolute URL of the built preview file (og:image is fetched by the crawler, so it must not be a bare path). */
export function previewUrl(origin: string, base: string, uf: string, slug: string): string {
  return `${origin}${linkHref(previewPath(uf, slug), base)}`
}

export interface PreviewAsset {
  url: string
  type: typeof PREVIEW_TYPE
  width: number
  height: number
  alt: string
}

export interface PreviewHead {
  title: string
  ogTitle: string
  description: string
  /** The page's own absolute URL (og:url). */
  url: string
  /** Absent when the city has no result: the build writes no image and the page tags none. */
  image?: PreviewAsset
}

export interface PreviewCity extends Pick<City, 'uf' | 'slug' | 'nome'> {}

/** The meta description, from the numbers of the result only (fixture cities say the data is fictitious). */
export function previewDescription(result: CityResult | undefined, city: Pick<PreviewCity, 'nome' | 'uf'>, fixture = false): string {
  const name = displayName(city.nome)
  const label = ufLabel(city.uf)
  const place = `${name} (${label})`
  const say = (key: Parameters<typeof message>[1], params: Record<string, string | number> = {}) => message(DEFAULT_VOICE, key, params)
  const note = fixture ? say('preview.fixture') : ''
  const intro = say('preview.intro', { place })
  if (!result) return say('preview.noResult', { note, intro })
  const cycle = { note, intro, ano: result.ano, turno: result.turno }
  if (result.aptos <= 0) return say('preview.noElectorate', cycle)
  if (result.validos <= 0) return say('preview.noValidVotes', { ...cycle, notVoted: result.notVotedPct })
  // Both shares in ballot-number order, as the card shows them; no word says who is ahead (#104).
  const [first, second] = result.voted
  if (first && second?.key === 'b') return say('preview.pair', { ...cycle, voted: result.votedPct, first: first.label, firstPct: first.pct, second: second.label, secondPct: second.pct })
  return say('preview.default', { ...cycle, voted: result.votedPct, leader: first?.label ?? '', pct: first?.pct ?? 0 })
}

export interface PreviewHeadOptions {
  /** Absolute site origin (og tags are absolute; SITE_ORIGIN, default the frame's address). */
  origin?: string
  /** Base path at build time (SITE_BASE). */
  base?: string
  /** Fictitious data (manifest.fixture). */
  fixture?: boolean
}

/** The whole head contract of a city page, from the card's default view (the latest result). */
export function previewHead(city: PreviewCity, result: CityResult | undefined, o: PreviewHeadOptions = {}): PreviewHead {
  const name = displayName(city.nome)
  const label = ufLabel(city.uf)
  const subject = `${name} (${label})`
  const view = result ? `: resultado das eleições de ${result.ano}` : ': resultados das eleições'
  return {
    title: `${subject}${view} · Voto a Voto`,
    ogTitle: `${subject}${view}`,
    description: previewDescription(result, city, o.fixture),
    url: cityUrl(o.origin ?? siteOrigin(), o.base ?? '/', city.uf, city.slug),
    image: result
      ? {
          url: previewUrl(o.origin ?? siteOrigin(), o.base ?? '/', city.uf, city.slug),
          type: PREVIEW_TYPE,
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          alt: headline(result, { cityName: name, overseas: city.uf === 'zz' }),
        }
      : undefined,
  }
}

/** The picture the preview image is rasterised from: THE share picture (ticket #7's function and content), shown at the preview size. Same input, same drawing as the share sheet's default view. */
export function previewSvg(result: CityResult, city: PreviewCity, o: PreviewHeadOptions = {}): string {
  return shareContent(result, city, { origin: o.origin ?? siteOrigin(), base: o.base ?? '/', fixture: !!o.fixture, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }).svg
}