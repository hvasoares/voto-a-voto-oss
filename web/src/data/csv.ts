import type { Candidate, City, Turno, Turnout, Vote } from './types'

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, LF or CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export class SchemaError extends Error {}

function records(file: string, text: string, columns: readonly string[]): Record<string, string>[] {
  const [header, ...body] = parseCsv(text.replace(/^﻿/, ''))
  if (!header) throw new SchemaError(`${file}: empty file`)
  const missing = columns.filter((c) => !header.includes(c))
  if (missing.length) throw new SchemaError(`${file}: missing column(s) ${missing.join(', ')}`)
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

const int = (file: string, col: string, v: string | undefined): number => {
  const n = Number(v)
  if (v === undefined || v === '' || !Number.isInteger(n)) throw new SchemaError(`${file}: column ${col} is not an integer: "${v}"`)
  return n
}
const turno = (file: string, v: string | undefined): Turno => {
  const n = int(file, 'turno', v)
  if (n !== 1 && n !== 2) throw new SchemaError(`${file}: turno must be 1 or 2, got ${n}`)
  return n
}

export const CITY_COLUMNS = ['uf', 'cd_municipio', 'cd_ibge', 'nome', 'slug', 'regiao', 'ciclos'] as const
export const TURNOUT_COLUMNS = ['ano', 'turno', 'uf', 'cd_municipio', 'aptos', 'comparecimento', 'abstencoes', 'brancos', 'nulos', 'anulados_apu_sep', 'validos'] as const
export const VOTE_COLUMNS = ['ano', 'turno', 'uf', 'cd_municipio', 'candidato_numero', 'votos'] as const
export const CANDIDATE_COLUMNS = ['ano', 'turno', 'candidato_numero', 'nome_urna', 'partido'] as const

export function parseCities(text: string): City[] {
  const f = 'cities.csv'
  return records(f, text, CITY_COLUMNS).map((r) => ({
    uf: r.uf!.toLowerCase(),
    cdMunicipio: r.cd_municipio!,
    cdIbge: r.cd_ibge!,
    nome: r.nome!,
    slug: r.slug!,
    regiao: r.regiao!,
    ciclos: r.ciclos!.split(';').filter(Boolean).map((y) => int(f, 'ciclos', y)),
  }))
}

export interface Centroid {
  cdIbge: string
  lat: number
  lon: number
}

export function parseCentroids(text: string): Centroid[] {
  const f = 'centroids.csv'
  const num = (col: string, v: string | undefined): number => {
    const n = Number(v)
    if (v === undefined || v === '' || !Number.isFinite(n)) throw new SchemaError(`${f}: column ${col} is not a number: "${v}"`)
    return n
  }
  return records(f, text, ['cd_ibge', 'lat', 'lon']).map((r) => ({ cdIbge: r.cd_ibge!, lat: num('lat', r.lat), lon: num('lon', r.lon) }))
}

export function parseTurnout(text: string): Turnout[] {
  const f = 'turnout.csv'
  return records(f, text, TURNOUT_COLUMNS).map((r) => ({
    ano: int(f, 'ano', r.ano),
    turno: turno(f, r.turno),
    uf: r.uf!.toLowerCase(),
    cdMunicipio: r.cd_municipio!,
    aptos: int(f, 'aptos', r.aptos),
    comparecimento: int(f, 'comparecimento', r.comparecimento),
    abstencoes: int(f, 'abstencoes', r.abstencoes),
    brancos: int(f, 'brancos', r.brancos),
    nulos: int(f, 'nulos', r.nulos),
    anuladosApuSep: int(f, 'anulados_apu_sep', r.anulados_apu_sep),
    validos: int(f, 'validos', r.validos),
  }))
}

export function parseVotes(text: string): Vote[] {
  const f = 'votes.csv'
  return records(f, text, VOTE_COLUMNS).map((r) => ({
    ano: int(f, 'ano', r.ano),
    turno: turno(f, r.turno),
    uf: r.uf!.toLowerCase(),
    cdMunicipio: r.cd_municipio!,
    candidatoNumero: int(f, 'candidato_numero', r.candidato_numero),
    votos: int(f, 'votos', r.votos),
  }))
}

export function parseCandidates(text: string): Candidate[] {
  const f = 'candidates.csv'
  return records(f, text, CANDIDATE_COLUMNS).map((r) => ({
    ano: int(f, 'ano', r.ano),
    turno: turno(f, r.turno),
    candidatoNumero: int(f, 'candidato_numero', r.candidato_numero),
    nomeUrna: r.nome_urna!,
    partido: r.partido!,
  }))
}
