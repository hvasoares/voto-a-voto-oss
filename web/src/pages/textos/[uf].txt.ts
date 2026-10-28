import type { APIRoute } from 'astro'
import '@/lib/sentences/catalog-texts'
import { DEFAULT_VOICE, message } from '@/lib/sentences/catalog'
import { cityTexts } from '@/lib/city-texts-build'
import { currentEdition } from '@/lib/editions-load'
import { datasetFixture, loadCityShard, loadSearchShard } from '@/lib/shard-files'
import { normalizeBase } from '@/paths'
import { siteOrigin } from '@/lib/share-url'

/**
 * One plain-text file per state (#65): the WhatsApp block and the bulletin of every city of the state, built from the same function as the city's page. One file per
 * state, not per city: 27 files plus the overseas posts, a bounded part of the site. Final data, not live.
 */
export async function getStaticPaths() {
  return [...new Set(((await loadSearchShard()) ?? []).map(([, , uf]) => uf))].sort().map((uf) => ({ params: { uf } }))
}

export const GET: APIRoute = async ({ params }) => {
  const uf = params.uf!
  const edition = await currentEdition()
  const fixture = await datasetFixture()
  const base = normalizeBase(import.meta.env.BASE_URL)
  const say = (key: string) => message(DEFAULT_VOICE, key as never)
  const rows = ((await loadSearchShard()) ?? []).filter(([, , rowUf]) => rowUf === uf).sort((a, b) => a[1].localeCompare(b[1]))
  const parts: string[] = []
  for (const [, slug] of rows) {
    const t = cityTexts((await loadCityShard(uf, slug))!, { origin: siteOrigin(), base, fixture, editionDate: edition.date })
    parts.push([`== ${t.name} (${uf.toUpperCase()}) ==`, `-- ${say('text.wa.title')}`, t.whatsapp.standard, '', `-- ${say('text.radio.title')}`, t.bulletin.standard].join('\n'))
  }
  return new Response(parts.join('\n\n') + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
