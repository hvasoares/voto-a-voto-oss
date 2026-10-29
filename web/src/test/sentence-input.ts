/**
 * Shared inputs for the sentence tests (#135). `sentenceInput()` builds a CityResult — the type the
 * sentence modules take — from the electorate, the valid votes per candidate (ballot number =
 * position + 1) and the turnout, with plausible defaults everywhere: a consistent input where the
 * numbers add up. `rawSentenceInput()` returns the RAW buildCityResult argument instead, for a test
 * that needs the numbers deliberately inconsistent (a validos that is not the sum of the candidate
 * votes, votes without candidates and so on): what is passed is what buildCityResult gets, nothing
 * is recomputed. Defaults are fresh objects on every call.
 */
import type { Candidate, Turno, Turnout, Vote } from '@/data'
import { buildCityResult, type CityResult, type CityResultInput } from '@/shared/city-model'

export interface SentenceInputSpec {
  ano?: number
  turno?: Turno
  uf?: string
  cdMunicipio?: string
  /** The electorate; default 1000. */
  aptos?: number
  /** Valid votes per candidate, in ballot-number order; default [500, 400]. */
  votos?: number[]
  /** Ballot names (nomeUrna, as the dataset has them); default CAND 1, CAND 2, ... */
  nomes?: string[]
  /** Turnout; default = the sum of the valid votes (nobody skipped, nothing blank or null). */
  comparecimento?: number
  brancos?: number
}

interface NumberSpec {
  ano: number
  turno: Turno
  uf: string
  cdMunicipio: string
  aptos: number
  comparecimento: number
  brancos: number
  validos: number
  votos: readonly number[]
  nomes?: string[]
}

const rawNumbers = (o: NumberSpec): CityResultInput => ({
  turnout: { ano: o.ano, turno: o.turno, uf: o.uf, cdMunicipio: o.cdMunicipio, aptos: o.aptos, comparecimento: o.comparecimento, abstencoes: o.aptos - o.comparecimento, brancos: o.brancos, nulos: o.comparecimento - o.validos - o.brancos, anuladosApuSep: 0, validos: o.validos },
  votes: o.votos.map((v, i): Vote => ({ ano: o.ano, turno: o.turno, uf: o.uf, cdMunicipio: o.cdMunicipio, candidatoNumero: i + 1, votos: v })),
  candidates: o.votos.map((_, i): Candidate => ({ ano: o.ano, turno: o.turno, candidatoNumero: i + 1, nomeUrna: o.nomes?.[i] ?? `CAND ${i + 1}`, partido: 'P' })),
})

export function sentenceInput(spec: SentenceInputSpec = {}): CityResult {
  const ano = spec.ano ?? 2026
  const turno = spec.turno ?? 1
  const uf = spec.uf ?? 'rj'
  const cdMunicipio = spec.cdMunicipio ?? '1'
  const votos = spec.votos ?? [500, 400]
  const validos = votos.reduce((a, b) => a + b, 0)
  return buildCityResult(
    rawNumbers({ ano, turno, uf, cdMunicipio, aptos: spec.aptos ?? 1000, comparecimento: spec.comparecimento ?? validos, brancos: spec.brancos ?? 0, validos, votos, nomes: spec.nomes }),
  )
}

export interface RawSentenceInputSpec {
  /** Written into the default turnout rows (and the default votes and candidates) before merging. */
  ano?: number
  turno?: Turno
  /** Merged over the default turnout; nothing is recomputed from the votes. */
  turnout?: Partial<Turnout>
  /** Replace the default rows wholesale. */
  votes?: readonly Vote[]
  candidates?: readonly Candidate[]
}

export function rawSentenceInput(spec: RawSentenceInputSpec = {}): CityResultInput {
  const base = rawNumbers({ ano: spec.ano ?? 2026, turno: spec.turno ?? 1, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 900, brancos: 0, validos: 900, votos: [500, 400] })
  return {
    turnout: { ...base.turnout, ...spec.turnout },
    votes: spec.votes ?? base.votes,
    candidates: spec.candidates ?? base.candidates,
  }
}
