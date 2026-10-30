import { describe, expect, it } from 'vitest'
import { FactGateError } from '../src/lib/facts/gate'
import { drawBoth } from '../src/lib/facts/model'
import { loadFactPages, sealFactPages } from '../src/lib/facts/pages'
import { validatePageData } from '../src/shared/page-data'
import { joinPageData, pageDataFiles } from './page-data'
import { FACT_FAMILY, factPageRecords } from './fact-pages'

/**
 * The calculation pages' records (private#212): a golden of the data file on the fixture, the parity of the file's figures with the records the
 * page prints (with the page's own subtitle and limits as phrases, private#214), the join of the writer over the route list of the family, and the gate: a record that fails still fails the build.
 */
const FP = '0123456789abcdef'
const filesOf = async () => pageDataFiles(FP, FACT_FAMILY, await factPageRecords())
const pathOf = (p: { scope: string; page: string }) => `v${FP}/${FACT_FAMILY}/${p.scope}/${p.page}.json`

describe('the calculation data files (golden)', () => {
  it('pins the file of the fixture city card, round 2', async () => {
    const file = (await filesOf()).find((f) => f.path === `v${FP}/fato/rj/cidade-exemplo/2026-2.json`)
    expect(file!.json).toMatchInlineSnapshot(`"{"data":{"backPath":"rj/cidade-exemplo/?ciclo=2026&turno=2","edition":{"date":"2026-10-26","id":"2026-10-26"},"except":[],"facts":[{"anchor":"frase","calculation":{"formula":"eleitores que não votaram ÷ eleitores aptos × 100, e votos de cada um dos dois mais votados ÷ eleitores aptos × 100","worked":["31.566 ÷ 100.000 × 100 = 31,6%","34.537 ÷ 100.000 × 100 = 34,5%","33.897 ÷ 100.000 × 100 = 33,9%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/frase","inputs":[{"field":"turnout.csv · aptos","label":"Eleitores aptos","value":"100.000"},{"label":"Eleitores que não votaram","value":"31.566"},{"field":"votes.csv · votos","label":"Votos do mais votado","value":"34.537"},{"field":"votes.csv · votos","label":"Votos do segundo mais votado","value":"33.897"}],"say":{"k":"vsLeader","p":{"lead":{"k":"lead.city","p":{"ano":2026,"city":"Cidade Exemplo","turno":2}},"name":"Candidato A","nonVoters":{"k":"nonVoters.share","p":{"share":"31,6%"}},"phrase":{"k":"phrase.almost"},"value":"34,5%"}},"shown":"","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"A frase do cartão"},{"anchor":"votaram","calculation":{"formula":"votos válidos ÷ eleitores aptos × 100","worked":["68.434 ÷ 100.000 × 100 = 68,4%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/votaram","inputs":[{"field":"turnout.csv · aptos","label":"Eleitores aptos","value":"100.000"},{"field":"turnout.csv · validos","label":"Votos válidos","value":"68.434"}],"say":{"k":"fact.votaram","p":{"ano":2026,"aptos":"100.000","city":"Cidade Exemplo","pct":"68,4%","turno":2,"validos":"68.434"}},"shown":"68%","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Votaram"},{"anchor":"naoVotaram","calculation":{"formula":"(eleitores aptos − votos válidos) ÷ eleitores aptos × 100","worked":["100.000 − 68.434 = 31.566","31.566 ÷ 100.000 × 100 = 31,6%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/naoVotaram","inputs":[{"field":"turnout.csv · aptos","label":"Eleitores aptos","value":"100.000"},{"field":"turnout.csv · validos","label":"Votos válidos","value":"68.434"}],"say":{"k":"fact.naoVotaram","p":{"ano":2026,"aptos":"100.000","city":"Cidade Exemplo","n":"31.566","pct":"31,6%","turno":2}},"shown":"32%","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Não votaram"},{"anchor":"a","calculation":{"formula":"votos da linha ÷ votos válidos × 100","worked":["34.537 ÷ 68.434 × 100 = 50,5%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/a","inputs":[{"field":"votes.csv · votos","label":"Votos de Candidato A","value":"34.537"},{"field":"turnout.csv · validos","label":"Votos válidos","value":"68.434"}],"say":{"k":"fact.candidate","p":{"ano":2026,"city":"Cidade Exemplo","name":"Candidato A","pct":"50,5%","turno":2,"validos":"68.434","votos":"34.537"}},"shown":"34.537 · 50% dos votos","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Candidato A"},{"anchor":"b","calculation":{"formula":"votos da linha ÷ votos válidos × 100","worked":["33.897 ÷ 68.434 × 100 = 49,5%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/b","inputs":[{"field":"votes.csv · votos","label":"Votos de Candidato B","value":"33.897"},{"field":"turnout.csv · validos","label":"Votos válidos","value":"68.434"}],"say":{"k":"fact.candidate","p":{"ano":2026,"city":"Cidade Exemplo","name":"Candidato B","pct":"49,5%","turno":2,"validos":"68.434","votos":"33.897"}},"shown":"33.897 · 50% dos votos","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Candidato B"},{"anchor":"abstencao","calculation":{"formula":"eleitores da linha ÷ eleitores que não votaram × 100","worked":["31.566 − 4.500 = 27.066","27.066 ÷ 31.566 × 100 = 85,7%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/abstencao","inputs":[{"label":"Abstenção","value":"27.066"},{"label":"Eleitores que não votaram","value":"31.566"}],"say":{"k":"fact.notVotedPart","p":{"ano":2026,"city":"Cidade Exemplo","label":"Abstenção","n":"31.566","pct":"85,7%","turno":2,"votos":"27.066"}},"shown":"27.066 · 86% dos que não votaram","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Abstenção"},{"anchor":"brancos","calculation":{"formula":"eleitores da linha ÷ eleitores que não votaram × 100","worked":["2.000 ÷ 31.566 × 100 = 6,3%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/brancos","inputs":[{"field":"turnout.csv · brancos","label":"Brancos","value":"2.000"},{"label":"Eleitores que não votaram","value":"31.566"}],"say":{"k":"fact.notVotedPart","p":{"ano":2026,"city":"Cidade Exemplo","label":"Brancos","n":"31.566","pct":"6,3%","turno":2,"votos":"2.000"}},"shown":"2.000 · 6% dos que não votaram","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Brancos"},{"anchor":"nulos","calculation":{"formula":"eleitores da linha ÷ eleitores que não votaram × 100","worked":["2.500 ÷ 31.566 × 100 = 7,9%"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/nulos","inputs":[{"field":"turnout.csv · nulos + anulados_apu_sep","label":"Nulos","value":"2.500"},{"label":"Eleitores que não votaram","value":"31.566"}],"say":{"k":"fact.notVotedPart","p":{"ano":2026,"city":"Cidade Exemplo","label":"Nulos","n":"31.566","pct":"7,9%","turno":2,"votos":"2.500"}},"shown":"2.500 · 8% dos que não votaram","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Nulos"},{"anchor":"margem","calculation":{"formula":"votos do mais votado − votos do segundo mais votado; quantas vezes essa diferença cabe nos eleitores que não votaram (parte inteira)","worked":["34.537 − 33.897 = 640","31.566 ÷ 640 = 49,3; parte inteira: 49"]},"checks":["municipios","national"],"id":"rj/cidade-exemplo/2026-2/margem","inputs":[{"field":"votes.csv · votos","label":"Votos do mais votado","value":"34.537"},{"field":"votes.csv · votos","label":"Votos do segundo mais votado","value":"33.897"},{"label":"Eleitores que não votaram","value":"31.566"}],"method":{"href":"https://github.com/hvasoares/voto-a-voto-oss/blob/main/docs/nonvoters-vs-margin.md","name":"Nota do método: não votantes e margem"},"say":[{"k":"margin.gap","n":640,"p":{"n":"640"}},{"k":"margin.fits","n":49,"p":{"m":"31.566","times":"49"}}],"shown":"640","source":{"name":"EXEMPLO: números fictícios; a fonte dos números reais é o TSE","url":"https://dadosabertos.tse.jus.br/"},"title":"Quanto faltou para virar"}],"fixture":true,"page":"2026-2","rounds":[{"ano":2026,"turno":2}],"scope":"rj/cidade-exemplo","seal":["Contra o total nacional da edição de 26/10/2026 (2026, 2º turno): 605.041 comparecimentos e 568.348 votos válidos, iguais.","Contra a soma dos 9 municípios e postos do exterior (2026, 2º turno): 815.451 eleitores aptos, 605.041 comparecimentos e 568.348 votos válidos, iguais ao total do país."],"subtitle":{"k":"fact.sub","p":{"ano":2026,"city":"Cidade Exemplo","turno":2}},"title":"Cidade Exemplo"},"family":"fato","path":"rj/cidade-exemplo/2026-2","sum":"69e39335","v":1}"`)
  })

  it('every file passes the shape validator', async () => {
    for (const f of await filesOf()) expect(validatePageData(JSON.parse(f.json), { family: FACT_FAMILY })).toMatchObject({ ok: true })
  })
})

