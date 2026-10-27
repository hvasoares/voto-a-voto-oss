/**
 * The text that goes with the picture, PURE. Neutral and built from the numbers of the CityResult only; both
 * candidates get the same treatment (the order is the order of the votes, as on the city card).
 *
 *   Resultado de {cidade}/{UF}, {ano}, {turno}º turno: {A} {a}% · {B} {b}% dos votos válidos; {n}% do eleitorado não votou. {url}
 *   round 1: "{A} {a}% · {B} {b}% · outros {c}% dos votos válidos"
 *   nobody got a valid vote: "nenhum voto válido; {n}% do eleitorado não votou."   no electorate: "sem eleitores aptos registrados."
 */
import type { PictureResult } from './share-card'

export interface ShareTextOptions {
  cityName: string
  /** "RJ", or "Exterior" for overseas posts. */
  ufLabel: string
  /** The city page's full address, scheme included (it is what the recipient taps). */
  url: string
}

/** `https://votoavoto.exemplo.br/rj/cidade-exemplo/` -> `votoavoto.exemplo.br/rj/cidade-exemplo` (what the picture shows). */
export function shortAddress(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '')
}

export function shareText(r: PictureResult, o: ShareTextOptions): string {
  const head = `Resultado de ${o.cityName}/${o.ufLabel}, ${r.ano}, ${r.turno}º turno: `
  if (r.aptos <= 0) return `${head}sem eleitores aptos registrados. ${o.url}`
  const notVoted = `${r.notVotedPct}% do eleitorado não votou`
  if (r.validos <= 0) return `${head}nenhum voto válido; ${notVoted}. ${o.url}`
  const parts = r.voted.map((s) => `${s.key === 'outros' ? 'outros' : s.label} ${s.pct}%`).join(' · ')
  return `${head}${parts} dos votos válidos; ${notVoted}. ${o.url}`
}