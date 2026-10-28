import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { citation, csvText, parseCsv, permalink, provenanceLines, type Panel } from './actions'
import { CATALOG } from './catalog'
import { buildEscada } from './escada'
import { exportJson, exportOf } from './export-spec'
import { buildMapa } from './mapa'
import { panelCardSvg } from './panel-card'
import { placar } from './panels'
import { placesWithShards, readPlace } from './shards'
import { defaultState, parseQuery } from './url-state'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const edition = { id: '2026-10-26', label: '26/10/2026' }
const panel: Panel = { id: 'escada', title: 'Como o comparecimento mudou de um ciclo para o outro?', footer: { definicao: 'A medida, por ciclo e turno.', fonte: 'TSE, edição 26/10/2026 (2026-10-26), resultados finais.', calculo: 'Votantes ÷ eleitorado; barras a partir de 0%.', naoMede: 'O motivo de não votar.' } }
const state = { ...defaultState([2018, 2022, 2026]), medida: 'abstencao' }
const url = permalink('https://voto-a-voto.com', '/', 'dados-para-nerds/estado/sp/', state, 'escada')

describe('Citar', () => {
  it('builds the canonical permalink: the query string state and the panel anchor', () => {
    expect(url).toBe('https://voto-a-voto.com/dados-para-nerds/estado/sp/?ciclo=2026&turno=1&cargo=presidente&medida=abstencao#painel-escada')
    expect(permalink('https://x.test', '/voto-a-voto-oss', 'dados-para-nerds/', defaultState([2026]), 'par')).toBe('https://x.test/voto-a-voto-oss/dados-para-nerds/?ciclo=2026&turno=1&cargo=presidente#painel-par')
  })

  it('reopens the same state from the permalink (URL -> state -> URL)', () => {
    const query = new URL(url).search
    const { state: back, notes } = parseQuery(query, [2018, 2022, 2026])
    expect(notes).toEqual([])
    expect(permalink('https://voto-a-voto.com', '/', 'dados-para-nerds/estado/sp/', back, 'escada')).toBe(url)
  })

  const base = { edition, url, panel, place: 'São Paulo', siteUrl: 'https://voto-a-voto.com/' }
  it('writes plain text: "Fonte: TSE, edição [id], processado por voto-a-voto em [data], [URL]"', () => {
    expect(citation('texto', base)).toBe(`Fonte: TSE, edição 2026-10-26, processado por voto-a-voto em 26/10/2026, ${url}`)
  })
  it('writes Markdown with the site and the panel as links', () => {
    expect(citation('markdown', base)).toBe(`Fonte: TSE, edição 2026-10-26, processado por [voto-a-voto](https://voto-a-voto.com/) em 26/10/2026, [${panel.title}](${url})`)
  })
  it('writes a BibTeX @misc with the edition id, the date and the permalink', () => {
    const bib = citation('bibtex', base)
    expect(bib.split('\n')[0]).toBe('@misc{votoavoto_20261026_escada,')
    expect(bib).toContain('author = {{Tribunal Superior Eleitoral (TSE)}}')
    expect(bib).toContain('note = {Edição 2026-10-26, 26/10/2026}')
    expect(bib).toContain(`url = {${url}}`)
    expect(bib.endsWith('}')).toBe(true)
  })
})

describe('CSV', () => {
  const block = provenanceLines({ panel, edition, editionId: edition.id, place: 'São Paulo', url, fonte: panel.footer.fonte })

  it('starts with the provenance block that carries the four footer fields, the edition, the date, the licence and the permalink', () => {
    expect(block.map((l) => l.split(':')[0])).toEqual(['# Painel', '# Lugar', '# Definição', '# Fonte', '# Edição', '# Data', '# Cálculo', '# Não mede', '# Licença', '# Endereço'])
    expect(block).toContain('# Definição: A medida, por ciclo e turno.')
    expect(block).toContain('# Não mede: O motivo de não votar.')
    expect(block.at(-1)).toBe(`# Endereço: ${url}`)
  })

  it('round-trips the table as printed, quoting what needs it', () => {
    const table = { headers: ['Ciclo', 'Valor; a'], rows: [['2026', '77,0%'], ['2022', 'sem 2º turno'], ['x "y"', 'a;b']] }
    const parsed = parseCsv(csvText(block, table))
    expect(parsed.table).toEqual(table)
    expect(parsed.block).toEqual(block)
  })
})

describe('the export of every panel kind equals what the spec prints', () => {
  const all = readPlace('uf', 'sp', root)
  const brasil = readPlace('brasil', null, root)
  const known = placesWithShards(root)

  it('stat: one row per measure with the printed pair', () => {
    const exp = exportOf(placar({ 1: all.get('2022-1'), 2: all.get('2022-2') }))!.single!
    expect(exp.headers).toEqual(['Medida', '1º turno', '2º turno'])
    expect(exp.rows[0]![0]).toBe('Eleitorado')
    expect(exp.rows.find((r) => r[0] === 'Seções apuradas')![1]).toBe('não consta nos dados publicados')
  })

  it('bar: the Ficha, cell by cell', () => {
    const spec = buildEscada(CATALOG.find((r) => r.id === 'escada')!, { cycle: {}, all })
    const exp = exportOf(spec)!.single!
    expect(exp.rows.map((r) => r[0])).toEqual(['2018', '2022', '2026'])
    expect(exp.rows[1]![1]).toBe(spec.rows[1]!.cells.comparecimento![0]!.text)
  })

  it('map: one variant per view with every state\'s printed value and its legend step', () => {
    const spec = buildMapa(CATALOG.find((r) => r.id === 'mapa')!, { cycle: {}, all: brasil }, 'brasil', known.ufs)
    const exp = exportOf(spec)!.variants!
    expect(Object.keys(exp)).toContain('2026-1-comparecimento')
    const rj = exp['2026-1-comparecimento']!.rows.find((r) => r[0] === 'Rio de Janeiro')!
    expect(rj[1]).toBe(spec.views['2026-1-comparecimento']!.cells.rj!.text)
  })

  it('escapes "<" in the JSON block so a page cannot be broken out of', () => {
    expect(exportJson({ single: { headers: ['a'], rows: [['</script>']] } })).not.toContain('</script>')
  })
})

describe('Imagem', () => {
  const svg = panelCardSvg({ panel, table: { headers: ['Ciclo', '1º turno', '2º turno'], rows: [['2022', '77,0%', '73,8%']] }, place: 'São Paulo', fonte: panel.footer.fonte, url })

  it('is a 16:9 picture (1600 x 900) with the question, the numbers, the source seal, the four-field footer and the permalink as text', () => {
    expect(svg).toContain('width="1600" height="900" viewBox="0 0 1600 900"')
    for (const part of [panel.title.slice(0, 20), '77,0%', '73,8%', 'Fonte: TSE, dados finais', 'DEFINIÇÃO', 'FONTE', 'CÁLCULO', 'NÃO MEDE', panel.footer.naoMede, url.replace(/&/g, '&amp;')]) expect(svg, part).toContain(part)
  })
})
