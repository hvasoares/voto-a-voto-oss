/**
 * Everything the one-stat card needs for ONE choice of ONE city, pure: the words, the self-describing picture (#38), the address
 * and the file name. The generator (browser) and the reopening of a dropped file use this same function, so a card and its
 * recomputation are the same picture byte for byte.
 */
import type { CityShard } from './city-shard'
import { cityShardResult } from './city-shard'
import { annotateSvg, type CardKeys } from './card-keys'
import { QUERY_MEASURE, statFilename } from './generator-model'
import { DEFAULT_LOCALE, type Locale, type Register } from './sentences/catalog'
import { statCard, type Measure, type Stat } from './sentences/stat'
import { shortAddress } from './share-text'
import { cityUrl } from './share-url'
import { statCardSvg, type StatSize } from './stat-card'
import { displayName } from '@/shared/city-search'
import { defaultView, type View } from '@/slots/city/city-view'

export interface StatContentOptions {
  measure: Measure
  size: StatSize
  /** The cycle and round; the city card's default when omitted. */
  view?: View
  register?: Register
  locale?: Locale
  origin: string
  base: string
  fixture: boolean
  /** The data edition: given, the picture carries its keys. */
  edition?: string
}

export interface StatContent {
  view: View
  /** Undefined when the city has no data in the view. */
  svg: string | undefined
  stat: Stat
  url: string
  address: string
  filename: string
  keys?: CardKeys
}

export function statContent(shard: CityShard, o: StatContentOptions): StatContent {
  const view = o.view ?? defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
  const result = cityShardResult(shard, view.ano, view.turno)
  const locale = o.locale ?? DEFAULT_LOCALE
  const stat = statCard(result, o.measure, { cityName: displayName(shard.city.nome), overseas: shard.city.uf === 'zz', ano: view.ano, turno: view.turno, register: o.register, locale })
  const url = cityUrl(o.origin, o.base, shard.city.uf, shard.city.slug)
  const address = shortAddress(url)
  const keys: CardKeys | undefined = o.edition ? { view: `stat:${QUERY_MEASURE[o.measure]}:${view.ano}-${view.turno}:${o.size}`, places: [`${shard.city.uf}/${shard.city.slug}`], edition: o.edition, lang: locale } : undefined
  const drawn = result ? statCardSvg(stat, { size: o.size, address, fixture: o.fixture, locale }) : undefined
  return { view, svg: drawn && keys ? annotateSvg(drawn, keys, { address }) : drawn, stat, url, address, filename: statFilename(shard.city, o.measure, view, o.size), keys }
}
