import { describe, expect, it } from 'vitest'
import { loadCityRoutes } from '../src/lib/city-routes'
import { fixtureCityShards } from '../src/lib/shard-files'
import { cityShardResult } from '../src/lib/city-shard'
import { shareContent } from '../src/lib/share-model'
import { shareSheetContent } from '../src/lib/share-sheet-record'
import { defaultView } from '../src/slots/city/city-view'
import { validatePageData } from '../src/shared/page-data'
import { joinPageData, pageDataFiles } from './page-data'
import { SHARE_FAMILY, sharePageRecords } from './share-pages'

/**
 * The share family's records (private#209): a golden of the data file on the fixture, the parity of the picture built from the file with the
 * picture the page prints today, and the join of the writer over the route list of the family.
 */
const FP = '0123456789abcdef'
const BUILD = { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true, edition: '2026-10-01' }
const records = async (build = BUILD) => sharePageRecords(await loadCityRoutes(), build)
const filesOf = async (build = BUILD) => pageDataFiles(FP, SHARE_FAMILY, await records(build))

describe('the share data files (golden)', () => {
  it('pins the file of the fixture city', async () => {
    const file = (await filesOf()).find((f) => f.path === `v${FP}/compartilhar/rj/cidade-exemplo.json`)
    expect(file!.json).toMatchInlineSnapshot(`"{"data":{"base":"/","edition":"2026-10-01","fixture":true,"nome":"Cidade Exemplo","origin":"https://votoavoto.exemplo.br","result":{"ano":2026,"aptos":100000,"comparecimento":72934,"naoVotaram":31566,"notVoted":[{"key":"abstencao","label":"Abstenção","pct":86,"votos":27066},{"key":"brancos","label":"Brancos","pct":6,"votos":2000},{"key":"nulos","label":"Nulos","pct":8,"votos":2500}],"notVotedPct":32,"notVotedShare":31.566,"outrosCount":0,"ranking":[{"nome":"Candidato A","numero":91,"short":"A","votos":34537},{"nome":"Candidato B","numero":92,"short":"B","votos":33897}],"turno":2,"validos":68434,"voted":[{"key":"a","label":"Candidato A","numero":91,"pct":50,"short":"A","tone":"a","votos":34537},{"key":"b","label":"Candidato B","numero":92,"pct":50,"short":"B","tone":"b","votos":33897}],"votedPct":68,"votedShare":68.434},"slug":"cidade-exemplo","uf":"rj","view":{"ano":2026,"turno":2}},"family":"compartilhar","path":"rj/cidade-exemplo","sum":"32646efd","v":1}"`)
  })

  it('every file passes the shape validator', async () => {
    for (const f of await filesOf()) expect(validatePageData(JSON.parse(f.json), { family: SHARE_FAMILY })).toMatchObject({ ok: true })
  })
})

describe('the picture and the message built from the file', () => {
  it('are the ones built from the city shard today, for every fixture city (string equality)', async () => {
    const files = new Map((await filesOf()).map((f) => [f.path, JSON.parse(f.json).data]))
    const shards = await fixtureCityShards()
    expect(shards.length).toBeGreaterThan(1)
    for (const shard of shards) {
      const { uf, slug } = shard.city
      const view = defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
      const result = cityShardResult(shard, view.ano, view.turno)
      const today = result ? shareContent(result, shard.city, BUILD) : null
      expect(shareSheetContent(files.get(`v${FP}/compartilhar/${uf}/${slug}.json`))).toEqual(today)
      if (today) expect(shareSheetContent(files.get(`v${FP}/compartilhar/${uf}/${slug}.json`))!.svg).toBe(today.svg)
    }
  })
})

describe('the join of the share family', () => {
  it('has exactly one file for each city route of the build, and no file without a page', async () => {
    const routes = (await loadCityRoutes()).map((c) => `${c.uf}/${c.slug}`)
    expect(routes.length).toBeGreaterThan(1)
    expect(joinPageData(SHARE_FAMILY, FP, routes, (await filesOf()).map((f) => f.path))).toEqual([])
  })
})
