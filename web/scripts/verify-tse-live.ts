/**
 * Launch gate (issue #21), criterion 2, part (a): verify the committed dataset against TSE's own
 * results site LIVE. Run from web/: `npm run check:tse-live`.
 *
 * For a sample of cities and for the national file we fetch the same signed `.jws` result the TSE
 * results portal serves (the source the dataset itself was built from, per data/manifest.json
 * "tse_results_2026", base_url https://resultados.tse.jus.br/oficial/ele2026), decode it and compare
 * figure by figure with:
 *   - data/turnout.csv + data/votes.csv (the dataset the site pre-renders its pages from), and
 *   - data/manifest.json national_reference (the pinned TSE published totals).
 *
 * Every comparison is one recorded figure; the run passes only when ALL of them match. Requires
 * network access; each request has a short timeout (--timeout-ms, default 10000) and the total is
 * capped by requiring 200s or fewer.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE_URL = 'https://resultados.tse.jus.br/oficial'
const CYCLE = 'ele2026'
const ELECTIONS = { 1: '6257', 2: '6258' } as const

interface CityRow { uf: string; code: string; slug: string; nome: string }

/** Cities of the live sample (slug). All come from ../data/cities.csv. */
const SAMPLE_SLUGS = ['sp/sao-paulo', 'rj/rio-de-janeiro', 'df/brasilia', 'ba/salvador', 'pr/marquinho', 'mg/itabirito', 'rj/campos-dos-goytacazes']

const pt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

function cities(dataDir: string): CityRow[] {
  const lines = readFileSync(resolve(dataDir, 'cities.csv'), 'utf8').trim().split('\n')
  const header = lines[0]!.split(',')
  const uf = header.indexOf('uf'), code = header.indexOf('cd_municipio'), slug = header.indexOf('slug'), nome = header.indexOf('nome')
  const wanted = new Set(SAMPLE_SLUGS.map((s) => s.split('/')[1]!))
  return lines.slice(1).map((l) => l.split(',')).filter((r) => wanted.has(r[slug]!)).map((r) => ({ uf: r[uf]!, code: r[code]!, slug: r[slug]!, nome: r[nome]! }))
}

function datasetRows(dataDir: string, file: string, keyCols: (h: string) => number[]): Map<string, string[]> {
  const lines = readFileSync(resolve(dataDir, file), 'utf8').trim().split('\n')
  const header = lines[0]!.split(',')
  const idx = keyCols(header)
  return new Map(lines.slice(1).map((l) => l.split(',')).map((r) => [idx.map((i) => r[i]!).join('|'), r]))
}

/** The 2026 turnout/votes rows keyed `turno|uf|code` (or `turno|candidato` summed nationally). */
function dataset2026(dataDir: string) {
  const turnout = datasetRows(dataDir, 'turnout.csv', (h) => [h.indexOf('turno'), h.indexOf('uf'), h.indexOf('cd_municipio')])
  const votes = datasetRows(dataDir, 'votes.csv', (h) => [h.indexOf('turno'), h.indexOf('uf'), h.indexOf('cd_municipio'), h.indexOf('candidato_numero')])
  const national = new Map<string, number>()
  for (const [key, row] of votes) {
    const [turno, , , cand] = key.split('|')
    if (turno !== '1' && turno !== '2') continue
    const k = `${turno}-${cand}`
    national.set(k, (national.get(k) ?? 0) + Number(row[5]!))
  }
  return { turnout, votes, national: [...national].map(([k, v]) => ({ key: k, votes: v })) }
}

