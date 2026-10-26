/**
 * Generates the committed fixture dataset (same schema as ticket #1's data/).
 * Run: `npx tsx fixtures/generate.ts`. Output is deterministic; commit the CSVs.
 *
 * ALL NUMBERS HERE ARE FICTITIOUS. "Cidade Exemplo" reproduces the figures drawn in
 * the Sketch frames (2 Cartao da cidade, 3 Compartilhamento, 9 Tres ciclos).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = resolve(dirname(fileURLToPath(import.meta.url)), 'data')
mkdirSync(out, { recursive: true })

interface Spec { uf: string; cd: string; ibge: string; nome: string; slug: string; regiao: string; ciclos: number[] }
const cities: Spec[] = [
  { uf: 'RJ', cd: '99001', ibge: '3399001', nome: 'Cidade Exemplo', slug: 'cidade-exemplo', regiao: 'Sudeste', ciclos: [2018, 2022, 2026] },
  ...['A', 'B', 'C', 'D', 'E'].map((l, i): Spec => ({ uf: 'RJ', cd: `9900${i + 2}`, ibge: `339900${i + 2}`, nome: `Cidade Exemplo ${l}`, slug: `cidade-exemplo-${l.toLowerCase()}`, regiao: 'Sudeste', ciclos: [2018, 2022, 2026] })),
  { uf: 'SP', cd: '99101', ibge: '3599101', nome: 'Cidade Exemplo Paulista', slug: 'cidade-exemplo-paulista', regiao: 'Sudeste', ciclos: [2018, 2022, 2026] },
  { uf: 'MT', cd: '99201', ibge: '5199201', nome: 'Boa Esperança do Norte', slug: 'boa-esperanca-do-norte', regiao: 'Centro-Oeste', ciclos: [2026] },
  { uf: 'ZZ', cd: '99301', ibge: '', nome: 'Exterior (posto exemplo)', slug: 'exterior-exemplo', regiao: 'Exterior', ciclos: [2018, 2022, 2026] },
]

/** Exact figures for Cidade Exemplo, round 1, from the Sketch frames (aptos 100.000). */
const sketch: Record<number, { valid: number; a: number; abst: number; br: number; nu: number }> = {
  2018: { valid: 79000, a: 43450, abst: 17220, br: 1800, nu: 1980 },
  2022: { valid: 80000, a: 39200, abst: 17000, br: 1400, nu: 1600 },
  2026: { valid: 70000, a: 36400, abst: 23400, br: 3000, nu: 3600 },
}

const rows = { turnout: [] as string[], votes: [] as string[] }
const aptosBase = 100000
let seed = 7
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

for (const [ci, c] of cities.entries()) {
  for (const ano of c.ciclos) {
    for (const turno of [1, 2]) {
      const exact = c.slug === 'cidade-exemplo' && turno === 1 ? sketch[ano] : undefined
      const aptos = c.slug === 'cidade-exemplo' ? aptosBase : 20000 + ci * 15000 + Math.floor(rnd() * 5000)
      let valid: number, a: number, abst: number, br: number, nu: number
      if (exact) ({ valid, a, abst, br, nu } = exact)
      else {
        abst = Math.round(aptos * (0.18 + rnd() * 0.12 + (turno === 2 ? 0.01 : 0)))
        br = Math.round(aptos * 0.02)
        nu = Math.round(aptos * 0.025)
        valid = aptos - abst - br - nu
        a = Math.round(valid * (0.42 + rnd() * 0.16))
      }
      const comp = aptos - abst
      rows.turnout.push([ano, turno, c.uf, c.cd, aptos, comp, abst, br, nu, 0, valid].join(','))
      rows.votes.push([ano, turno, c.uf, c.cd, 91, a].join(','), [ano, turno, c.uf, c.cd, 92, valid - a].join(','))
    }
  }
}

const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
const sorted = (xs: string[]) => [...xs].sort()
writeFileSync(`${out}/cities.csv`, ['uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos', ...cities.map((c) => [c.uf, c.cd, c.ibge, q(c.nome), c.slug, c.regiao, c.ciclos.join(';')].join(','))].join('\n') + '\n')
writeFileSync(`${out}/turnout.csv`, ['ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos', ...sorted(rows.turnout)].join('\n') + '\n')
writeFileSync(`${out}/votes.csv`, ['ano,turno,uf,cd_municipio,candidato_numero,votos', ...sorted(rows.votes)].join('\n') + '\n')
const cand = [2018, 2022, 2026].flatMap((ano) => [1, 2].flatMap((t) => [`${ano},${t},91,Candidato A,PA`, `${ano},${t},92,Candidato B,PB`]))
writeFileSync(`${out}/candidates.csv`, ['ano,turno,candidato_numero,nome_urna,partido', ...cand].join('\n') + '\n')
writeFileSync(`${out}/manifest.json`, JSON.stringify({ fixture: true, note: 'Fictitious fixture data with the same schema as data/ from ticket #1. Not election results.', sources: [] }, null, 2) + '\n')
console.log('fixtures written to', out)