describe('the figures of the file are the ones of the records the page prints', () => {
  it('match fact by fact, with the same seal, source and formula, for every page', async () => {
    const pages = await loadFactPages()
    const files = new Map((await filesOf()).map((f) => [f.path, JSON.parse(f.json).data]))
    expect(pages.length).toBeGreaterThan(1)
    for (const p of pages) {
      const data = files.get(pathOf(p))
      expect(data.seal).toEqual(p.seal)
      expect(data.rounds).toEqual(p.rounds)
      expect(data.facts.map((f: { id: string }) => f.id)).toEqual(p.facts.map((f) => f.id))
      p.facts.forEach((fact, i) => {
        const { sentences: _s, scope: _sc, page: _pg, ...rest } = fact
        expect(data.facts[i]).toEqual(JSON.parse(JSON.stringify(rest)))
        expect(data.facts[i].calculation.formula).toBe(fact.calculation!.formula)
        expect(data.facts[i].inputs).toEqual(fact.inputs.map((x) => ({ ...x })))
        expect(data.facts[i].source).toEqual(fact.source)
      })
    }
  })

  it('hold no sentence text: no register sentence, subtitle or note appears in any file', async () => {
    const pages = await loadFactPages()
    const files = new Map((await filesOf()).map((f) => [f.path, f.json]))
    for (const p of pages) {
      const json = files.get(pathOf(p))!
      expect(json).not.toContain('"sentences"')
      for (const f of p.facts) for (const text of Object.values(f.sentences)) expect(json, f.id).not.toContain(JSON.stringify(text).slice(1, -1))
      for (const part of [p.subtitle, ...(p.note ? [p.note] : [])]) for (const text of Object.values(drawBoth(part)).filter((t) => t !== p.title)) expect(json, `${p.scope}/${p.page}`).not.toContain(JSON.stringify(text).slice(1, -1))
    }
  })
})

describe('the join of the calculation family', () => {
  it('has exactly one file for each /fato/ page of the build, and no file without a page', async () => {
    const routes = (await loadFactPages()).map((p) => `${p.scope}/${p.page}`)
    expect(routes.length).toBeGreaterThan(1)
    expect(joinPageData(FACT_FAMILY, FP, routes, (await filesOf()).map((f) => f.path))).toEqual([])
  })
})

describe('the gate stays on the way to the file', () => {
  it('a record without a source fails the build, and so does one with no calculation', async () => {
    const [page] = await loadFactPages()
    const { source: _source, ...noSource } = page!.facts[0]!
    await expect(sealFactPages([{ ...page!, facts: [noSource, ...page!.facts.slice(1)] }])).rejects.toThrow(FactGateError)
    await expect(sealFactPages([{ ...page!, facts: [{ ...page!.facts[0]!, calculation: undefined }] }])).rejects.toThrow(/no calculation/)
  })

  it('a page whose facts name a check that did not pass does not get a seal', async () => {
    const [page] = await loadFactPages()
    await expect(sealFactPages([{ ...page!, rounds: [{ ano: 1900, turno: 1 }] }])).rejects.toThrow(/seal of/)
  })
})
