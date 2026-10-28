/**
 * Build time only: the ready-made texts (#65) of one city shard in both registers, with the build gate. A page or a file that prints them calls this, so a block
 * over the limit or a bulletin with a number in digits fails the build instead of reaching the site.
 */
import type { CityShard } from './city-shard'
import { cityShardResult } from './city-shard'
import { radioBulletin, textProblems, whatsappText } from './city-texts'
import { displayName, ufLabel } from '@/shared/city-search'
import { defaultView } from '@/slots/city/city-view'
import { cityUrl } from './share-url'
import { REGISTERS, type Register } from './sentences/catalog'

export interface TextsContext {
  origin: string
  base: string
  fixture: boolean
  /** `edition.date` (YYYY-MM-DD) of the edition being built. */
  editionDate: string
}

export interface CityTexts {
  uf: string
  slug: string
  name: string
  url: string
  /** Per register. */
  whatsapp: Record<Register, string>
  bulletin: Record<Register, string>
}

export function cityTexts(shard: CityShard, ctx: TextsContext): CityTexts {
  const { city } = shard
  const view = defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
  const result = cityShardResult(shard, view.ano, view.turno)
  const url = cityUrl(ctx.origin, ctx.base, city.uf, city.slug)
  const base = { result, cityName: displayName(city.nome), ufLabel: ufLabel(city.uf), overseas: city.uf === 'zz', url, edition: { date: ctx.editionDate }, fixture: ctx.fixture, ano: view.ano, turno: view.turno }
  const whatsapp = {} as Record<Register, string>
  const bulletin = {} as Record<Register, string>
  for (const register of REGISTERS) {
    whatsapp[register] = whatsappText({ ...base, register })
    bulletin[register] = radioBulletin({ ...base, register })
    const problems = textProblems(whatsapp[register], bulletin[register], { hasData: !!result && result.validos > 0 })
    if (problems.length) throw new Error(`city texts of ${city.uf}/${city.slug} (${register}): ${problems.join('; ')}`)
  }
  return { uf: city.uf, slug: city.slug, name: base.cityName, url, whatsapp, bulletin }
}
