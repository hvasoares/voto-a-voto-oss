/** Build time only: the kit of one state (#66): the sealed recap picture and the captions file. Pages and endpoints call this, so they print the same bytes. */
import { currentEdition } from './editions-load'
import { editionPath } from './editions'
import { kitCaptions, sealSvg } from './press-kit'
import { loadRecap } from './recap-data'
import { recapContent } from './recap-content'
import { datasetFixture } from './shard-files'
import { siteOrigin } from './share-url'
import { UF_NOME } from './uf-names'
import { siteBase } from '@/paths'

export const KIT_CHART_FILE = 'resumo-do-estado.svg'

export async function stateKit(uf: string) {
  const base = siteBase()
  const edition = await currentEdition()
  const fixture = await datasetFixture()
  const recap = (await loadRecap(uf))!
  const stateName = UF_NOME[uf] ?? uf.toUpperCase()
  const content = recapContent(recap, { stateName, origin: siteOrigin(), base, fixture, edition: edition.id })
  const hasData = recap.rows.some((r) => r.status === 'data')
  const svg = sealSvg(content.svg, { edition: edition.id, fixture })
  const root = `${siteOrigin()}${base}`
  const captions = kitCaptions({
    stateName,
    uf,
    caption: content.variants.standard.alt,
    captionPlain: content.variants.plain.alt,
    file: KIT_CHART_FILE,
    edition,
    editionUrl: `${root}${editionPath(edition.id)}`,
    pageUrl: content.url,
    hasData,
  })
  return { uf, stateName, svg, captions, hasData, edition, fixture, content, base }
}