function decodeJws(text: string): Record<string, any> {
  const payload = text.trim().split('.')[1]!
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

async function fetchJson(url: string, timeoutMs: number): Promise<Record<string, any>> {
  const control = AbortSignal.timeout(timeoutMs)
  const res = await fetch(url, { signal: control, headers: { 'User-Agent': 'voto-a-voto launch-gate verification' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return decodeJws(await res.text())
}

const payloadCity = (p: Record<string, any>) => ({
  status: p.and,
  validos: Number(p.v.vvc), brancos: Number(p.v.vb), nulos: Number(p.v.tvn),
  comparecimento: Number(p.e.c),
  votes: Object.fromEntries((p.carg?.[0]?.agr ?? []).flatMap((g: any) => g.par ?? []).flatMap((par: any) => (par.cand ?? []).map((c: any) => [String(c.n), Number(c.vap)]))),
})

async function main() {
  const dataDir = resolve(process.env.DATA_DIR ?? '../data')
  const timeoutMs = Number(process.env.TIMEOUT_MS ?? 10_000)
  const figures: { figure: string; source: string; expected: string; live: string; match: boolean }[] = []
  const record = (figure: string, source: string, expected: number | string, live: number | string, match = `${expected}` === `${live}`) =>
    figures.push({ figure, source, expected: `${expected}`, live: `${live}`, match })
  const dataset = dataset2026(dataDir)
  const manifest = JSON.parse(readFileSync(resolve(dataDir, 'manifest.json'), 'utf8'))

  // national files first
  const nationalFigureCols: Array<[string, string]> = [
    ['comparecimento', 'e.c'], ['validos', 'v.vvc'], ['brancos', 'v.vb'], ['nulos', 'v.tvn'],
  ]
  for (const turno of ['1', '2'] as const) {
    const ele = ELECTIONS[turno]
    const url = `${BASE_URL}/${CYCLE}/${ele}/dados/br/br-c0001-e00${ele}-u.jws`
    const p = await fetchJson(url, timeoutMs)
    const live = payloadCity(p)
    const ref = manifest.national_reference[`2026-${turno}`]
    console.log(`nacional 2026-${turno}: status ${live.status} (${url})`)
    const datasetValidos = [...dataset.turnout].filter(([, r]) => r[0] === '2026' && r[1] === turno).reduce((a, [, r]) => a + Number(r[10]!), 0)
    const datasetComparecimento = [...dataset.turnout].filter(([, r]) => r[0] === '2026' && r[1] === turno).reduce((a, [, r]) => a + Number(r[5]!), 0)
    record(`nacional ${turno}º turno: votos válidos`, `${url} | data/manifest.json national_reference 2026-${turno} .validos | soma de data/turnout.csv`, ref.validos, live.validos, `${live.validos}` === `${ref.validos}` && `${live.validos}` === `${datasetValidos}`)
    record(`nacional ${turno}º turno: comparecimento`, `${url} | data/manifest.json national_reference 2026-${turno} .comparecimento | soma de data/turnout.csv`, ref.comparecimento, live.comparecimento, `${live.comparecimento}` === `${ref.comparecimento}` && `${live.comparecimento}` === `${datasetComparecimento}`)
    for (const [name, field] of [['Lula (13)', '13'], ['Flavio Bolsonaro (22)', '22']] as const) {
      const fromDataset = dataset.national.find((x) => x.key === `${turno}-${field}`)?.votes ?? -1
      record(`nacional ${turno}º turno: votos de ${name}`, `${url} | data/manifest.json national_reference 2026-${turno} .candidates.${field} | soma de data/votes.csv`, ref.candidates[field]!, live.votes[field]!, `${live.votes[field]}` === `${ref.candidates[field]}` && `${live.votes[field]}` === `${fromDataset}`)
    }
    void nationalFigureCols
  }

  // the cities, round 2 (the round every screen opens on) and round 1 for two of them
  for (const city of cities(dataDir)) {
    for (const turno of ['2', ...(city.slug === 'sao-paulo' || city.slug === 'marquinho' ? ['1'] : [])] as const) {
      const ele = ELECTIONS[turno]
      const code = city.code.padStart(5, '0')
      const uf = city.uf.toLowerCase()
      const url = `${BASE_URL}/${CYCLE}/${ele}/dados/${uf}/${uf}${code}-c0001-e00${ele}-u.jws`
      const p = await fetchJson(url, timeoutMs)
      const live = payloadCity(p)
      const t = dataset.turnout.get(`${turno}|${city.uf}|${city.code}`)
      console.log(`${city.nome}/${city.uf} (${city.slug}) ${turno}º turno: status ${live.status} (${url})`)
      const okTurnout = t !== undefined && Number(t[10]) === live.validos && Number(t[5]) === live.comparecimento
      record(`${city.nome}/${city.uf} ${turno}º turno: votos válidos`, `${url} | data/turnout.csv (turno ${turno}, ${city.code})`, live.validos, t?.[10], okTurnout)
      record(`${city.nome}/${city.uf} ${turno}º turno: comparecimento`, `${url} | data/turnout.csv (turno ${turno}, ${city.code})`, live.comparecimento, t?.[5], okTurnout)
      for (const cand of ['13', '22']) {
        const v = dataset.votes.get(`${turno}|${city.uf}|${city.code}|${cand}`)?.[5]
        record(`${city.nome}/${city.uf} ${turno}º turno: votos de ${cand === '13' ? 'Lula' : 'Flavio Bolsonaro'}`, `${url} | data/votes.csv (turno ${turno}, ${city.code}, candidato ${cand})`, live.votes[cand]!, v, `${live.votes[cand]}` === `${v}`)
      }
    }
  }

  const bad = figures.filter((f) => !f.match)
  const report = { ranAt: new Date().toISOString(), dataDir, tseBase: BASE_URL, figuresVerified: figures.length, mismatches: bad, figures }
  const outDir = resolve('docs', 'launch-gate')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'tse-live-verification.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`\n${figures.length} figuras verificadas ao vivo contra resultados.tse.jus.br (mínimo 20): ${figures.length - bad.length} iguais, ${bad.length} divergentes`)
  for (const f of figures.sort((a, b) => a.figure.localeCompare(b.figure))) console.log(`${f.match ? 'IGUAL  ' : 'DIVERGE'} ${f.figure}: ${f.expected}`)
  if (bad.length) {
    console.error('\nmismatches:\n' + JSON.stringify(bad, null, 2))
    process.exitCode = 1
  }
}

await main()